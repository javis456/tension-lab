/* ============================================================
   Account — login / register + saved setups
   ============================================================ */
(function () {
  "use strict";
  const { esc, api, toast } = window.TL;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const nextUrl = params.get("next");

  let tab = params.get("tab") === "register" ? "register" : "login";

  function setTab(t) {
    tab = t;
    document.querySelectorAll("#authTabs button").forEach((b) =>
      b.classList.toggle("on", b.getAttribute("data-tab") === t));
    $("authSubmit").textContent = t === "register" ? "Create account" : "Log in";
    $("pwLabel").textContent = t === "register" ? "Password (min 8 characters)" : "Password";
    $("password").setAttribute("autocomplete", t === "register" ? "new-password" : "current-password");
    hideMsg();
  }
  function showMsg(m, ok) {
    const el = $("authMsg");
    el.textContent = m; el.className = "form-msg " + (ok ? "ok" : "err");
  }
  function hideMsg() { $("authMsg").className = "form-msg err hide"; }

  async function submit() {
    const email = $("email").value.trim();
    const password = $("password").value;
    if (!email || !password) return showMsg("Enter your email and password.");
    const btn = $("authSubmit"); btn.disabled = true;
    const orig = btn.textContent; btn.textContent = "…";
    try {
      if (tab === "register") await window.TLAuth.register(email, password);
      else await window.TLAuth.login(email, password);
      if (nextUrl) { location.href = nextUrl; return; }
      showView();
    } catch (e) {
      showMsg(e.message || "Something went wrong.");
    } finally { btn.disabled = false; btn.textContent = orig; }
  }

  function setupCard(s) {
    const c = s.config || {};
    const sc = s.scores || {};
    const mini = ["pw", "co", "sp", "cf", "fe", "du", "tm"]
      .map((k) => ({ pw: "PWR", co: "CTL", sp: "SPN", cf: "CMF", fe: "FEL", du: "DUR", tm: "TEN" }[k] + " " + (sc[k] != null ? sc[k] : "—")))
      .map((t) => '<span class="m">' + esc(t) + "</span>").join("");
    const strings = c.hybrid
      ? esc(c.mains) + " / " + esc(c.crosses)
      : esc(c.mains || "—");
    const tens = c.hybrid
      ? (c.mainTension + " / " + c.crossTension + " lb")
      : (c.mainTension != null ? c.mainTension + " lb" : "");
    return '<div class="setup-card" data-id="' + s.id + '">' +
      "<div>" +
        '<div class="st">' + esc(s.name) + "</div>" +
        '<div class="meta">' + esc(c.racket || "") + "<br>" + strings +
          (tens ? " · " + esc(tens) : "") + (c.hybrid ? " · hybrid" : "") + "</div>" +
        '<div class="mini">' + mini + "</div>" +
      "</div>" +
      '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">' +
        '<button class="btn link del" data-id="' + s.id + '">Delete</button>' +
      "</div>" +
    "</div>";
  }

  async function loadSetups() {
    const list = $("setupsList");
    list.innerHTML = '<div class="empty-note" style="border:0">Loading…</div>';
    try {
      const d = await api("/api/setups");
      if (!d.setups.length) {
        list.innerHTML = '<div class="empty-note">No saved setups yet. Build one in <a href="/">Setup String</a> and hit “Save this setup”.</div>';
        return;
      }
      list.innerHTML = d.setups.map(setupCard).join("");
      list.querySelectorAll(".del").forEach((b) =>
        b.addEventListener("click", async () => {
          if (!confirm("Delete this setup?")) return;
          try {
            await api("/api/setups/" + b.getAttribute("data-id"), { method: "DELETE" });
            toast("Setup deleted");
            loadSetups();
          } catch (e) { toast(e.message, true); }
        }));
    } catch (e) {
      list.innerHTML = '<div class="empty-note">Could not load setups.</div>';
    }
  }

  function showView() {
    const u = window.TLAuth.user;
    $("authView").classList.toggle("hide", !!u);
    $("setupsView").classList.toggle("hide", !u);
    if (u) loadSetups();
  }

  document.querySelectorAll("#authTabs button").forEach((b) =>
    b.addEventListener("click", () => setTab(b.getAttribute("data-tab"))));
  $("authSubmit").addEventListener("click", submit);
  $("password").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  $("email").addEventListener("keydown", (e) => { if (e.key === "Enter") $("password").focus(); });

  setTab(tab);
  // wait for auth check from common.js, then decide which view
  (window.TLAuth.ready || Promise.resolve()).then(showView);
})();
