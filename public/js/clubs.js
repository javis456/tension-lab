/* ============================================================
   Clubs — community sharing of combinations & game feedback
   ============================================================ */
(function () {
  "use strict";
  const { esc, api, toast } = window.TL;
  const $ = (id) => document.getElementById(id);
  const AXES = (window.TLEngine && window.TLEngine.ATTRS) || [
    { k: "pw", nm: "Power" }, { k: "co", nm: "Control" }, { k: "sp", nm: "Spin" },
    { k: "cf", nm: "Comfort" }, { k: "fe", nm: "Feel" }, { k: "du", nm: "Durability" }, { k: "tm", nm: "Tension" }];
  let currentClubId = null;

  /* ---------- modal ---------- */
  function openModal(title, html) { $("modalTitle").textContent = title; $("modalBody").innerHTML = html; $("modalBack").classList.remove("hide"); }
  const closeModal = () => $("modalBack").classList.add("hide");
  $("modalX").addEventListener("click", closeModal);
  $("modalBack").addEventListener("click", (e) => { if (e.target.id === "modalBack") closeModal(); });

  /* ---------- username gate ---------- */
  function needUsername() {
    openModal("Choose a username",
      '<p class="sub" style="font-size:13px;color:var(--ink-soft);margin:0 0 12px">Pick a username so other players can see who shared and commented. 3–20 letters, numbers or underscores.</p>' +
      '<div class="form-row"><input id="u_name" placeholder="e.g. topspin_tom" autocomplete="username"></div>' +
      '<div style="display:flex;justify-content:flex-end"><button class="btn" id="u_save">Save username</button></div>');
    $("u_save").addEventListener("click", async () => {
      try {
        const d = await api("/api/auth/username", { method: "POST", body: JSON.stringify({ username: $("u_name").value.trim() }) });
        window.TLAuth.user = d.user; closeModal(); boot();
      } catch (e) { toast(e.message, true); }
    });
  }

  /* ---------- sidebar ---------- */
  async function loadClubs() {
    const d = await api("/api/clubs");
    renderSide(d);
    if (!currentClubId && d.mine.length) selectClub(d.mine[0].id);
  }
  function renderSide(d) {
    const mine = d.mine.map((c) =>
      '<button class="club-item' + (c.id === currentClubId ? " on" : "") + '" data-club="' + c.id + '">' +
      '<span class="cn">' + esc(c.name) + (c.is_default ? ' <span class="home">home</span>' : "") + "</span>" +
      '<span class="cm">' + c.members + " member" + (c.members === 1 ? "" : "s") + (c.role === "admin" ? " · admin" : "") + "</span></button>").join("");
    const invites = d.invites.length ? '<div class="side-h">Invitations</div>' + d.invites.map((c) =>
      '<div class="club-invite"><span>' + esc(c.name) + "</span><span>" +
      '<button class="btn sm accept-inv" data-club="' + c.id + '">Accept</button> ' +
      '<button class="btn link decline-inv" data-club="' + c.id + '">✕</button></span></div>').join("") : "";
    const discover = d.discover.length ? '<div class="side-h">Discover</div>' + d.discover.map((c) =>
      '<div class="club-invite"><span>' + esc(c.name) + '<br><span class="cm">' + c.members + " members</span></span>" +
      (c.requested ? '<span class="cm">requested</span>' : '<button class="btn ghost sm join-club" data-club="' + c.id + '">Join</button>') +
      "</span></div>").join("") : "";
    $("clubSide").innerHTML =
      '<div class="side-h">My clubs</div>' + mine + invites + discover +
      '<button class="btn ghost sm" id="createClubBtn" style="margin-top:14px;width:100%">＋ Create a club</button>';
    $("clubSide").querySelectorAll(".club-item").forEach((b) => b.addEventListener("click", () => selectClub(Number(b.getAttribute("data-club")))));
    $("clubSide").querySelectorAll(".join-club").forEach((b) => b.addEventListener("click", () => act("/api/clubs/" + b.getAttribute("data-club") + "/join", "Requested to join")));
    $("clubSide").querySelectorAll(".accept-inv").forEach((b) => b.addEventListener("click", () => act("/api/clubs/" + b.getAttribute("data-club") + "/accept", "Joined!", Number(b.getAttribute("data-club")))));
    $("clubSide").querySelectorAll(".decline-inv").forEach((b) => b.addEventListener("click", () => act("/api/clubs/" + b.getAttribute("data-club") + "/decline", "Declined")));
    $("createClubBtn").addEventListener("click", createClubModal);
  }
  async function act(url, msg, selectId) {
    try { await api(url, { method: "POST" }); toast(msg); if (selectId) currentClubId = selectId; await loadClubs(); if (selectId) selectClub(selectId); }
    catch (e) { toast(e.message, true); }
  }
  function createClubModal() {
    openModal("Create a club",
      '<div class="form-row"><label>Club name</label><input id="c_name" placeholder="e.g. Bangkok Baseliners"></div>' +
      '<div class="form-row"><label>Description (optional)</label><textarea id="c_desc" rows="2"></textarea></div>' +
      '<div style="display:flex;justify-content:flex-end"><button class="btn" id="c_save">Create</button></div>');
    $("c_save").addEventListener("click", async () => {
      try {
        const d = await api("/api/clubs", { method: "POST", body: JSON.stringify({ name: $("c_name").value.trim(), description: $("c_desc").value.trim() }) });
        toast("Club created!"); closeModal(); currentClubId = d.club.id; await loadClubs(); await selectClub(d.club.id);
      } catch (e) { toast(e.message, true); }
    });
  }

  /* ---------- club main ---------- */
  async function selectClub(id) {
    currentClubId = id;
    document.querySelectorAll(".club-item").forEach((b) => b.classList.toggle("on", Number(b.getAttribute("data-club")) === id));
    const main = $("clubMain");
    main.innerHTML = '<div class="empty-note" style="border:0">Loading…</div>';
    let d;
    try { d = await api("/api/clubs/" + id); } catch (e) { main.innerHTML = '<div class="empty-note">' + esc(e.message) + "</div>"; return; }
    renderMain(d);
  }
  function renderMain(d) {
    const c = d.club;
    let admin = "";
    if (d.isAdmin) {
      const reqs = d.requests.length ? '<div class="admin-sub">Join requests</div>' + d.requests.map((r) =>
        '<div class="mrow"><span>@' + esc(r.username) + '</span><button class="btn sm approve" data-uid="' + r.id + '">Approve</button></div>').join("") : "";
      const members = d.members.map((m) =>
        '<div class="mrow"><span>@' + esc(m.username) + (m.role === "admin" ? ' <span class="home">admin</span>' : "") + "</span>" +
        (m.role !== "admin" ? '<button class="btn link remove-m" data-uid="' + m.id + '">remove</button>' : "") + "</div>").join("");
      admin = '<div class="admin-box"><div class="admin-sub">Invite a player</div>' +
        '<div style="display:flex;gap:8px"><input id="inv_user" placeholder="their username" style="flex:1"><button class="btn sm" id="inviteBtn">Invite</button></div>' +
        reqs + '<div class="admin-sub">Members (' + d.members.length + ")</div>" + members + "</div>";
    }
    const compose = '<div class="compose"><span class="lbl">Share to this club:</span>' +
      '<button class="btn ghost sm" id="shareComboBtn">＋ A combination</button>' +
      '<button class="btn ghost sm" id="shareFbBtn">＋ Game feedback</button></div>';
    const feed = d.posts.length ? d.posts.map(postCard).join("") : '<div class="empty-note">No posts yet — be the first to share.</div>';
    $("clubMain").innerHTML =
      '<div class="club-head"><div><h2>' + esc(c.name) + "</h2><p>" + esc(c.description || "") + "</p></div>" +
        (c.is_default ? "" : '<button class="btn link" id="leaveBtn">Leave</button>') + "</div>" +
      admin + compose + '<div class="feed">' + feed + "</div>";
    if (d.isAdmin) {
      $("inviteBtn").addEventListener("click", invite);
      $("clubMain").querySelectorAll(".approve").forEach((b) => b.addEventListener("click", () => postAction("/api/clubs/" + c.id + "/approve", { userId: Number(b.getAttribute("data-uid")) })));
      $("clubMain").querySelectorAll(".remove-m").forEach((b) => b.addEventListener("click", () => postAction("/api/clubs/" + c.id + "/members/" + b.getAttribute("data-uid") + "/remove", {})));
    }
    const lb = $("leaveBtn"); if (lb) lb.addEventListener("click", async () => { if (confirm("Leave this club?")) { await postAction("/api/clubs/" + c.id + "/leave", {}); currentClubId = null; await loadClubs(); } });
    $("shareComboBtn").addEventListener("click", () => shareModal("combo"));
    $("shareFbBtn").addEventListener("click", () => shareModal("feedback"));
    wirePosts();
  }
  async function postAction(url, body) {
    try { await api(url, { method: "POST", body: JSON.stringify(body || {}) }); toast("Done"); selectClub(currentClubId); }
    catch (e) { toast(e.message, true); }
  }
  async function invite() {
    try { await api("/api/clubs/" + currentClubId + "/invite", { method: "POST", body: JSON.stringify({ username: $("inv_user").value.trim() }) }); toast("Invited!"); selectClub(currentClubId); }
    catch (e) { toast(e.message, true); }
  }

  /* ---------- posts ---------- */
  function miniScores(scores) {
    if (!scores) return "";
    return '<div class="mini-scores">' + AXES.map((a) => {
      const v = scores[a.k] != null ? scores[a.k] : 0;
      return '<div class="ms"><span class="msl">' + a.nm.slice(0, 3) + '</span><span class="msbar"><i style="width:' + v + '%"></i></span><span class="msv">' + v + "</span></div>";
    }).join("") + "</div>";
  }
  function avatar(name) { return '<span class="avatar">' + esc((name || "?").charAt(0).toUpperCase()) + "</span>"; }
  function postCard(p) {
    const when = new Date(p.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const kindLabel = p.kind === "combo" ? "shared a combination" : "shared match feedback";
    let body = "";
    if (p.kind === "combo") {
      const c = p.data.config || {};
      const strings = c.hybrid ? esc(c.mains) + " / " + esc(c.crosses) : esc(c.mains || "");
      body = '<div class="pc-title"><span class="kind-chip combo">String combo</span>' + esc(p.data.name || "Combination") + "</div>" +
        '<div class="pc-meta">' + esc(c.racket || "") + " · " + strings + (c.mainTension ? " · " + esc(c.mainTension) + " lb" : "") + "</div>" +
        miniScores(p.data.scores) +
        '<button class="btn ghost sm save-combo" data-id="' + p.id + '">&hearts; Save this combination</button>';
    } else {
      const f = p.data;
      body = '<div class="pc-title"><span class="kind-chip fb">Match feedback</span>' + esc(f.racket_label || "Setup") + "</div>" +
        '<div class="pc-meta">' + esc(f.combo_label || "") + (f.overall != null ? " · overall " + f.overall + "/100" : "") + "</div>" +
        '<div class="fb-chart">' + window.TLChart.radar(f.algo_scores, f.player_scores, AXES) + window.TLChart.legend() + "</div>" +
        (f.notes ? '<blockquote class="pc-note">' + esc(f.notes) + "</blockquote>" : "");
    }
    const caption = p.caption ? '<div class="pc-caption">' + esc(p.caption) + "</div>" : "";
    return '<article class="post" data-post="' + p.id + '">' +
      '<div class="post-head">' + avatar(p.author) +
        '<div class="ph-meta"><span class="pa">@' + esc(p.author) + '</span><span class="pk">' + kindLabel + " · " + esc(when) + "</span></div>" +
        (p.mine ? '<button class="btn link del-post" data-id="' + p.id + '">delete</button>' : "") +
      "</div>" + caption +
      '<div class="post-body">' + body + "</div>" +
      '<div class="post-actions">' +
        '<button class="act like-btn' + (p.liked ? " liked" : "") + '" data-id="' + p.id + '"><span class="ic">' + (p.liked ? "♥" : "♡") + '</span> <span class="lc">' + p.likes + "</span></button>" +
        '<button class="act cmt-btn" data-id="' + p.id + '"><span class="ic">💬</span> <span>' + p.comments + "</span></button>" +
      "</div>" +
      '<div class="comments hide" id="cmts_' + p.id + '"></div>' +
    "</article>";
  }
  function wirePosts() {
    document.querySelectorAll(".like-btn").forEach((b) => b.addEventListener("click", async () => {
      try { const d = await api("/api/posts/" + b.getAttribute("data-id") + "/like", { method: "POST" });
        b.classList.toggle("liked", d.liked); b.querySelector(".lc").textContent = d.likes;
        b.querySelector(".ic").textContent = d.liked ? "♥" : "♡";
      } catch (e) { toast(e.message, true); } }));
    document.querySelectorAll(".cmt-btn").forEach((b) => b.addEventListener("click", () => toggleComments(b.getAttribute("data-id"))));
    document.querySelectorAll(".save-combo").forEach((b) => b.addEventListener("click", async () => {
      try { await api("/api/posts/" + b.getAttribute("data-id") + "/save", { method: "POST" }); toast("Saved to your combinations!"); }
      catch (e) { toast(e.message, true); } }));
    document.querySelectorAll(".del-post").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Delete this post?")) return;
      try { await api("/api/posts/" + b.getAttribute("data-id"), { method: "DELETE" }); toast("Deleted"); selectClub(currentClubId); }
      catch (e) { toast(e.message, true); } }));
  }
  async function toggleComments(id) {
    const box = $("cmts_" + id);
    if (!box.classList.contains("hide")) { box.classList.add("hide"); return; }
    box.classList.remove("hide");
    box.innerHTML = '<div class="cm">Loading…</div>';
    try {
      const d = await api("/api/posts/" + id + "/comments");
      box.innerHTML = d.comments.map((c) => '<div class="comment"><span class="ca">@' + esc(c.author) + "</span> " + esc(c.body) + "</div>").join("") +
        '<div class="cmt-add"><input id="ci_' + id + '" placeholder="Write a comment…"><button class="btn sm" data-id="' + id + '">Send</button></div>';
      box.querySelector(".cmt-add button").addEventListener("click", async () => {
        const val = $("ci_" + id).value.trim(); if (!val) return;
        try { await api("/api/posts/" + id + "/comments", { method: "POST", body: JSON.stringify({ body: val }) }); toggleComments(id); toggleComments(id); }
        catch (e) { toast(e.message, true); }
      });
    } catch (e) { box.innerHTML = '<div class="cm">' + esc(e.message) + "</div>"; }
  }

  /* ---------- share ---------- */
  async function shareModal(kind) {
    let items;
    try { items = kind === "combo" ? (await api("/api/setups")).setups : (await api("/api/feedback")).feedback; }
    catch (e) { toast(e.message, true); return; }
    if (!items.length) { toast(kind === "combo" ? "Save a combination first (Setup String)." : "Log some game feedback first.", true); return; }
    const opts = items.map((it) => kind === "combo"
      ? '<option value="' + it.id + '">' + esc(it.name) + " — " + esc((it.config || {}).racket || "") + "</option>"
      : '<option value="' + it.id + '">' + esc(it.racket_label || "Setup") + " — " + esc(it.combo_label || "") + "</option>").join("");
    openModal("Share " + (kind === "combo" ? "a combination" : "game feedback"),
      '<div class="form-row"><label>Choose one to share</label><div class="selwrap"><select id="share_item">' + opts + "</select></div></div>" +
      '<div class="form-row"><label>Add a caption <span class="hint" style="font-weight:400;text-transform:none;color:var(--ink-faint)">— tell members what to notice</span></label>' +
        '<textarea id="share_caption" rows="2" maxlength="400" placeholder="e.g. Switched to a softer poly — way easier on my elbow, still great spin."></textarea></div>' +
      '<div style="display:flex;justify-content:flex-end"><button class="btn sig" id="share_go">Share to club</button></div>');
    $("share_go").addEventListener("click", async () => {
      const caption = $("share_caption").value.trim();
      const body = kind === "combo"
        ? { kind: "combo", setupId: Number($("share_item").value), caption }
        : { kind: "feedback", feedbackId: Number($("share_item").value), caption };
      try { await api("/api/clubs/" + currentClubId + "/posts", { method: "POST", body: JSON.stringify(body) }); toast("Shared!"); closeModal(); selectClub(currentClubId); }
      catch (e) { toast(e.message, true); }
    });
  }

  /* ---------- boot ---------- */
  async function boot() {
    await (window.TLAuth.ready || Promise.resolve());
    const u = window.TLAuth.user;
    if (!u) { $("guestView").classList.remove("hide"); $("clubsView").classList.add("hide"); return; }
    if (!u.username) { $("clubsView").classList.add("hide"); needUsername(); return; }
    $("guestView").classList.add("hide"); $("clubsView").classList.remove("hide");
    try { await loadClubs(); } catch (e) { $("clubSide").innerHTML = '<div class="empty-note">' + esc(e.message) + "</div>"; }
  }
  boot();
})();
