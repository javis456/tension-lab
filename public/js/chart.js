/* ============================================================
   TLChart — a small SVG radar that overlays two score sets
   (algorithm baseline vs the player's own feedback).
   Used in the Racket Room and on shared feedback pages.
   ============================================================ */
(function () {
  "use strict";
  const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));

  function radar(algo, player, axes) {
    const N = axes.length, cx = 160, cy = 150, R = 104;
    const ang = (i) => (-Math.PI / 2) + (i * 2 * Math.PI / N);
    const pt = (i, r) => [ (cx + r * Math.cos(ang(i))).toFixed(1), (cy + r * Math.sin(ang(i))).toFixed(1) ];

    let rings = "";
    for (let g = 1; g <= 4; g++) {
      const rr = R * g / 4;
      const p = axes.map((_, i) => pt(i, rr).join(",")).join(" ");
      rings += `<polygon points="${p}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
    }
    let spokes = "", labels = "";
    axes.forEach((a, i) => {
      const [x, y] = pt(i, R);
      spokes += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`;
      const [lx, ly] = pt(i, R + 18);
      const anchor = Math.abs(lx - cx) < 8 ? "middle" : (lx > cx ? "start" : "end");
      labels += `<text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="middle"
        font-family="IBM Plex Mono, monospace" font-size="10" fill="var(--ink-soft)">${a.nm}</text>`;
    });
    const polyPts = (sc) => axes.map((a, i) => pt(i, R * clamp(sc[a.k]) / 100).join(",")).join(" ");
    const algoPoly = `<polygon points="${polyPts(algo)}" fill="var(--teal)" fill-opacity="0.16" stroke="var(--teal)" stroke-width="2"/>`;
    const playerPoly = `<polygon points="${polyPts(player)}" fill="var(--signal)" fill-opacity="0.12" stroke="var(--signal)" stroke-width="2" stroke-dasharray="4 3"/>`;

    return `<svg viewBox="0 0 320 300" width="100%" style="max-width:340px" xmlns="http://www.w3.org/2000/svg" aria-label="Algorithm vs your feedback">
      ${rings}${spokes}${labels}${algoPoly}${playerPoly}</svg>`;
  }

  function legend() {
    return '<div class="chart-legend">' +
      '<span><i class="sw algo"></i> Algorithm</span>' +
      '<span><i class="sw you"></i> Your feedback</span></div>';
  }

  window.TLChart = { radar, legend };
})();
