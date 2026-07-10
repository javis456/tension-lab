/* ============================================================
   Racket Room — auth + My Racket / Saved Combination / Game Feedback
   ============================================================ */
(function () {
  "use strict";
  const { esc, api, toast, matLabel, matHex, priceStr } = window.TL;
  const $ = (id) => document.getElementById(id);
  const AXES = (window.TLEngine && window.TLEngine.ATTRS) || [
    { k: "pw", nm: "Power" }, { k: "co", nm: "Control" }, { k: "sp", nm: "Spin" },
    { k: "cf", nm: "Comfort" }, { k: "fe", nm: "Feel" }, { k: "du", nm: "Durability" }, { k: "tm", nm: "Tension" }];
  const params = new URLSearchParams(location.search);
  const nextUrl = params.get("next");
  let tab = params.get("tab") === "register" ? "register" : "login";

  /* ---------------- AUTH ---------------- */
  function setTab(t) {
    tab = t;
    document.querySelectorAll("#authTabs button").forEach((b) => b.classList.toggle("on", b.getAttribute("data-tab") === t));
    $("authSubmit").textContent = t === "register" ? "Create account" : "Log in";
    $("pwLabel").textContent = t === "register" ? "Password (min 8 characters)" : "Password";
    $("unameRow").classList.toggle("hide", t !== "register");
    hideMsg();
  }
  const showMsg = (m, ok) => { const el = $("authMsg"); el.textContent = m; el.className = "form-msg " + (ok ? "ok" : "err"); };
  const hideMsg = () => { $("authMsg").className = "form-msg err hide"; };

  async function submit() {
    const email = $("email").value.trim(), password = $("password").value;
    if (!email || !password) return showMsg("Enter your email and password.");
    const btn = $("authSubmit"); btn.disabled = true; const orig = btn.textContent; btn.textContent = "…";
    try {
      if (tab === "register") {
        const username = $("username").value.trim();
        if (!username) return showMsg("Choose a username.");
        const d = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, username }) });
        if (d && d.pending) { showPending(email); return; }   // must confirm email first
        window.TLAuth.user = d.user; // auto-verified path
        if (nextUrl) { location.href = nextUrl; return; }
        location.reload(); return;
      }
      await window.TLAuth.login(email, password);
      if (nextUrl) { location.href = nextUrl; return; }
      showView();
    } catch (e) {
      if (e && /confirm your email/i.test(e.message || "")) return showNeedsVerify(email);
      showMsg(e.message || "Something went wrong.");
    }
    finally { btn.disabled = false; btn.textContent = orig; }
  }

  function showPending(addr) {
    $("authView").innerHTML =
      '<div class="page-head" style="text-align:center"><h1>Check your email 📬</h1>' +
      '<p style="margin:0 auto">We sent a confirmation link to <b>' + esc(addr) + '</b>. Click it to activate your account, then come back and log in.</p></div>' +
      '<div style="text-align:center;margin-top:16px"><button class="btn ghost sm" id="resendBtn">Resend the email</button></div>';
    $("resendBtn").addEventListener("click", async () => {
      try { await api("/api/auth/resend", { method: "POST", body: JSON.stringify({ email: addr }) }); toast("Sent again — check your inbox."); }
      catch (e) { toast(e.message, true); }
    });
  }
  function showNeedsVerify(addr) {
    showMsg("Please confirm your email first — check your inbox. ", false);
    const el = $("authMsg");
    const b = document.createElement("button"); b.className = "btn link"; b.textContent = "Resend confirmation";
    b.addEventListener("click", async () => {
      try { await api("/api/auth/resend", { method: "POST", body: JSON.stringify({ email: addr }) }); toast("Sent again — check your inbox."); }
      catch (e) { toast(e.message, true); }
    });
    el.appendChild(b);
  }

  /* ---------------- shared modal ---------------- */
  function openModal(title, html) {
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = html;
    $("modalBack").classList.remove("hide");
  }
  const closeModal = () => $("modalBack").classList.add("hide");

  /* ---------------- MY RACKET ---------------- */
  const racketImg = (r) => r.has_image ? "/api/rackets/" + r.id + "/image" + (r.img_v ? "?v=" + r.img_v : "") : "/img/default-racket.png";
  function myRacketCard(r) {
    return '<div class="item-card racket-item">' +
      '<div class="racket-lay"><img src="' + racketImg(r) + '" alt="' + esc(r.brand) + " " + esc(r.name) + '" loading="lazy"></div>' +
      '<div class="racket-item-row"><div>' +
      '<div class="b">' + esc(r.brand) + " " + esc(r.name) + (r.ver ? " " + esc(r.ver) : "") + "</div>" +
      '<div class="meta">' + esc(r.mains) + "\u00d7" + esc(r.crosses) + " \u00b7 " + esc(r.head_size) +
        " in\u00b2 \u00b7 RA " + esc(r.ra) + " \u00b7 " + esc(r.weight) + "g</div></div>" +
      '<div class="actions">' +
        '<a class="btn ghost sm" href="/?racket=' + r.id + '">Use in Setup</a>' +
        '<button class="btn link del-myracket" data-id="' + r.id + '">Remove</button>' +
      "</div></div></div>";
  }
  async function loadMyRackets() {
    try {
      const d = await api("/api/favorites");
      $("myRacketsList").innerHTML = d.rackets.length ? d.rackets.map(myRacketCard).join("")
        : '<div class="empty-note">No rackets yet. Tap \u201c＋ Add my racket\u201d and pick your frame \u2014 it\u2019ll show up here and top the picker in Setup String.</div>';
      document.querySelectorAll(".del-myracket").forEach((b) => b.addEventListener("click", async () => {
        try { await api("/api/favorites/racket/" + b.getAttribute("data-id"), { method: "DELETE" }); toast("Removed"); loadMyRackets(); }
        catch (e) { toast(e.message, true); }
      }));
    } catch (e) { $("myRacketsList").innerHTML = '<div class="empty-note">Could not load your rackets.</div>'; }
  }
  const fld = (id, label, val, attrs) =>
    '<div><label>' + label + "</label><input id=\"" + id + "\" value=\"" + esc(val == null ? "" : val) + "\" " + (attrs || "") + "></div>";
  let allRacketsCache = null;
  async function addRacketModal() {
    openModal("Add a racket",
      '<p class="sub" style="font-size:12.5px;color:var(--ink-soft);margin:0 0 10px">Pick your frame from the catalog. It\u2019ll appear here and jump to the top of the racket picker in Setup String.</p>' +
      '<input id="rkSearch" placeholder="Search rackets\u2026" autocomplete="off" style="width:100%;margin-bottom:10px">' +
      '<div id="rkPick" class="rk-pick"><div class="empty-note" style="border:0">Loading\u2026</div></div>');
    if (!allRacketsCache) {
      try { allRacketsCache = (await api("/api/rackets")).rackets.filter((r) => r.brand !== "\u2014"); }
      catch (_) { allRacketsCache = []; }
    }
    const render = (q) => {
      const ql = q.trim().toLowerCase();
      const list = allRacketsCache.filter((r) => !ql || (r.brand + " " + r.name + " " + (r.ver || "")).toLowerCase().includes(ql)).slice(0, 60);
      $("rkPick").innerHTML = list.length ? list.map((r) =>
        '<button class="rk-pick-row" data-id="' + r.id + '">' +
          '<span class="rp-b">' + esc(r.brand) + " " + esc(r.name) + (r.ver ? " " + esc(r.ver) : "") + "</span>" +
          '<span class="rp-m">' + esc(r.mains) + "\u00d7" + esc(r.crosses) + " \u00b7 " + esc(r.head_size) + " in\u00b2" + (r.has_image ? " \u00b7 \uD83D\uDCF7" : "") + "</span>" +
        "</button>").join("") : '<div class="empty-note" style="border:0">No matches.</div>';
      document.querySelectorAll(".rk-pick-row").forEach((b) => b.addEventListener("click", async () => {
        try { await api("/api/favorites", { method: "POST", body: JSON.stringify({ kind: "racket", item_id: Number(b.getAttribute("data-id")) }) }); toast("Added to My Racket"); closeModal(); loadMyRackets(); }
        catch (e) { toast(e.message, true); }
      }));
    };
    render("");
    $("rkSearch").addEventListener("input", (e) => render(e.target.value));
    $("rkSearch").focus();
  }

  /* ---------------- SAVED COMBINATION ---------------- */
  let setupsCache = [];
  let racketImgSet = null; // map of racketId -> img_v for catalog rackets that have a photo
  async function ensureRacketImgSet() {
    if (racketImgSet) return racketImgSet;
    racketImgSet = new Map();
    try { (await api("/api/rackets")).rackets.forEach((r) => { if (r.has_image) racketImgSet.set(r.id, r.img_v || 1); }); } catch (_) {}
    return racketImgSet;
  }
  function comboCard(s) {
    const c = s.config || {};
    const strings = c.hybrid ? esc(c.mains) + " / " + esc(c.crosses) : esc(c.mains || "—");
    const tens = c.hybrid ? (c.mainTension + " / " + c.crossTension + " lb") : (c.mainTension != null ? c.mainTension + " lb" : "");
    const rid = c.racketId;
    const src = (rid != null && racketImgSet && racketImgSet.has(rid)) ? "/api/rackets/" + rid + "/image?v=" + racketImgSet.get(rid) : "/img/default-racket.png";
    const photo = '<div class="racket-lay"><img src="' + src + '" alt="' + esc(c.racket || "") + '" loading="lazy"></div>';
    return '<div class="item-card racket-item">' + photo +
      '<div class="racket-item-row"><div>' +
      '<div class="b">' + esc(s.name) + "</div>" +
      '<div class="meta">' + esc(c.racket || "") + "<br>" + strings + (tens ? " · " + esc(tens) : "") + (c.hybrid ? " · hybrid" : "") + "</div></div>" +
      '<div class="actions">' +
        '<a class="btn ghost sm" href="/?setup=' + s.id + '">Use in Setup</a>' +
        '<button class="btn link del-combo" data-id="' + s.id + '">Delete</button>' +
      "</div></div></div>";
  }
  async function loadCombos() {
    try {
      await ensureRacketImgSet();
      const d = await api("/api/setups"); setupsCache = d.setups;
      $("combosList").innerHTML = d.setups.length ? d.setups.map(comboCard).join("")
        : '<div class="empty-note">No saved combinations yet. Build one in <a href="/">Setup String</a> and hit \u201cSave this setup\u201d.</div>';
      document.querySelectorAll(".del-combo").forEach((b) => b.addEventListener("click", async () => {
        if (!confirm("Delete this combination?")) return;
        try { await api("/api/setups/" + b.getAttribute("data-id"), { method: "DELETE" }); toast("Deleted"); loadCombos(); }
        catch (e) { toast(e.message, true); }
      }));
    } catch (e) { $("combosList").innerHTML = '<div class="empty-note">Could not load combinations.</div>'; }
  }

  /* ---------------- GAME FEEDBACK ---------------- */
  async function loadFeedback() {
    try {
      const d = await api("/api/feedback");
      $("feedbackList").innerHTML = d.feedback.length ? d.feedback.map(fbCard).join("")
        : '<div class="empty-note">No feedback yet. Tap \u201cNew game feedback\u201d after you\u2019ve played with a saved setup.</div>';
      wireFbCards();
    } catch (e) { $("feedbackList").innerHTML = '<div class="empty-note">Could not load feedback.</div>'; }
  }
  function fbCard(f) {
    const chart = window.TLChart.radar(f.algo_scores, f.player_scores, AXES);
    return '<div class="fb-card">' +
      '<div class="fb-head"><div><div class="b">' + esc(f.racket_label || "Setup") + "</div>" +
        '<div class="meta">' + esc(f.combo_label || "") + (f.overall != null ? ' \u00b7 overall <b>' + f.overall + "/100</b>" : "") + "</div></div>" +
        '<div class="fb-actions">' +
          '<button class="btn ghost sm share-fb" data-share="' + esc(f.share_id) + '">Share</button>' +
          '<button class="btn link del-fb" data-id="' + f.id + '">Delete</button></div></div>' +
      '<div class="fb-body"><div class="fb-chart">' + chart + window.TLChart.legend() + "</div>" +
        (f.notes ? '<div class="fb-notes"><span class="lbl">My note</span>' + esc(f.notes) + "</div>" : "") +
      "</div></div>";
  }
  function wireFbCards() {
    document.querySelectorAll(".del-fb").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Delete this feedback?")) return;
      try { await api("/api/feedback/" + b.getAttribute("data-id"), { method: "DELETE" }); toast("Deleted"); loadFeedback(); }
      catch (e) { toast(e.message, true); }
    }));
    document.querySelectorAll(".share-fb").forEach((b) => b.addEventListener("click", () => {
      const url = location.origin + "/share.html?id=" + b.getAttribute("data-share");
      navigator.clipboard && navigator.clipboard.writeText(url).then(
        () => toast("Share link copied!"),
        () => prompt("Copy this link:", url)
      ) || prompt("Copy this link:", url);
    }));
  }

  async function newFeedbackModal() {
    let setups = setupsCache;
    if (!setups.length) { try { setups = (await api("/api/setups")).setups; setupsCache = setups; } catch (_) {} }
    if (!setups.length) { toast("Save a combination first, then log feedback.", true); return; }
    const opts = setups.map((s) => '<option value="' + s.id + '">' + esc(s.name) + " — " + esc((s.config || {}).racket || "") + "</option>").join("");
    const sliders = AXES.map((a) =>
      '<div class="score-row"><label>' + esc(a.nm) + ' <span class="algo-ref" id="ref_' + a.k + '"></span></label>' +
      '<input type="range" min="0" max="100" id="ps_' + a.k + '" value="55"><span class="score-val" id="val_' + a.k + '">55</span></div>').join("");
    openModal("Game feedback",
      '<div class="field"><label>Which saved combination?</label><div class="selwrap"><select id="fb_setup">' + opts + "</select></div></div>" +
      '<p class="sub" style="font-size:12px;color:var(--ink-soft);margin:2px 0 12px">Rate how it actually played. The faint number is what the algorithm predicted.</p>' +
      '<div class="score-box">' + sliders +
        '<div class="score-row"><label>Overall satisfaction</label><input type="range" min="0" max="100" id="ps_overall" value="70"><span class="score-val" id="val_overall">70</span></div>' +
      "</div>" +
      '<div class="field" style="margin-top:12px"><label>Notes to yourself (optional)</label><textarea id="fb_notes" rows="3" placeholder="e.g. great spin but a bit stiff on the arm after 2 hours — try 2 lb lower next time"></textarea></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px">' +
        '<button class="btn ghost" id="mCancel">Cancel</button><button class="btn sig" id="mSaveFb">Save feedback</button></div>');
    // live value labels
    AXES.concat([{ k: "overall" }]).forEach((a) => {
      const el = $("ps_" + a.k), v = $("val_" + a.k);
      if (el && v) el.addEventListener("input", () => (v.textContent = el.value));
    });
    const applyBaseline = () => {
      const s = setupsCache.find((x) => String(x.id) === $("fb_setup").value);
      const algo = (s && s.scores) || {};
      AXES.forEach((a) => {
        const ref = $("ref_" + a.k); if (ref) ref.textContent = algo[a.k] != null ? "· predicts " + algo[a.k] : "";
        const el = $("ps_" + a.k), v = $("val_" + a.k);
        if (el && algo[a.k] != null) { el.value = algo[a.k]; v.textContent = algo[a.k]; }
      });
    };
    $("fb_setup").addEventListener("change", applyBaseline);
    applyBaseline();
    $("mCancel").addEventListener("click", closeModal);
    $("mSaveFb").addEventListener("click", saveFeedback);
  }
  async function saveFeedback() {
    const player_scores = {};
    AXES.forEach((a) => (player_scores[a.k] = Number($("ps_" + a.k).value)));
    const body = {
      setup_id: Number($("fb_setup").value),
      player_scores,
      overall: Number($("ps_overall").value),
      notes: $("fb_notes").value.trim(),
    };
    try { await api("/api/feedback", { method: "POST", body: JSON.stringify(body) }); toast("Feedback saved"); closeModal(); loadFeedback(); }
    catch (e) { toast(e.message, true); }
  }

  /* ---------------- tabs + view ---------------- */
  function roomTab(t) {
    document.querySelectorAll("#roomTabs button").forEach((b) => b.classList.toggle("on", b.getAttribute("data-tab") === t));
    $("tab-rackets").classList.toggle("hide", t !== "rackets");
    $("tab-combos").classList.toggle("hide", t !== "combos");
    $("tab-feedback").classList.toggle("hide", t !== "feedback");
  }
  function renderUsernameStrip() {
    const el = $("usernameStrip"); if (!el) return;
    const u = window.TLAuth.user; if (!u) return;
    if (!u.username) {
      el.innerHTML = '<span class="us-label">No username yet</span><button class="btn sm" id="setUnameBtn">Choose a username</button>';
      $("setUnameBtn").addEventListener("click", () => usernameModal(false));
    } else if (!u.username_change_used) {
      el.innerHTML = '<span class="us-name">@' + esc(u.username) + '</span><button class="btn ghost sm" id="chgUnameBtn">Change username</button><span class="us-note">you can change it once</span>';
      $("chgUnameBtn").addEventListener("click", () => usernameModal(true));
    } else {
      el.innerHTML = '<span class="us-name">@' + esc(u.username) + '</span><span class="us-note us-lock">🔒 username locked</span>';
    }
  }
  function usernameModal(isChange) {
    openModal(isChange ? "Change your username" : "Choose a username",
      '<p class="sub" style="font-size:12.5px;color:var(--ink-soft);margin:0 0 12px">' +
        (isChange ? "You can change your username <b>once</b> — choose carefully." : "Other players see this on your posts and comments.") +
        " 3–20 letters, numbers or underscores.</p>" +
      '<div class="form-row"><input id="u_new" placeholder="e.g. topspin_tom" autocomplete="username"></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn ghost" id="uCancel">Cancel</button>' +
        '<button class="btn" id="uSave">' + (isChange ? "Save change" : "Save username") + "</button></div>");
    $("uCancel").addEventListener("click", closeModal);
    $("uSave").addEventListener("click", async () => {
      try {
        const d = await api("/api/auth/username", { method: "POST", body: JSON.stringify({ username: $("u_new").value.trim() }) });
        window.TLAuth.user = d.user; closeModal(); renderUsernameStrip(); toast("Username saved!");
      } catch (e) { toast(e.message, true); }
    });
  }

  function showView() {
    const u = window.TLAuth.user;
    const ld = $("authLoading"); if (ld) ld.style.display = "none";
    $("authView").classList.toggle("hide", !!u);
    $("roomView").classList.toggle("hide", !u);
    if (u) { renderUsernameStrip(); loadMyRackets(); loadCombos(); loadFeedback(); }
    else { window.TL.mountGoogleSignIn("googleBtn").then((ok) => { if (ok) $("googleBtnWrap").style.display = "block"; }); }
  }

  /* ---------------- wire ---------------- */
  document.querySelectorAll("#roomTabs button").forEach((b) => b.addEventListener("click", () => roomTab(b.getAttribute("data-tab"))));
  document.querySelectorAll("#authTabs button").forEach((b) => b.addEventListener("click", () => setTab(b.getAttribute("data-tab"))));
  $("authSubmit").addEventListener("click", submit);
  $("password").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  $("email").addEventListener("keydown", (e) => { if (e.key === "Enter") $("password").focus(); });
  $("addRacketBtn").addEventListener("click", addRacketModal);
  $("newFeedbackBtn").addEventListener("click", newFeedbackModal);
  $("modalX").addEventListener("click", closeModal);
  $("modalBack").addEventListener("click", (e) => { if (e.target.id === "modalBack") closeModal(); });

  setTab(tab);
  const verify = params.get("verify");
  if (verify === "ok") setTimeout(() => toast("Email confirmed — you're in! 🎾"), 400);
  else if (verify === "invalid") setTimeout(() => toast("That confirmation link is invalid or expired.", true), 400);
  (window.TLAuth.ready || Promise.resolve()).then(showView);
})();
