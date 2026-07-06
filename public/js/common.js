/* ============================================================
   TENSION LAB — shared client runtime (auth + nav + helpers)
   loaded on every page before page-specific scripts
   ============================================================ */
(function () {
  "use strict";

  let favCache = null; // cached favorite ids for the logged-in user

  /* ---------- material palette (mirrors engine/UI colors) ---------- */
  const MAT = {
    gut:      { label: "Natural gut",       hex: "#D8A24A" },
    multi:    { label: "Multifilament",     hex: "#B9BEC2" },
    syn:      { label: "Synthetic gut",     hex: "#8E979A" },
    poly:     { label: "Co-polyester",      hex: "#2E7DB5" },
    polyspin: { label: "Co-poly · shaped",  hex: "#1F9B76" },
    polysoft: { label: "Co-poly · soft",    hex: "#6E5AA6" },
    kevlar:   { label: "Aramid / Kevlar",   hex: "#9A6B2E" },
    zyex:     { label: "Zyex mono",         hex: "#3FB0A0" },
  };

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function api(path, opts) {
    const r = await fetch(path, Object.assign({ headers: { "content-type": "application/json" } }, opts || {}));
    let data = null;
    try { data = await r.json(); } catch (_) {}
    if (!r.ok) throw new Error((data && data.error) || ("Request failed (" + r.status + ")"));
    return data;
  }

  let toastTimer = null;
  function toast(msg, isErr) {
    let el = document.getElementById("toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; document.body.appendChild(el); }
    el.textContent = msg;
    el.className = isErr ? "err show" : "show";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.className = el.className.replace("show", "").trim()), 2600);
  }

  const TL = { MAT, esc, api, toast,
    matLabel: (m) => (MAT[m] ? MAT[m].label : m || "—"),
    matHex: (m) => (MAT[m] ? MAT[m].hex : "#8E979A"),
    priceStr: (n) => (n == null ? "—" : "$" + Number(n).toFixed(Number(n) % 1 ? 2 : 0)),
  };
  window.TL = TL;

  // Loads Google Identity Services and renders a "Sign in with Google" button.
  // No-op (returns false) if GOOGLE_CLIENT_ID isn't configured on the server.
  TL.mountGoogleSignIn = async function (containerId, onSuccess) {
    let cfg;
    try { cfg = await api("/api/config"); } catch (_) { return false; }
    if (!cfg || !cfg.googleClientId) return false;
    await new Promise((res, rej) => {
      if (window.google && window.google.accounts) return res();
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true; s.defer = true; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    }).catch(() => {});
    if (!window.google || !window.google.accounts) return false;
    window.google.accounts.id.initialize({
      client_id: cfg.googleClientId,
      callback: async (resp) => {
        try { await window.TLAuth.google(resp.credential); onSuccess && onSuccess(); }
        catch (e) { toast(e.message || "Google sign-in failed", true); }
      },
    });
    const el = document.getElementById(containerId);
    if (el) window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", width: 320 });
    return true;
  };

  /* ---------- auth state, exposed as window.TLAuth ---------- */
  const TLAuth = {
    user: null,
    ready: null,
    async refresh() {
      try { const d = await api("/api/auth/me"); this.user = d.user; }
      catch (_) { this.user = null; }
      renderAuth();
      return this.user;
    },
    async login(email, password) {
      const d = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      this.user = d.user; renderAuth(); return d.user;
    },
    async register(email, password) {
      const d = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) });
      this.user = d.user; renderAuth(); return d.user;
    },
    async logout() {
      await api("/api/auth/logout", { method: "POST" });
      this.user = null; renderAuth();
    },
    async google(credential) {
      const d = await api("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) });
      this.user = d.user; renderAuth(); return d.user;
    },
  };
  window.TLAuth = TLAuth;

  /* ---------- nav / auth chrome ---------- */
  function renderAuth() {
    favCache = null; // auth changed -> favorites cache is stale
    const box = document.getElementById("siteAuth");
    if (!box) return;
    const u = TLAuth.user;
    if (!u) {
      box.innerHTML = '<a class="btn ghost sm" href="/account.html">Log in</a>' +
                      '<a class="btn sm" href="/account.html?tab=register">Create account</a>';
    } else {
      const admin = u.role === "admin"
        ? '<a class="site-nav-admin btn ghost sm" href="/admin.html">Admin</a>' : "";
      box.innerHTML =
        '<a class="btn sm" href="/account.html">\uD83C\uDFBE Racket Room</a>' +
        admin +
        '<button class="btn ghost sm" id="logoutBtn">Log out</button>';
      const lb = document.getElementById("logoutBtn");
      if (lb) lb.addEventListener("click", async () => {
        await TLAuth.logout(); toast("Logged out"); renderAuth();
      });
    }
  }

  function markActiveNav() {
    const page = document.body.getAttribute("data-page");
    document.querySelectorAll(".site-nav a[data-nav]").forEach((a) => {
      a.classList.toggle("on", a.getAttribute("data-nav") === page);
    });
  }

  // Start the auth check immediately (synchronously) so page scripts that run
  // right after this file can await TLAuth.ready instead of racing it.
  TLAuth.ready = TLAuth.refresh();

  /* ---------- favorites (My Rackets / My Strings) ---------- */
  const TLFav = {
    async ids(force) {
      if (!TLAuth.user) return { rackets: [], strings: [] };
      if (favCache && !force) return favCache;
      try { favCache = await api("/api/favorites/ids"); }
      catch (_) { favCache = { rackets: [], strings: [] }; }
      return favCache;
    },
    async isSaved(kind, id) {
      const ids = await this.ids();
      return (kind === "racket" ? ids.rackets : ids.strings).includes(Number(id));
    },
    // toggles; returns new saved-state (true/false). Guests are sent to login.
    async toggle(kind, id, nextUrl) {
      if (!TLAuth.user) {
        location.href = "/account.html?next=" + encodeURIComponent(nextUrl || location.pathname);
        return null;
      }
      const saved = await this.isSaved(kind, id);
      if (saved) await api("/api/favorites/" + kind + "/" + id, { method: "DELETE" });
      else await api("/api/favorites", { method: "POST", body: JSON.stringify({ kind, item_id: Number(id) }) });
      favCache = null;
      return !saved;
    },
  };
  window.TLFav = TLFav;

  /* ---------- site visitor counter ---------- */
  const hasCookie = (name) => document.cookie.split(";").some((c) => c.trim().startsWith(name + "="));
  async function visitorCounter() {
    let visits = null;
    try {
      if (!hasCookie("tl_v")) {
        document.cookie = "tl_v=1; Path=/; Max-Age=" + (60 * 60 * 6) + "; SameSite=Lax";
        visits = (await api("/api/visit", { method: "POST" })).visits;
      } else {
        visits = (await api("/api/stats")).visits;
      }
    } catch (_) { return; }
    const foot = document.querySelector(".foot-in");
    if (!foot || visits == null) return;
    let el = document.getElementById("visitCount");
    if (!el) { el = document.createElement("div"); el.id = "visitCount"; el.className = "visits"; foot.appendChild(el); }
    el.innerHTML = '<span class="eye">\u{1F441}</span> ' + Number(visits).toLocaleString() + " visits";
  }

  function initChrome() { markActiveNav(); renderAuth(); visitorCounter(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initChrome);
  else initChrome();
})();
