/* ============================================================
   TENSION LAB — RATING RUBRIC
   ------------------------------------------------------------
   The official parameter set. Every string in the database is
   rated on the same 0–100 scale against these real-world anchors,
   so a product added today lands on the same axis as one added a
   year ago. The AI ingestion (server/ai.js) is handed this rubric
   verbatim and told to map published specs onto it.

   Primary reference for measured string behaviour: Tennis
   Warehouse University (TWU) — stringbed stiffness, spin
   potential, energy return, and tension-loss testing. These are
   the closest thing the sport has to a standard lab. Ratings are
   normalized estimates calibrated to that style of data; they are
   not an official ITF/USTA standard (no such string rating exists).
   ============================================================ */

// Materials the engine understands (drives colour + synergy grouping).
const MATERIALS = ["gut", "multi", "syn", "poly", "polyspin", "polysoft", "zyex", "kevlar"];
// String cross-section shapes.
const GEOMETRIES = ["round", "shaped", "textured"];

// Each axis: what real quantity it encodes and how to anchor the 0–100 value.
const AXES = {
  pw: {
    name: "Power",
    encodes: "Energy return of the stringbed (rebound efficiency).",
    anchor: "Lively multifilaments/gut ≈ 75–90; stiff control polys ≈ 40–55. TWU energy-return % is the reference signal.",
  },
  co: {
    name: "Control",
    encodes: "Directional precision / low, predictable launch angle.",
    anchor: "Firm shaped polys ≈ 82–92; soft lively multis ≈ 55–68.",
  },
  sp: {
    name: "Spin",
    encodes: "Snap-back and bite (spin potential).",
    anchor: "Slick shaped/twisted polys ≈ 85–95; sticky multis/gut ≈ 55–65. TWU spin-potential ranking is the reference.",
  },
  cf: {
    name: "Comfort",
    encodes: "Impact softness / arm-friendliness (inverse of stiffness).",
    anchor: "Natural gut ≈ 90+; stiff/co-poly and Kevlar ≈ 30–45.",
  },
  fe: {
    name: "Feel & touch",
    encodes: "Ball connection on volleys, drops and touch shots.",
    anchor: "Gut/premium multi ≈ 82–92; boardy stiff polys ≈ 55–65.",
  },
  du: {
    name: "Durability",
    encodes: "Resistance to notching and breakage.",
    anchor: "Kevlar/thick poly ≈ 88–98; thin gut/multi ≈ 45–60.",
  },
  tm: {
    name: "Tension hold",
    encodes: "Percentage of reference tension retained over time.",
    anchor: "Best polys & gut ≈ 70–85; cheap/soft polys ≈ 45–58. TWU tension-loss testing is the reference.",
  },
};

// Reference points baked into the engine (kept here for documentation).
const REFERENCES = {
  gauge_mm: 1.25,      // 16L — neutral gauge
  tension_lb: 52,      // neutral reference tension
  pattern: "16x19",    // neutral string pattern
  frame_ra: 64,        // neutral frame stiffness
  head_size_in2: 98,   // neutral head size
};

const TIERS = ["$", "$$", "$$$"];

// Field spec the AI must return for a STRING (used to build the prompt + validate).
const STRING_SCHEMA = {
  brand: "string",
  name: "string",
  material: `one of ${MATERIALS.join("/")}`,
  geo: `one of ${GEOMETRIES.join("/")}`,
  gauges: "array of gauge diameters in mm, e.g. [1.30,1.25,1.20]",
  tier: `one of ${TIERS.join("/")} (price bracket)`,
  price_usd: "typical street price per set in USD (number)",
  known_for: "one plain sentence: what this string is known for",
  claim: "one sentence paraphrasing the maker's marketing claim",
  ratings: "object with pw,co,sp,cf,fe,du,tm each 0–100, per the axis anchors",
};

// Field spec the AI must return for a RACKET.
const RACKET_SCHEMA = {
  brand: "string",
  name: "string",
  ver: "version/tech label if any, e.g. 'v9' or 'Auxetic 2.0' (may be empty)",
  year: "model year (number) or null",
  mains: "number of main strings (e.g. 16)",
  crosses: "number of cross strings (e.g. 19)",
  head_size: "head size in square inches (number)",
  ra: "unstrung frame stiffness (RA), typically 55–72",
  weight: "unstrung weight in grams (number)",
  char: "2–4 word character label, e.g. 'flexible control'",
  known_for: "one plain sentence about the frame",
};

module.exports = { MATERIALS, GEOMETRIES, AXES, REFERENCES, TIERS, STRING_SCHEMA, RACKET_SCHEMA };
