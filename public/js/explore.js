/* ============================================================
   Explore — player-shared string combinations
   ============================================================ */
(function () {
  "use strict";
  const { esc, api, toast } = window.TL;
  const $ = (id) => document.getElementById(id);
  const AXES = (window.TLEngine && window.TLEngine.ATTRS) || [
    { k: "pw", nm: "Power" }, { k: "co", nm: "Control" }, { k: "sp", nm: "Spin" },
    { k: "cf", nm: "Comfort" }, { k: "fe", nm: "Feel" }, { k: "du", nm: "Durability" }, { k: "tm", nm: "Tension" }];
  const TAG_LABELS = { control: "Control", spin: "Spin", power: "Power", comfort: "Comfort", "all-round": "All-round", hybrid: "Hybrid", poly: "Poly", soft: "Gut/Multi", "arm-friendly": "Arm-friendly", durable: "Durable" };
  let state = { sort: "popular", tag: "all" };
  let racketsCache = null;

  function openModal(title, html) { $("modalTitle").textContent = title; $("modalBody").innerHTML = html; $("modalBack").classList.remove("hide"); }
  const closeModal = () => $("modalBack").classList.add("hide");
  $("modalX").addEventListener("click", closeModal);
  $("modalBack").addEventListener("click", (e) => { if (e.target.id === "modalBack") closeModal(); });

  const racketImg = (r) => (r && r.has_image) ? "/api/rackets/" + r.racket_id + "/image?v=" + (r.img_v || 1) : "/img/default-racket.png";
  function miniScores(scores) {
    if (!scores) return "";
    return '<div class="mini-scores">' + AXES.map((a) => {
      const v = scores[a.k] != null ? scores[a.k] : 0;
      return '<div class="ms"><span class="msl">' + a.nm.slice(0, 3) + '</span><span class="msbar"><i style="width:' + v + '%"></i></span><span class="msv">' + v + "</span></div>";
    }).join("") + "</div>";
  }

  /* ---------------- list ---------------- */
  function comboBox(c) {
    const desc = c.description ? esc(c.description).slice(0, 130) : '<span style="color:var(--ink-faint)">No description</span>';
    const tr = c.top_racket;
    const racket = tr ? '<div class="cb-racket"><img src="' + racketImg(tr) + '" alt=""><div><span class="cbr-lbl">most paired with</span><span class="cbr-n">' + esc(tr.brand + " " + tr.name) + "</span></div></div>" : "";
    return '<div class="combo-box">' +
      '<div class="cb-vote" data-id="' + c.id + '">' +
        '<button class="cbv up' + (c.my_vote === 1 ? " on" : "") + '" data-dir="1">\u25B2</button>' +
        '<span class="cbv-n">' + c.votes + "</span>" +
        '<button class="cbv down' + (c.my_vote === -1 ? " on" : "") + '" data-dir="-1">\u25BC</button>' +
      "</div>" +
      '<div class="cb-main" data-open="' + c.id + '">' +
        '<div class="cb-top"><span class="cb-name">' + esc(c.name) + '</span><span class="arch-chip">' + esc(c.archetype) + "</span></div>" +
        '<div class="cb-by">@' + esc(c.username) + " \u00b7 " + c.rackets + " racket" + (c.rackets === 1 ? "" : "s") + " \u00b7 " + c.comments + " comment" + (c.comments === 1 ? "" : "s") + "</div>" +
        '<div class="cb-desc">' + desc + "</div>" +
        '<div class="cb-tags">' + (c.tags || []).slice(0, 4).map((t) => '<span class="tg">' + esc(TAG_LABELS[t] || t) + "</span>").join("") + "</div>" +
        racket +
      "</div></div>";
  }

  async function load() {
    $("expList").innerHTML = '<div class="empty-note">Loading…</div>';
    try {
      const d = await api("/api/explore?sort=" + state.sort + "&tag=" + encodeURIComponent(state.tag));
      renderTags(d.tags);
      if (!d.combos.length) { $("expList").innerHTML = '<div class="empty-note">No shared combinations' + (state.tag !== "all" ? " with this tag" : " yet") + ". Be the first to share one!</div>"; return; }
      $("expList").innerHTML = d.combos.map(comboBox).join("");
      wireList();
    } catch (e) { $("expList").innerHTML = '<div class="empty-note">Could not load.</div>'; }
  }

  function renderTags(tags) {
    if ($("expTags").dataset.done) return;
    $("expTags").dataset.done = "1";
    $("expTags").innerHTML = '<button data-tag="all" class="on">All</button>' + (tags || []).map((t) => '<button data-tag="' + t + '">' + esc(TAG_LABELS[t] || t) + "</button>").join("");
    $("expTags").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      state.tag = b.getAttribute("data-tag");
      $("expTags").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      load();
    }));
  }

  async function voteButtons(el, id, endpoint, nSel, upSel, downSel) {
    // shared vote handler wiring
  }
  function wireList() {
    document.querySelectorAll(".cb-main[data-open]").forEach((el) => el.addEventListener("click", () => openDetail(el.getAttribute("data-open"))));
    document.querySelectorAll(".cb-vote .cbv").forEach((b) => b.addEventListener("click", async (e) => {
      e.stopPropagation();
      const wrap = b.closest(".cb-vote"); const id = wrap.getAttribute("data-id");
      const dir = b.classList.contains("on") ? 0 : Number(b.getAttribute("data-dir"));
      try {
        const d = await api("/api/explore/" + id + "/vote", { method: "POST", body: JSON.stringify({ dir }) });
        wrap.querySelector(".cbv-n").textContent = d.votes;
        wrap.querySelector(".up").classList.toggle("on", d.my_vote === 1);
        wrap.querySelector(".down").classList.toggle("on", d.my_vote === -1);
      } catch (err) { toast(err.message, true); }
    }));
  }

  /* ---------------- detail ---------------- */
  async function openDetail(id) {
    openModal("…", '<div class="empty-note">Loading…</div>');
    let d;
    try { d = await api("/api/explore/" + id); } catch (e) { $("modalBody").innerHTML = '<div class="empty-note">Could not load.</div>'; return; }
    const c = d.combo, cfg = c.config;
    $("modalTitle").textContent = c.name;
    const strLine = cfg.hybrid ? esc(cfg.mains) + " / " + esc(cfg.crosses) : esc(cfg.mains || "");
    const racketRow = (r, top) =>
      '<div class="pr-row" data-crid="' + r.id + '">' +
      (top ? '<span class="pr-top">most paired with</span>' : "") +
      '<img src="' + racketImg(r) + '" alt="">' +
      '<div class="pr-info"><span class="pr-n">' + esc(r.brand + " " + r.name) + (r.ver ? " " + esc(r.ver) : "") + "</span>" +
        '<span class="pr-by">' + (r.added_by ? "added by @" + esc(r.added_by) : "sharer\u2019s pick") + "</span></div>" +
      '<div class="pr-vote"><button class="prv up' + (r.my_vote === 1 ? " on" : "") + '" data-dir="1">\u25B2</button>' +
        '<span class="prv-n">' + r.votes + "</span>" +
        '<button class="prv down' + (r.my_vote === -1 ? " on" : "") + '" data-dir="-1">\u25BC</button></div></div>';
    $("modalBody").innerHTML =
      '<div class="det-head"><span class="arch-chip">' + esc(c.archetype) + "</span>" +
        '<div class="det-vote"><button class="dv up' + (c.my_vote === 1 ? " on" : "") + '" data-dir="1">\u25B2</button><span class="dv-n">' + c.votes + '</span><button class="dv down' + (c.my_vote === -1 ? " on" : "") + '" data-dir="-1">\u25BC</button></div></div>' +
      '<div class="det-by">shared by @' + esc(c.username) + "</div>" +
      '<div class="det-setup"><b>' + strLine + "</b>" + (cfg.mainTension ? " \u00b7 " + esc(cfg.mainTension) + " lb" : "") + (cfg.hybrid ? " \u00b7 hybrid" : "") + "</div>" +
      (c.description ? '<p class="det-desc">' + esc(c.description) + "</p>" : "") +
      miniScores(c.scores) +
      '<div style="text-align:center;margin:14px 0"><a class="btn" href="/?explore=' + c.id + '">Use in Setup String</a></div>' +
      '<h4 class="det-h">Rackets paired with this <span>most-voted first</span></h4>' +
      '<div id="prList">' + (d.rackets.length ? d.rackets.map((r, i) => racketRow(r, i === 0 && r.votes > 0)).join("") : '<div class="empty-note" style="border:0">No rackets suggested yet.</div>') + "</div>" +
      '<div class="pr-add"><div class="selwrap"><select id="prRacket"><option value="">Suggest a racket to pair…</option></select></div><button class="btn ghost sm" id="prAddBtn">Add</button></div>' +
      '<h4 class="det-h">Comments</h4>' +
      '<div id="cmtList">' + renderComments(d.comments) + "</div>" +
      '<div class="cmt-add"><input id="cmtBody" placeholder="Add a comment… (optionally pick a racket above)" maxlength="600"><button class="btn sm" id="cmtBtn">Post</button></div>';
    wireDetail(id);
  }

  function renderComments(list) {
    if (!list.length) return '<div class="empty-note" style="border:0">No comments yet.</div>';
    return list.map((c) => '<div class="cmt"><span class="cmt-a">@' + esc(c.username) + "</span> " + esc(c.body) + (c.racket ? ' <span class="cmt-rk">\uD83C\uDFBE ' + esc(c.racket) + "</span>" : "") + "</div>").join("");
  }

  async function ensureRackets() {
    if (racketsCache) return racketsCache;
    try { racketsCache = (await api("/api/rackets")).rackets.filter((r) => r.brand !== "\u2014"); } catch (_) { racketsCache = []; }
    return racketsCache;
  }

  async function wireDetail(id) {
    $("modalBody").querySelectorAll(".det-vote .dv").forEach((b) => b.addEventListener("click", async () => {
      const dir = b.classList.contains("on") ? 0 : Number(b.getAttribute("data-dir"));
      try {
        const d = await api("/api/explore/" + id + "/vote", { method: "POST", body: JSON.stringify({ dir }) });
        $("modalBody").querySelector(".dv-n").textContent = d.votes;
        $("modalBody").querySelector(".dv.up").classList.toggle("on", d.my_vote === 1);
        $("modalBody").querySelector(".dv.down").classList.toggle("on", d.my_vote === -1);
      } catch (e) { toast(e.message, true); }
    }));
    $("modalBody").querySelectorAll(".pr-row .prv").forEach((b) => b.addEventListener("click", async () => {
      const row = b.closest(".pr-row"); const crid = row.getAttribute("data-crid");
      const dir = b.classList.contains("on") ? 0 : Number(b.getAttribute("data-dir"));
      try {
        const d = await api("/api/explore/rackets/" + crid + "/vote", { method: "POST", body: JSON.stringify({ dir }) });
        row.querySelector(".prv-n").textContent = d.votes;
        row.querySelector(".prv.up").classList.toggle("on", d.my_vote === 1);
        row.querySelector(".prv.down").classList.toggle("on", d.my_vote === -1);
      } catch (e) { toast(e.message, true); }
    }));
    const sel = $("prRacket"), rk = await ensureRackets();
    if (sel) sel.innerHTML = '<option value="">Suggest a racket to pair…</option>' + rk.map((r) => '<option value="' + r.id + '">' + esc(r.brand + " " + r.name + (r.ver ? " " + r.ver : "")) + "</option>").join("");
    const addBtn = $("prAddBtn");
    if (addBtn) addBtn.addEventListener("click", async () => {
      const rid = Number($("prRacket").value); if (!rid) { toast("Pick a racket first.", true); return; }
      try { await api("/api/explore/" + id + "/rackets", { method: "POST", body: JSON.stringify({ racketId: rid }) }); toast("Racket added"); openDetail(id); }
      catch (e) { toast(e.message, true); }
    });
    const cmtBtn = $("cmtBtn");
    if (cmtBtn) cmtBtn.addEventListener("click", async () => {
      const body = $("cmtBody").value.trim(); const rid = Number($("prRacket").value) || null;
      if (!body && !rid) { toast("Write a comment first.", true); return; }
      try { await api("/api/explore/" + id + "/comments", { method: "POST", body: JSON.stringify({ body, racketId: rid }) }); toast("Posted"); openDetail(id); }
      catch (e) { toast(e.message, true); }
    });
  }

  /* ---------------- share ---------------- */
  async function shareModal() {
    if (!(window.TLAuth && window.TLAuth.user)) { toast("Please log in to share.", true); location.href = "/account.html"; return; }
    let setups = [];
    try { setups = (await api("/api/setups")).setups; } catch (_) {}
    if (!setups.length) { openModal("Share a combination", '<p class="sub" style="font-size:13px;color:var(--ink-soft);line-height:1.6">You don\u2019t have any saved combinations yet. Build one in <a href="/">Setup String</a>, tap \u201cSave\u201d, then come back to share it here.</p>'); return; }
    openModal("Share a combination",
      '<div class="form-row"><label>Which saved combination?</label><div class="selwrap"><select id="sh_setup">' + setups.map((s) => '<option value="' + s.id + '">' + esc(s.name) + "</option>").join("") + "</select></div></div>" +
      '<div class="form-row"><label>Name it <span class="cnt" id="nameCnt">0/42</span></label><input id="sh_name" maxlength="42" placeholder="e.g. Elbow-saver spin"></div>' +
      '<div class="form-row"><label>Describe it <span class="cnt" id="descCnt">0/100 words</span></label><textarea id="sh_desc" rows="4" placeholder="What it feels like, who it\u2019s for, why you like it…"></textarea></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:10px"><button class="btn ghost" id="sh_cancel">Cancel</button><button class="btn sig" id="sh_go">Share</button></div>');
    const nameEl = $("sh_name"), descEl = $("sh_desc");
    nameEl.addEventListener("input", () => $("nameCnt").textContent = nameEl.value.length + "/42");
    descEl.addEventListener("input", () => { const w = descEl.value.trim().split(/\s+/).filter(Boolean).length; $("descCnt").textContent = w + "/100 words"; $("descCnt").classList.toggle("over", w > 100); });
    $("sh_cancel").addEventListener("click", closeModal);
    $("sh_go").addEventListener("click", async () => {
      const name = nameEl.value.trim(), description = descEl.value.trim();
      if (!name) { toast("Please name your combination.", true); return; }
      if (description.split(/\s+/).filter(Boolean).length > 100) { toast("Description must be 100 words or fewer.", true); return; }
      try {
        const d = await api("/api/explore", { method: "POST", body: JSON.stringify({ setupId: Number($("sh_setup").value), name, description }) });
        toast("Shared!"); closeModal(); state.sort = "new"; syncSorts(); await load(); openDetail(d.id);
      } catch (e) { toast(e.message, true); }
    });
  }

  function syncSorts() { $("expSorts").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.getAttribute("data-sort") === state.sort)); }

  $("expSorts").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { state.sort = b.getAttribute("data-sort"); syncSorts(); load(); }));
  $("shareBtn").addEventListener("click", shareModal);
  load();
})();
