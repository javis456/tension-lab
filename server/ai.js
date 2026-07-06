/* ============================================================
   AI PRODUCT INGESTION — multi-provider (Anthropic + DeepSeek)
   ------------------------------------------------------------
   Admin types a brand + product name, picks a model, and hits
   "AI Update". We hand the model the official rubric and ask for a
   strict JSON object that drops straight into the same schema every
   product uses. The admin previews it, then saves.

   Providers:
   - Anthropic (Claude): does LIVE web search for current specs.
   - DeepSeek: OpenAI-compatible, much cheaper, but no web search —
     it answers from its training knowledge (great for established
     products, less reliable for brand-new releases).

   No key for the chosen provider? We fall back to a transparent
   heuristic estimate so the workflow still works (clearly flagged).
   ============================================================ */
const { AXES, MATERIALS, GEOMETRIES, TIERS, STRING_SCHEMA, RACKET_SCHEMA } = require("./rubric");

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";

// Registry of selectable models. web=true means the provider can search the internet.
const MODELS = {
  "claude-haiku-4-5":  { label: "Claude Haiku · Anthropic (live web search)", provider: "anthropic", web: true },
  "deepseek-v4-flash": { label: "DeepSeek V4 Flash · cheapest (from knowledge)", provider: "deepseek", web: false },
  "deepseek-v4-pro":   { label: "DeepSeek V4 Pro · higher quality (from knowledge)", provider: "deepseek", web: false },
};
const keyFor = (p) => (p === "anthropic" ? ANTHROPIC_KEY : p === "deepseek" ? DEEPSEEK_KEY : "");

function defaultModel() {
  const envM = process.env.AI_MODEL;
  if (envM && MODELS[envM] && keyFor(MODELS[envM].provider)) return envM;
  if (ANTHROPIC_KEY) return "claude-haiku-4-5";
  if (DEEPSEEK_KEY) return "deepseek-v4-flash";
  return "offline";
}

// What the admin dropdown shows: every model, flagged ready/not, plus offline.
function availableModels() {
  const list = Object.entries(MODELS).map(([id, m]) => ({
    id, label: m.label, provider: m.provider, web: m.web, ready: !!keyFor(m.provider),
  }));
  list.push({ id: "offline", label: "Offline estimate · no API", provider: "offline", web: false, ready: true });
  return { models: list, default: defaultModel() };
}

/* ---------------- prompts ---------------- */
function rubricText() {
  return "Rate on these 0-100 axes, using the anchors literally:\n" +
    Object.entries(AXES).map(([k, v]) => `  - ${k} (${v.name}): ${v.encodes} Anchor: ${v.anchor}`).join("\n");
}
const sourceLine = (web) => web
  ? "Search the web for its real specifications and reviews (manufacturer page, Tennis Warehouse / TWU)."
  : "Use your knowledge of this product's real specifications and how it is reviewed and marketed.";

function stringPrompt(brand, name, web) {
  return `You are cataloguing a real tennis string for a stringing database.
Product: "${brand} ${name}". ${sourceLine(web)}

${rubricText()}

Return ONLY a JSON object (no prose, no markdown fences) with exactly these keys:
${JSON.stringify(STRING_SCHEMA, null, 2)}

Rules:
- material must be one of: ${MATERIALS.join(", ")}.
- geo must be one of: ${GEOMETRIES.join(", ")}.
- tier must be one of: ${TIERS.join(", ")} ($ = budget, $$ = mid, $$$ = premium).
- gauges: real diameters sold, in mm, thickest first.
- ratings: all seven axes, integers 0-100, consistent with the anchors and how it plays.
- If you cannot verify the product, still return your best evidence-based estimate with reasonable values.`;
}
function racketPrompt(brand, name, web) {
  return `You are cataloguing a real tennis racket for a database.
Product: "${brand} ${name}". ${sourceLine(web)}

Return ONLY a JSON object (no prose, no markdown fences) with exactly these keys:
${JSON.stringify(RACKET_SCHEMA, null, 2)}

Rules:
- mains/crosses: the string pattern counts (e.g. 16 and 19).
- head_size in square inches; ra is unstrung stiffness (typically 55-72); weight in grams unstrung.
- year: model year as a number, or null if unknown.
- If unsure, give the best evidence-based estimate for that model line.`;
}

/* ---------------- provider calls ---------------- */
async function callClaude(prompt, model) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model, max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

async function callDeepSeek(prompt, model) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + DEEPSEEK_KEY },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a precise tennis-equipment cataloguer. Reply with ONLY a JSON object - no prose, no markdown." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1400,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
}

function extractJSON(text) {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("No JSON found in model output.");
  return JSON.parse(text.slice(a, b + 1));
}

