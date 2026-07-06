/* ============================================================
   Admin portal — strings & rackets CRUD + AI Update
   ============================================================ */
(function () {
  "use strict";
  const { esc, api, toast, matLabel, matHex, priceStr } = window.TL;
  const $ = (id) => document.getElementById(id);

  const MATERIALS = ["gut", "multi", "syn", "poly", "polyspin", "polysoft", "zyex", "kevlar"];
  const GEOMETRIES = ["round", "shaped", "textured"];
  const TIERS = ["$", "$$", "$$$"];
  const RATING_KEYS = [
    ["pw", "Power"], ["co", "Control"], ["sp", "Spin"], ["cf", "Comfort"],
    ["fe", "Feel"], ["du", "Durability"], ["tm", "Tension hold"],
  ];

  let tab = "strings";
  let cache = { strings: [], rackets: [] };

  /* ---------------- data loading ---------------- */
  async function loadList() {
    const wrap = $("listWrap");
    wrap.innerHTML = '<div class="empty-note" style="border:0">Loading…</div>';
    try {
      if (tab === "strings") {
        const d = await api("/api/strings"); cache.strings = d.strings;
        renderStrings(d.strings);
      } else {
        const d = await api("/api/rackets"); cache.rackets = d.rackets;
        renderRackets(d.rackets.filter((r) => r.brand !== "—"));
      }
    } catch (e) { wrap.innerHTML = '<div class="empty-note">Could not load. Is the server running?</div>'; }
  }

  function rowShell(rows, headHtml) {
    return '<div class="data-list"><div class="dl-h">' + headHtml + "</div>" + rows + "</div>";
  }

  function renderStrings(list) {
    $("listCount").textContent = list.length + " strings";
    const rows = list.map((s) =>
      '<div class="dl-r" data-id="' + s.id + '">' +
        '<div class="b1">' + esc(s.brand) + "</div>" +
        "<div>" + esc(s.name) + "</div>" +
        '<div><span class="matpill" style="background:' + matHex(s.material) + '">' + esc(matLabel(s.material)) + "</span></div>" +
        '<div class="price">' + priceStr(s.price_usd) + "</div>" +
        '<div style="display:flex;gap:6px;justify-content:flex-end">' +
          '<button class="btn ghost sm edit" data-id="' + s.id + '">Edit</button>' +
          '<button class="btn link del" data-id="' + s.id + '">Delete</button>' +
        "</div></div>").join("");
    $("listWrap").innerHTML = rowShell(rows, "<div>Brand</div><div>String</div><div>Material</div><div>Price</div><div></div>");
    wireRowButtons();
  }

  function renderRackets(list) {
    $("listCount").textContent = list.length + " rackets";
    const rows = list.map((r) =>
      '<div class="dl-r" data-id="' + r.id + '">' +
        '<div class="b1">' + esc(r.brand) + "</div>" +
        "<div>" + esc(r.name) + (r.ver ? ' <span style="color:var(--ink-faint)">' + esc(r.ver) + "</span>" : "") + "</div>" +
        "<div>" + esc(r.mains) + "×" + esc(r.crosses) + "</div>" +
        "<div>" + esc(r.head_size) + ' in²</div>' +
        '<div style="display:flex;gap:6px;justify-content:flex-end">' +
          '<button class="btn ghost sm edit" data-id="' + r.id + '">Edit</button>' +
          '<button class="btn link del" data-id="' + r.id + '">Delete</button>' +
        "</div></div>").join("");
    $("listWrap").innerHTML = rowShell(rows, "<div>Brand</div><div>Model</div><div>Pattern</div><div>Head</div><div></div>");
    wireRowButtons();
  }

  function wireRowButtons() {
    document.querySelectorAll("#listWrap .edit").forEach((b) =>
      b.addEventListener("click", () => openEdit(b.getAttribute("data-id"))));
    document.querySelectorAll("#listWrap .del").forEach((b) =>
      b.addEventListener("click", () => del(b.getAttribute("data-id"))));
  }

  async function del(id) {
    if (!confirm("Delete this " + (tab === "strings" ? "string" : "racket") + "?")) return;
    try {
      await api("/api/admin/" + tab + "/" + id, { method: "DELETE" });
      toast("Deleted"); loadList();
    } catch (e) { toast(e.message, true); }
  }

  /* ---------------- forms ---------------- */
  function inp(id, val, attrs) {
    return '<input id="' + id + '" value="' + esc(val == null ? "" : val) + '" ' + (attrs || "") + ">";
  }
  function sel(id, opts, val) {
    return '<div class="selwrap"><select id="' + id + '">' +
      opts.map((o) => '<option value="' + esc(o) + '"' + (o === val ? " selected" : "") + ">" + esc(o) + "</option>").join("") +
      "</select></div>";
  }

  function stringForm(d) {
    d = d || {};
    const r = d.ratings || {};
    return '' +
      '<div class="field row2"><div><label>Brand</label>' + inp("f_brand", d.brand, 'autocomplete="off"') + "</div>" +
      "<div><label>Name</label>" + inp("f_name", d.name, 'autocomplete="off"') + "</div></div>" +
      '<div class="field row2"><div><label>Material</label>' + sel("f_material", MATERIALS, d.material || "poly") + "</div>" +
      "<div><label>Geometry</label>" + sel("f_geo", GEOMETRIES, d.geo || "round") + "</div></div>" +
      '<div class="field row2"><div><label>Tier</label>' + sel("f_tier", TIERS, d.tier || "$$") + "</div>" +
      "<div><label>Price (USD)</label>" + inp("f_price", d.price_usd, 'type="number" min="3" max="80" step="0.5"') + "</div></div>" +
      '<div class="field"><label>Gauges (mm, comma-separated, thickest first)</label>' +
        inp("f_gauges", (d.gauges || [1.25]).join(", "), 'autocomplete="off"') + "</div>" +
      '<div class="field"><label>Known for</label>' + inp("f_known", d.known_for, 'autocomplete="off"') + "</div>" +
      '<div class="field"><label>Manufacturer claim (optional)</label>' + inp("f_claim", d.claim, 'autocomplete="off"') + "</div>" +
      '<div class="field"><label>Ratings (0–100)</label><div class="rating-grid">' +
        RATING_KEYS.map(([k, nm]) =>
          '<div class="rg"><label>' + nm + "</label>" + inp("f_r_" + k, r[k] != null ? r[k] : 55, 'type="number" min="0" max="100"') + "</div>").join("") +
      "</div></div>" +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">' +
        '<button class="btn ghost" id="mCancel">Cancel</button>' +
        '<button class="btn" id="mSave">Save to database</button></div>';
  }

  function racketForm(d) {
    d = d || {};
    return '' +
      '<div class="field row2"><div><label>Brand</label>' + inp("f_brand", d.brand, 'autocomplete="off"') + "</div>" +
      "<div><label>Name</label>" + inp("f_name", d.name, 'autocomplete="off"') + "</div></div>" +
      '<div class="field row2"><div><label>Version (optional)</label>' + inp("f_ver", d.ver, 'autocomplete="off"') + "</div>" +
      "<div><label>Year</label>" + inp("f_year", d.year, 'type="number" min="1990" max="2100"') + "</div></div>" +
      '<div class="field row2"><div><label>Mains</label>' + inp("f_mains", d.mains != null ? d.mains : 16, 'type="number" min="12" max="20"') + "</div>" +
      "<div><label>Crosses</label>" + inp("f_crosses", d.crosses != null ? d.crosses : 19, 'type="number" min="12" max="26"') + "</div></div>" +
      '<div class="field row2"><div><label>Head size (in²)</label>' + inp("f_head", d.head_size != null ? d.head_size : 100, 'type="number" min="85" max="125"') + "</div>" +
      "<div><label>Stiffness (RA)</label>" + inp("f_ra", d.ra != null ? d.ra : 65, 'type="number" min="45" max="78"') + "</div></div>" +
      '<div class="field row2"><div><label>Weight (g)</label>' + inp("f_weight", d.weight != null ? d.weight : 300, 'type="number" min="240" max="380"') + "</div>" +
      "<div><label>Character</label>" + inp("f_char", d.char, 'autocomplete="off" placeholder="e.g. control spin"') + "</div></div>" +
      '<div class="field"><label>Known for</label>' + inp("f_known", d.known_for, 'autocomplete="off"') + "</div>" +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">' +
        '<button class="btn ghost" id="mCancel">Cancel</button>' +
        '<button class="btn" id="mSave">Save to database</button></div>';
  }

  function readStringForm() {
    const gauges = ($("f_gauges").value || "").split(",").map((x) => parseFloat(x.trim())).filter((x) => x > 0);
    const ratings = {};
    RATING_KEYS.forEach(([k]) => (ratings[k] = Number($("f_r_" + k).value)));
    return {
      brand: $("f_brand").value.trim(), name: $("f_name").value.trim(),
      material: $("f_material").value, geo: $("f_geo").value, tier: $("f_tier").value,
      price_usd: Number($("f_price").value), gauges,
      known_for: $("f_known").value.trim(), claim: $("f_claim").value.trim(), ratings,
    };
  }
  function readRacketForm() {
    return {
      brand: $("f_brand").value.trim(), name: $("f_name").value.trim(),
      ver: $("f_ver").value.trim(), year: $("f_year").value ? Number($("f_year").value) : null,
      mains: Number($("f_mains").value), crosses: Number($("f_crosses").value),
      head_size: Number($("f_head").value), ra: Number($("f_ra").value), weight: Number($("f_weight").value),
      char: $("f_char").value.trim(), known_for: $("f_known").value.trim(),
    };
  }

  /* ---------------- modal ---------------- */
  let editingId = null;

  function openModal(title, bodyHtml) {
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = bodyHtml;
    $("modalBack").classList.remove("hide");
    const c = $("mCancel"); if (c) c.addEventListener("click", closeModal);
    const s = $("mSave"); if (s) s.addEventListener("click", save);
  }
  function closeModal() { $("modalBack").classList.add("hide"); editingId = null; }

  function openAdd() {
    editingId = null;
    if (tab === "strings") openModal("Add string", stringForm({}));
    else openModal("Add racket", racketForm({}));
  }
  function openEdit(id) {
    editingId = id;
    if (tab === "strings") {
      const d = cache.strings.find((s) => String(s.id) === String(id));
      openModal("Edit string", stringForm(d));
    } else {
      const d = cache.rackets.find((r) => String(r.id) === String(id));
      openModal("Edit racket", racketForm(d));
    }
  }
  // open modal pre-filled from an AI lookup (no id → will create)
  function openFromAI(type, data) {
    editingId = null;
    if (type === "strings") openModal("Preview & save string", stringForm(data));
    else openModal("Preview & save racket", racketForm(data));
  }

  async function save() {
    const body = tab === "strings" ? readStringForm() : readRacketForm();
    if (!body.brand || !body.name) return toast("Brand and name are required.", true);
    const btn = $("mSave"); btn.disabled = true; btn.textContent = "Saving…";
    try {
      if (editingId) await api("/api/admin/" + tab + "/" + editingId, { method: "PUT", body: JSON.stringify(body) });
      else await api("/api/admin/" + tab, { method: "POST", body: JSON.stringify(body) });
      toast(editingId ? "Saved changes" : "Added to catalog");
      closeModal(); loadList();
    } catch (e) { toast(e.message, true); btn.disabled = false; btn.textContent = "Save to database"; }
  }

  /* ---------------- AI Update ---------------- */
  async function aiLookup() {
    const type = $("aiType").value; // string | racket
    const brand = $("aiBrand").value.trim();
    const name = $("aiName").value.trim();
    const model = $("aiModel") ? $("aiModel").value : "";
    const st = $("aiStatus");
    if (!brand || !name) { st.className = "ai-status err"; st.textContent = "Enter a brand and product name."; return; }
    const btn = $("aiBtn"); btn.disabled = true;
    st.className = "ai-status busy"; st.textContent = "Building a profile… (a few seconds)";
    try {
      const d = await api("/api/admin/ai-lookup", { method: "POST", body: JSON.stringify({ type, brand, name, model }) });
      const live = d.source === "ai";
      st.className = "ai-status";
      st.innerHTML = (live
        ? '<span class="badge live">web-sourced</span> Model returned a profile — review and save.'
        : '<span class="badge est">offline estimate</span> ' + esc(d.note || "No API key set; showing an estimate."));
      // make sure the active tab matches the looked-up type so save() targets the right endpoint
      setTab(type === "racket" ? "rackets" : "strings", true);
      openFromAI(type === "racket" ? "rackets" : "strings", d.data);
    } catch (e) {
      st.className = "ai-status err"; st.textContent = "Lookup failed: " + e.message;
    } finally { btn.disabled = false; }
  }

  /* ---------------- tabs / boot ---------------- */
  function setTab(t, skipLoad) {
    tab = t;
    document.querySelectorAll("#adminTabs button").forEach((b) =>
      b.classList.toggle("on", b.getAttribute("data-tab") === t));
    if (!skipLoad) loadList();
  }

  async function loadAiModels() {
    const sel = $("aiModel");
    if (!sel) return;
    try {
      const d = await api("/api/admin/ai-models");
      sel.innerHTML = d.models.map((m) =>
        '<option value="' + m.id + '"' + (m.id === d.default ? " selected" : "") + (m.ready ? "" : " ") + ">" +
        esc(m.label) + (m.ready || m.id === "offline" ? "" : "  (needs API key)") + "</option>").join("");
    } catch (_) {
      sel.innerHTML = '<option value="offline">Offline estimate · no API</option>';
    }
  }

  /* ---------------- bulk upload (CSV) ---------------- */
  const bulkType = () => (tab === "rackets" ? "racket" : "string");
  const STRING_COLS = ["brand", "name", "material", "geo", "gauges", "tier", "price_usd", "known_for", "claim", "pw", "co", "sp", "cf", "fe", "du", "tm"];
  const RACKET_COLS = ["brand", "name", "ver", "year", "mains", "crosses", "head_size", "ra", "weight", "char", "known_for"];
  const STRING_EX = ["Luxilon", "ALU Power", "poly", "round", "1.30|1.25", "$$$", "18", "Tour control benchmark", "", "52", "88", "74", "40", "66", "84", "58"];
  const RACKET_EX = ["Wilson", "Pro Staff 97", "v14", "2023", "16", "19", "97", "66", "315", "control feel", "Classic control frame"];

  function csvCell(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function downloadTemplate() {
    const isStr = bulkType() === "string";
    const cols = isStr ? STRING_COLS : RACKET_COLS, ex = isStr ? STRING_EX : RACKET_EX;
    const csv = cols.join(",") + "\n" + ex.map(csvCell).join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "tension-lab-" + (isStr ? "strings" : "rackets") + "-template.csv";
    document.body.appendChild(a); a.click(); a.remove();
  }

  let bulkCsv = "";
  function bulkModal() {
    const isStr = bulkType() === "string";
    const cols = (isStr ? STRING_COLS : RACKET_COLS).join(", ");
    openModal("Bulk upload " + (isStr ? "strings" : "rackets"),
      '<p class="sub" style="font-size:12.5px;color:var(--ink-soft);line-height:1.5;margin:0 0 12px">' +
        'Upload a <b>.csv</b> file. Columns are matched by their <b>header name</b> (order doesn\u2019t matter, extra columns are ignored), so nothing gets mixed up. ' +
        'Required: <b>brand</b> and <b>name</b>. Recognized columns: <span style="font-family:IBM Plex Mono;font-size:11px">' + esc(cols) + "</span></p>" +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">' +
        '<button class="btn ghost sm" id="tplBtn">⬇ Download template</button>' +
        '<input type="file" id="bulkFile" accept=".csv,text/csv" style="font-size:12.5px">' +
      "</div>" +
      '<div id="bulkPreview"></div>' +
      '<div id="bulkActions" style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px">' +
        '<button class="btn ghost" id="mCancel">Close</button></div>');
    $("tplBtn").addEventListener("click", downloadTemplate);
    $("mCancel").addEventListener("click", closeModal);
    $("bulkFile").addEventListener("change", async (e) => {
      const file = e.target.files[0]; if (!file) return;
      bulkCsv = await file.text();
      await runPreview();
    });
  }

  async function runPreview() {
    const box = $("bulkPreview");
    box.innerHTML = '<div class="empty-note" style="border:0">Reading…</div>';
    let d;
    try { d = await api("/api/admin/bulk/preview", { method: "POST", body: JSON.stringify({ type: bulkType(), csv: bulkCsv }) }); }
    catch (e) { box.innerHTML = '<div class="form-msg err">' + esc(e.message) + "</div>"; return; }
    const mapping = Object.entries(d.mapping).map(([k, h]) => k + " ← “" + esc(h) + "”").join(" · ");
    const rowsHtml = d.rows.map((r) => {
      const status = r.ok ? '<span class="badge live">ok</span>' : '<span class="badge est">skip</span>';
      const detail = r.ok ? esc((r.data.brand || "") + " · " + (r.data.name || "")) : esc(r.errors.join(", "));
      const warn = r.warnings && r.warnings.length ? '<div class="bulk-warn">' + esc(r.warnings.join("; ")) + "</div>" : "";
      return '<tr><td class="num">' + r.line + "</td><td>" + status + "</td><td>" + detail + warn + "</td></tr>";
    }).join("");
    box.innerHTML =
      '<div class="bulk-map"><b>Column mapping:</b> ' + (mapping || "—") + "</div>" +
      '<div class="bulk-sum">' + d.valid + " of " + d.total + " rows ready to import" + (d.total > d.rows.length ? " (showing first " + d.rows.length + ")" : "") + "</div>" +
      '<div class="table-scroll" style="max-height:280px;overflow:auto"><table class="cmp" style="min-width:0"><thead><tr><th class="num">Line</th><th>Status</th><th>Result</th></tr></thead><tbody>' + rowsHtml + "</tbody></table></div>";
    const acts = $("bulkActions");
    acts.innerHTML = '<button class="btn ghost" id="mCancel">Close</button>' +
      (d.valid > 0 ? '<button class="btn sig" id="bulkCommit">Import ' + d.valid + " rows</button>" : "");
    $("mCancel").addEventListener("click", closeModal);
    if (d.valid > 0) $("bulkCommit").addEventListener("click", runCommit);
  }

  async function runCommit() {
    const btn = $("bulkCommit"); btn.disabled = true; btn.textContent = "Importing…";
    try {
      const d = await api("/api/admin/bulk/commit", { method: "POST", body: JSON.stringify({ type: bulkType(), csv: bulkCsv }) });
      toast("Imported " + d.inserted + " " + (bulkType() === "string" ? "strings" : "rackets") +
        (d.skipped ? " (" + d.skipped + " skipped)" : ""));
      closeModal(); loadList();
    } catch (e) { toast(e.message, true); btn.disabled = false; btn.textContent = "Import"; }
  }

  function initAdmin() {
    $("adminView").classList.remove("hide");
    loadAiModels();
    $("bulkBtn").addEventListener("click", bulkModal);
    document.querySelectorAll("#adminTabs button").forEach((b) =>
      b.addEventListener("click", () => setTab(b.getAttribute("data-tab"))));
    $("addBtn").addEventListener("click", openAdd);
    $("aiBtn").addEventListener("click", aiLookup);
    $("modalX").addEventListener("click", closeModal);
    $("modalBack").addEventListener("click", (e) => { if (e.target.id === "modalBack") closeModal(); });
    loadList();
  }

  (window.TLAuth.ready || Promise.resolve()).then(() => {
    const u = window.TLAuth.user;
    if (u && u.role === "admin") initAdmin();
    else $("denyView").classList.remove("hide");
  });
})();
