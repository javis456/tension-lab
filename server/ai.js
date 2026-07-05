/* ============================================================
   AI PRODUCT INGESTION
   ------------------------------------------------------------
   Admin types a brand + product name and hits "AI Update". This
   calls Claude (cheapest model, claude-haiku-4-5) with the web
   search tool enabled, hands it the official rubric, and asks for
   a strict JSON object that drops straight into the same schema
   every existing product uses. The admin previews it, then saves.

   Cost control: Haiku ($1/$5 per M tokens), max 4 searches, ~1.2k
   output tokens → a typical lookup is a fraction of a cent. It's
   an admin-only action, never triggered by end users.

   No API key configured? We fall back to a transparent heuristic
   estimate so the workflow still works offline (clearly flagged).
   ============================================================ */
const { AXES, MATERIALS, GEOMETRIES, TIERS, STRING_SCHEMA, RACKET_SCHEMA } = require("./rubric");

const MODEL = process.env.AI_MODEL || "claude-haiku-4-5";
const KEY = process.env.ANTHROPIC_API_KEY || "";

function rubricText() {
  const axes = Object.entries(AXES)
    .map(([k, v]) => `  - ${k} (${v.name}): ${v.encodes} Anchor: ${v.anchor}`)
    .join("\n");
  return `Rate on these 0–100 axes, using the anchors literally:\n${axes}`;
}

function stringPrompt(brand, name) {
  return `You are cataloguing a real tennis string for a stringing database.
Product: "${brand} ${name}". Search the web for its real specifications and reviews
(manufacturer page, Tennis Warehouse / TWU, string reviews).

${rubricText()}

Return ONLY a JSON object (no prose, no markdown fences) with exactly these keys:
${JSON.stringify(STRING_SCHEMA, null, 2)}

Rules:
- material must be one of: ${MATERIALS.join(", ")}.
- geo must be one of: ${GEOMETRIES.join(", ")}.
- tier must be one of: ${TIERS.join(", ")} ($ = budget, $$ = mid, $$$ = premium).
- gauges: real diameters sold, in mm, thickest first.
- ratings: all seven axes, integers 0–100, consistent with the anchors above and with how the string actually plays.
- If you cannot verify the product, still return your best evidence-based estimate and keep values reasonable.`;
}

function racketPrompt(brand, name) {
  return `You are cataloguing a real tennis racket for a database.
Product: "${brand} ${name}". Search the web for its real published specs
(manufacturer page, Tennis Warehouse specs).

Return ONLY a JSON object (no prose, no markdown fences) with exactly these keys:
${JSON.stringify(RACKET_SCHEMA, null, 2)}

Rules:
- mains/crosses: the string pattern counts (e.g. 16 and 19).
- head_size in square inches; ra is unstrung stiffness (typically 55–72); weight in grams unstrung.
- year: model year as a number, or null if unknown.
- If unsure, give the best evidence-based estimate for that model line.`;
}

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude API ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return text;
}

function extractJSON(text) {
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
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
    brand: String(o.brand || "").trim(),
    name: String(o.name || "").trim(),
    material: MATERIALS.includes(o.material) ? o.material : "poly",
    geo: GEOMETRIES.includes(o.geo) ? o.geo : "round",
    gauges,
    tier: TIERS.includes(o.tier) ? o.tier : "$$",
    price_usd: clampInt(o.price_usd, 3, 80, 15),
    known_for: String(o.known_for || "").trim().slice(0, 240),
    claim: String(o.claim || "").trim().slice(0, 240),
    ratings,
  };
}

function normalizeRacket(o) {
  return {
    brand: String(o.brand || "").trim(),
    name: String(o.name || "").trim(),
    ver: String(o.ver || "").trim().slice(0, 40),
    year: Number.isFinite(Number(o.year)) ? Math.round(Number(o.year)) : null,
    mains: clampInt(o.mains, 12, 20, 16),
    crosses: clampInt(o.crosses, 12, 26, 19),
    head_size: clampInt(o.head_size, 85, 125, 100),
    ra: clampInt(o.ra, 45, 78, 65),
    weight: clampInt(o.weight, 240, 380, 300),
    char: String(o.char || "").trim().slice(0, 40),
    known_for: String(o.known_for || "").trim().slice(0, 240),
  };
}

/* ---- offline heuristic (used only when no API key is set) ---- */
function guessMaterial(name) {
  const n = name.toLowerCase();
  if (/gut/.test(n)) return "gut";
  if (/multi|nxt|xcel|x-?one|biphase|sensation|touch/.test(n)) return "multi";
  if (/kevlar|aramid/.test(n)) return "kevlar";
  if (/spin|hex|edge|snake|twist|octag|penta|square|rough|bite/.test(n)) return "polyspin";
  if (/soft|comfort|touch/.test(n)) return "polysoft";
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
    known_for: `Estimated profile for a ${m} string (offline mode — verify before saving).`,
    claim: "", ratings: base,
  });
}

async function lookup(type, brand, name) {
  if (!brand || !name) throw new Error("Brand and product name are required.");
  if (!KEY) {
    if (type === "racket") {
      return { source: "offline", note: "No ANTHROPIC_API_KEY set — returning a neutral estimate. Add a key for real web-sourced specs.", data: normalizeRacket({ brand, name, mains: 16, crosses: 19, head_size: 100, ra: 66, weight: 300, char: "all-round", known_for: "Offline estimate — verify before saving." }) };
    }
    return { source: "offline", note: "No ANTHROPIC_API_KEY set — returning a heuristic estimate. Add a key for real web-sourced ratings.", data: heuristicString(brand, name) };
  }
  const prompt = type === "racket" ? racketPrompt(brand, name) : stringPrompt(brand, name);
  const text = await callClaude(prompt);
  const raw = extractJSON(text);
  const data = type === "racket" ? normalizeRacket(raw) : normalizeString(raw);
  if (!data.brand) data.brand = brand;
  if (!data.name) data.name = name;
  return { source: "ai", model: MODEL, data };
}

module.exports = { lookup, normalizeString, normalizeRacket };