/* ---- normalisation / validation so bad output can't corrupt the DB ---- */
const clampInt = (v, lo, hi, d) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
};
function normalizeString(o) {
  const r = o.ratings || {};
  const ratings = {};
  for (const k of ["pw", "co", "sp", "cf", "fe", "du", "tm"]) ratings[k] = clampInt(r[k], 0, 100, 55);
  let gauges = Array.isArray(o.gauges) ? o.gauges.map(Number).filter((x) => x > 0.6 && x < 2) : [];
  if (!gauges.length) gauges = [1.25];
  gauges = [...new Set(gauges)].sort((a, b) => b - a);
  return {
    brand: String(o.brand || "").trim(), name: String(o.name || "").trim(),
    material: MATERIALS.includes(o.material) ? o.material : "poly",
    geo: GEOMETRIES.includes(o.geo) ? o.geo : "round",
    gauges, tier: TIERS.includes(o.tier) ? o.tier : "$$",
    price_usd: clampInt(o.price_usd, 3, 80, 15),
    known_for: String(o.known_for || "").trim().slice(0, 240),
    claim: String(o.claim || "").trim().slice(0, 240),
    ratings,
  };
}
function normalizeRacket(o) {
  return {
    brand: String(o.brand || "").trim(), name: String(o.name || "").trim(),
    ver: String(o.ver || "").trim().slice(0, 40),
    year: Number.isFinite(Number(o.year)) ? Math.round(Number(o.year)) : null,
    mains: clampInt(o.mains, 12, 20, 16), crosses: clampInt(o.crosses, 12, 26, 19),
    head_size: clampInt(o.head_size, 85, 125, 100), ra: clampInt(o.ra, 45, 78, 65),
    weight: clampInt(o.weight, 240, 380, 300),
    char: String(o.char || "").trim().slice(0, 40),
    known_for: String(o.known_for || "").trim().slice(0, 240),
  };
}

/* ---- offline heuristic (used when the chosen provider has no key) ---- */
function guessMaterial(name) {
  const n = name.toLowerCase();
  if (/gut/.test(n)) return "gut";
  if (/multi|nxt|xcel|x-?one|biphase|sensation|touch/.test(n)) return "multi";
  if (/kevlar|aramid/.test(n)) return "kevlar";
  if (/spin|hex|edge|snake|twist|octag|penta|square|rough|bite/.test(n)) return "polyspin";
  if (/soft|comfort/.test(n)) return "polysoft";
  return "poly";
}
function heuristicString(brand, name) {
  const m = guessMaterial(name);
  const base = {
    gut: { pw: 88, co: 60, sp: 60, cf: 92, fe: 90, du: 55, tm: 78 },
    multi: { pw: 80, co: 62, sp: 60, cf: 84, fe: 82, du: 62, tm: 66 },
    poly: { pw: 52, co: 84, sp: 76, cf: 46, fe: 64, du: 82, tm: 60 },
    polyspin: { pw: 54, co: 82, sp: 88, cf: 48, fe: 64, du: 78, tm: 58 },
    polysoft: { pw: 60, co: 78, sp: 74, cf: 66, fe: 72, du: 78, tm: 60 },
    kevlar: { pw: 44, co: 86, sp: 66, cf: 32, fe: 55, du: 96, tm: 74 },
    zyex: { pw: 70, co: 74, sp: 60, cf: 86, fe: 80, du: 82, tm: 78 },
    syn: { pw: 66, co: 66, sp: 58, cf: 68, fe: 66, du: 66, tm: 52 },
  }[m];
  return normalizeString({
    brand, name, material: m, geo: m === "polyspin" ? "shaped" : "round",
    gauges: [1.30, 1.25, 1.20], tier: m === "gut" ? "$$$" : "$$",
    price_usd: m === "gut" ? 40 : 14,
    known_for: `Estimated profile for a ${m} string (offline mode - verify before saving).`,
    claim: "", ratings: base,
  });
}
function offlineResult(type, brand, name, note) {
  const data = type === "racket"
    ? normalizeRacket({ brand, name, mains: 16, crosses: 19, head_size: 100, ra: 66, weight: 300, char: "all-round", known_for: "Offline estimate - verify before saving." })
    : heuristicString(brand, name);
  return { source: "offline", note, data };
}

/* ---- main entry ---- */
async function lookup(type, brand, name, modelId) {
  if (!brand || !name) throw new Error("Brand and product name are required.");
  const chosen = MODELS[modelId] ? modelId : defaultModel();
  const meta = MODELS[chosen];

  if (!meta || chosen === "offline") {
    return offlineResult(type, brand, name, "No AI model selected/available - returning an estimate. Add an API key and pick a model for real data.");
  }
  if (!keyFor(meta.provider)) {
    const envName = meta.provider === "anthropic" ? "ANTHROPIC_API_KEY" : "DEEPSEEK_API_KEY";
    return offlineResult(type, brand, name, `No ${envName} set - returning an estimate. Add that key to use ${meta.label}.`);
  }

  const prompt = type === "racket" ? racketPrompt(brand, name, meta.web) : stringPrompt(brand, name, meta.web);
  const text = meta.provider === "anthropic" ? await callClaude(prompt, chosen) : await callDeepSeek(prompt, chosen);
  const raw = extractJSON(text);
  const data = type === "racket" ? normalizeRacket(raw) : normalizeString(raw);
  if (!data.brand) data.brand = brand;
  if (!data.name) data.name = name;
  return { source: "ai", model: chosen, modelLabel: meta.label, web: meta.web, data };
}

module.exports = { lookup, normalizeString, normalizeRacket, availableModels, defaultModel };
