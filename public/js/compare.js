/* ============================================================
   String Comparison — sortable / filterable table of every string
   ============================================================ */
(function () {
  "use strict";
  const { esc, matLabel, matHex, priceStr } = window.TL;

  let ROWS = [];         // full dataset
  let AXES = [];         // [{k,nm}]
  let matFilter = "all";
  let query = "";
  let sortKey = "brand"; // brand|name|material|price|tier|<axis k>
  let sortDir = 1;       // 1 asc, -1 desc

  const TIER_ORDER = { $: 1, $$: 2, $$$: 3, $$$$: 4 };

  function colValue(r, key) {
    if (key === "brand") return r.brand.toLowerCase() + " " + r.name.toLowerCase();
    if (key === "name") return r.name.toLowerCase();
    if (key === "material") return matLabel(r.material).toLowerCase();
    if (key === "geo") return r.geo;
    if (key === "price") return r.price_usd == null ? -1 : r.price_usd;
    if (key === "tier") return TIER_ORDER[r.tier] || 0;
    return r.scores[key]; // axis
  }

  function sortRows(rows) {
    return rows.slice().sort((a, b) => {
      const va = colValue(a, sortKey), vb = colValue(b, sortKey);
      let c;
      if (typeof va === "number" && typeof vb === "number") c = va - vb;
      else c = String(va).localeCompare(String(vb));
      if (c === 0) c = (a.brand + a.name).localeCompare(b.brand + b.name); // stable brand fallback
      return c * sortDir;
    });
  }

  function visibleRows() {
    let rows = ROWS;
    if (matFilter !== "all") rows = rows.filter((r) => r.material === matFilter);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        (r.brand + " " + r.name + " " + matLabel(r.material)).toLowerCase().includes(q));
    }
    return sortRows(rows);
  }

  function headCell(key, label, numeric) {
    const on = sortKey === key;
    const ar = on ? (sortDir === 1 ? "▲" : "▼") : "";
    return '<th class="' + (numeric ? "num" : "") + '" data-key="' + key + '">' +
      esc(label) + (ar ? ' <span class="ar">' + ar + "</span>" : "") + "</th>";
  }

  function renderHead() {
    let h = headCell("brand", "Brand") + headCell("name", "String") +
      headCell("material", "Material") + headCell("price", "Price", true) +
      headCell("tier", "Tier", true);
    AXES.forEach((a) => (h += headCell(a.k, a.nm, true)));
    document.getElementById("cmpHead").innerHTML = h;
    document.querySelectorAll("#cmpHead th").forEach((th) =>
      th.addEventListener("click", () => {
        const k = th.getAttribute("data-key");
        if (sortKey === k) sortDir = -sortDir;
        else { sortKey = k; sortDir = (k === "brand" || k === "name" || k === "material") ? 1 : -1; }
        render();
      }));
  }

  function scoreCell(v) {
    return '<td class="num scoreCell">' + v +
      '<span class="sbar" style="width:' + Math.max(2, v) + '%"></span></td>';
  }

  function render() {
    renderHead();
    const rows = visibleRows();
    let prevBrand = null, html = "";
    for (const r of rows) {
      const first = r.brand !== prevBrand; prevBrand = r.brand;
      html += '<tr class="' + (first ? "grp-first" : "") + '">' +
        '<td class="brand">' + esc(r.brand) + "</td>" +
        '<td class="name">' + esc(r.name) + "</td>" +
        '<td><span class="matpill" style="background:' + matHex(r.material) + '">' + esc(matLabel(r.material)) + "</span></td>" +
        '<td class="num price">' + priceStr(r.price_usd) + "</td>" +
        '<td class="num">' + esc(r.tier || "—") + "</td>";
      AXES.forEach((a) => (html += scoreCell(r.scores[a.k])));
      html += "</tr>";
    }
    document.getElementById("cmpBody").innerHTML =
      html || '<tr><td colspan="12" class="empty-note" style="border:0">No strings match.</td></tr>';
    document.getElementById("cmpCount").textContent =
      rows.length + " of " + ROWS.length + " strings";
  }

  function renderChips() {
    const mats = ["all", ...Array.from(new Set(ROWS.map((r) => r.material)))];
    document.getElementById("matChips").innerHTML = mats.map((m) =>
      '<button class="cmp-chip' + (m === matFilter ? " on" : "") + '" data-mat="' + m + '">' +
      (m === "all" ? "All materials" : esc(matLabel(m))) + "</button>").join("");
    document.querySelectorAll("#matChips .cmp-chip").forEach((c) =>
      c.addEventListener("click", () => { matFilter = c.getAttribute("data-mat"); renderChips(); render(); }));
  }

  async function boot() {
    try {
      const d = await window.TL.api("/api/compare");
      ROWS = d.strings; AXES = d.axes;
    } catch (e) {
      document.getElementById("cmpBody").innerHTML =
        '<tr><td class="empty-note" style="border:0">Could not load strings. Is the server running?</td></tr>';
      return;
    }
    renderChips();
    render();
    document.getElementById("cmpSearch").addEventListener("input", (e) => {
      query = e.target.value.trim(); render();
    });
  }
  boot();
})();
