/* Public shared-feedback view */
(function () {
  "use strict";
  const { esc, api } = window.TL;
  const id = new URLSearchParams(location.search).get("id");
  const box = document.getElementById("shareContent");

  async function boot() {
    if (!id) { box.innerHTML = '<div class="empty-note">No feedback id in the link.</div>'; return; }
    let d;
    try { d = await api("/api/share/" + encodeURIComponent(id)); }
    catch (e) { box.innerHTML = '<div class="empty-note">' + esc(e.message || "This shared feedback was not found.") + "</div>"; return; }
    const f = d.feedback, axes = d.axes;
    const rows = axes.map((a) => {
      const av = (f.algo_scores || {})[a.k], pv = (f.player_scores || {})[a.k];
      const diff = (pv != null && av != null) ? pv - av : 0;
      const sign = diff > 0 ? "+" + diff : String(diff);
      return '<tr><td>' + esc(a.nm) + '</td><td class="num">' + (av != null ? av : "—") +
        '</td><td class="num">' + (pv != null ? pv : "—") + '</td><td class="num" style="color:' +
        (diff > 0 ? "var(--teal)" : diff < 0 ? "var(--signal)" : "var(--ink-faint)") + '">' + (diff === 0 ? "–" : sign) + "</td></tr>";
    }).join("");
    box.innerHTML =
      '<div class="page-head"><h1>' + esc(f.racket_label || "A setup") + "</h1>" +
        '<p>' + esc(f.combo_label || "") + (f.overall != null ? " · overall " + f.overall + "/100" : "") +
        ' · a player\u2019s real-world feedback vs the Tension Lab prediction.</p></div>' +
      '<div class="panel"><div class="panel-b" style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;justify-content:center">' +
        '<div class="fb-chart">' + window.TLChart.radar(f.algo_scores, f.player_scores, axes) + window.TLChart.legend() + "</div>" +
        '<div style="flex:1;min-width:240px"><table class="cmp" style="min-width:0"><thead><tr><th>Factor</th>' +
          '<th class="num">Algorithm</th><th class="num">Player</th><th class="num">Δ</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      "</div></div>" +
      (f.notes ? '<div class="fb-notes" style="margin-top:16px"><span class="lbl">Player\u2019s note</span>' + esc(f.notes) + "</div>" : "");
  }
  boot();
})();
