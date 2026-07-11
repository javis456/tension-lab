/* ============================================================
   Shared combination helpers — used by the Explore route AND the
   admin bulk importer so archetype/tags/scoring never drift.
   ============================================================ */
const engine = require("../public/js/engine");
const { one, mapString, mapRacket } = require("./db");

function archetype(s) {
  const { co, pw, sp, cf } = s;
  if (co >= 78 && sp >= 78) return { h: "Heavy-spin control", tag: ["control", "spin"] };
  if (co >= 80) return { h: "Precision control", tag: ["control"] };
  if (pw >= 78 && cf >= 72) return { h: "Comfort power", tag: ["power", "comfort"] };
  if (sp >= 82) return { h: "Spin-first", tag: ["spin"] };
  if (pw >= 76) return { h: "Power setup", tag: ["power"] };
  if (cf >= 78) return { h: "Comfort-first", tag: ["comfort"] };
  return { h: "Balanced all-court", tag: ["all-round"] };
}

const ALL_TAGS = ["control", "spin", "power", "comfort", "all-round", "hybrid", "poly", "soft", "arm-friendly", "durable"];

function computeTags(scores, config, mat) {
  const t = new Set(archetype(scores).tag);
  if (config.hybrid) t.add("hybrid");
  if (mat) { if (String(mat).includes("poly")) t.add("poly"); else if (["gut", "multi", "zyex"].includes(mat)) t.add("soft"); }
  if (scores.sp >= 75) t.add("spin");
  if (scores.cf >= 70) t.add("arm-friendly");
  if (scores.pw >= 72) t.add("power");
  if (scores.co >= 78) t.add("control");
  if (scores.du >= 78) t.add("durable");
  return [...t];
}

/* Given DB ids + gauges/tensions, compute engine scores (mirrors POST /api/score). */
async function scoreFromConfig(cfg) {
  const racketRow = await one("SELECT * FROM rackets WHERE id=$1", [cfg.racketId]);
  const mainRow = await one("SELECT * FROM strings WHERE id=$1", [cfg.mainId]);
  if (!racketRow || !mainRow) return null;
  const R = mapRacket(racketRow), M = mapString(mainRow);
  const hybrid = !!cfg.hybrid;
  const crossRow = hybrid && cfg.crossId ? await one("SELECT * FROM strings WHERE id=$1", [cfg.crossId]) : mainRow;
  const C = mapString(crossRow || mainRow);
  const main = { ratings: M.ratings, material: M.material, geo: M.geo, gauge: +cfg.mainGauge || M.gauges[0], tension: +cfg.mainTension || 52 };
  const cross = { ratings: C.ratings, material: C.material, geo: C.geo, gauge: +cfg.crossGauge || C.gauges[0], tension: +cfg.crossTension || main.tension };
  const { scores } = engine.scoreSetup(main, cross, R, hybrid);
  return { scores, mainMaterial: M.material };
}

module.exports = { archetype, computeTags, ALL_TAGS, scoreFromConfig };
