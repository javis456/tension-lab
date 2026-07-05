/* ============================================================
   TENSION LAB — SCORING ENGINE  (shared: Node + browser)
   ------------------------------------------------------------
   Single source of truth for how a string + racket setup is
   scored. The same file runs on the server (require) and in the
   browser (window.TLEngine), so results never drift between the
   live configurator, the comparison page, and stored setups.

   The model is calibrated to the kind of lab data published by
   Tennis Warehouse University (stringbed stiffness, spin
   potential, energy return, tension loss) plus well-established
   stringing rules of thumb. Every axis below names the real
   quantity it stands in for. See server/rubric.js for the full
   parameter definitions the AI ingestion uses.
   ============================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TLEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const round = (v) => Math.round(v);

  // The seven axes every setup is scored on (0–100).
  const ATTRS = [
    { k: "pw", nm: "Power" },        // energy return of the stringbed
    { k: "co", nm: "Control" },      // predictability / directional precision
    { k: "sp", nm: "Spin" },         // snap-back + bite (spin potential)
    { k: "cf", nm: "Comfort" },      // impact softness / arm friendliness
    { k: "fe", nm: "Feel & touch" }, // connection to the ball at net & on touch
    { k: "du", nm: "Durability" },   // resistance to notching / breakage
    { k: "tm", nm: "Tension hold" }, // % tension retained over time
  ];

  /* ---- physical modifiers (reference points from real data) ---- */

  // String shape. Shaped/twisted profiles bite the ball for more spin
  // but feel a touch harsher and lose tension faster (sharp edges).
  function geoMod(geo) {
    if (geo === "shaped") return { sp: +7, cf: -3, tm: -4, fe: -1 };
    if (geo === "textured") return { sp: +4, cf: -1, tm: -2 };
    return { sp: -2, cf: +2, co: +1 }; // round
  }

  // Gauge in mm. Reference 1.25 mm (16L). Thinner string = more spin,
  // feel and power, but less durability (TWU spin & durability trend).
  function gaugeMod(g) {
    const d = (1.25 - g) / 0.05; // +1 per 0.05 mm thinner than 1.25
    return { sp: d * 3, fe: d * 3, pw: d * 2, du: -d * 4.5, co: -d * 1.5 };
  }

  // Reference tension 52 lb. Looser = more power/comfort, less control
  // (classic tension trade-off); extreme tensions cost a little hold.
  function tensionMod(t) {
    const d = 52 - t;
    return { pw: d * 1.35, cf: d * 1.05, sp: d * 0.45, co: -d * 1.35, tm: -Math.abs(d) * 0.15 };
  }

  // String pattern. 16×19 is the baseline; denser (18×20) adds control
  // and durability, opens (fewer crosses) add spin and power.
  function patternMod(mains, crosses) {
    const density = mains * crosses;      // ~304 for 16×19, 360 for 18×20
    const d = (density - 304) / 56;       // ~1.0 at 18×20
    return { sp: -d * 8, co: +d * 8, du: +d * 6, pw: -d * 5, cf: -d * 2 };
  }

  // Frame stiffness (RA). Reference 64. A stiffer frame returns a bit
  // more pace but transmits more shock (less comfort).
  function stiffnessMod(ra) {
    const d = (ra - 64) / 6;
    return { cf: -d * 6, pw: +d * 2, co: +d * 1 };
  }

  function addMods(base, ...mods) {
    const out = Object.assign({}, base);
    for (const m of mods) for (const k in m) out[k] = (out[k] || 0) + m[k];
    return out;
  }

  const SOFT = (m) => m === "gut" || m === "multi" || m === "zyex";
  const POLY = (m) => m === "poly" || m === "polyspin" || m === "polysoft" || m === "kevlar";

  // One string's contribution given its own gauge + tension.
  // `s` = { ratings:{pw,co,sp,cf,fe,du,tm}, material, geo }
  function computeString(s, gauge, tension) {
    return addMods(Object.assign({}, s.ratings), geoMod(s.geo), gaugeMod(gauge), tensionMod(tension));
  }

  /* ---- the setup score ----
     main / cross = { ratings, material, geo, gauge, tension }
     racket       = { mains, crosses, head_size, ra }
     hybrid       = boolean (when false, cross is ignored)          */
  function scoreSetup(main, cross, racket, hybrid) {
    const mMain = computeString(main, main.gauge, main.tension);
    const useCross = hybrid ? cross : main;
    const cg = hybrid ? cross.gauge : main.gauge;
    const ct = hybrid ? cross.tension : main.tension;
    const mCross = computeString(useCross, cg, ct);

    // Mains carry ~70% of the stringbed's character; comfort leans on crosses.
    const w = { pw: 0.70, co: 0.68, sp: 0.72, cf: 0.52, fe: 0.68, du: 0.60, tm: 0.62 };
    const blend = {};
    for (const { k } of ATTRS) {
      if (k === "du") {
        // durability is gated by the weaker string — mains notch first
        blend[k] = Math.min(0.68 * mMain[k] + 0.32 * mCross[k], mMain[k] + 8);
      } else {
        blend[k] = w[k] * mMain[k] + (1 - w[k]) * mCross[k];
      }
    }

    // Hybrid synergy: soft (gut/multi) + poly = real "best of both" nudge.
    let synergy = false;
    if (hybrid && ((SOFT(main.material) && POLY(cross.material)) || (POLY(main.material) && SOFT(cross.material)))) {
      synergy = true;
      blend.cf += 6; blend.pw += 3; blend.co += 3; blend.fe += 3; blend.tm += 2;
    }

    let out = addMods(blend, patternMod(racket.mains, racket.crosses), stiffnessMod(racket.ra));

    // Head size: bigger head = more power, less control/feel. Reference 98 in².
    const hd = (racket.head_size - 98) / 2;
    out.pw += hd * 1.6; out.co -= hd * 1.2; out.fe -= hd * 0.8;

    const scores = {};
    for (const { k } of ATTRS) scores[k] = round(clamp(out[k]));
    return { scores, synergy };
  }

  // Plain-language headline for a score vector.
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

  // A neutral "reference frame" so a string can be compared on its own
  // (used by the comparison page): 16×19, RA 64, 98 in², full bed @ 52 lb,
  // middle gauge. This isolates the string's intrinsic character.
  const REF_RACKET = { mains: 16, crosses: 19, head_size: 98, ra: 64 };
  function scoreStringSolo(str) {
    const mid = str.gauges[Math.floor(str.gauges.length / 2)] || 1.25;
    const main = { ratings: str.ratings, material: str.material, geo: str.geo, gauge: mid, tension: 52 };
    return scoreSetup(main, main, REF_RACKET, false).scores;
  }

  return {
    ATTRS, clamp, round,
    geoMod, gaugeMod, tensionMod, patternMod, stiffnessMod,
    computeString, scoreSetup, archetype, scoreStringSolo, REF_RACKET,
    SOFT, POLY,
  };
});
