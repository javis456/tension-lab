/* ============================================================
   Email — Brevo transactional API (HTTPS, serverless-friendly).
   Set BREVO_API_KEY + MAIL_FROM (a verified sender address in Brevo).
   If not configured, verification is skipped (accounts auto-verify)
   so the site keeps working — see DEPLOY.md to turn it on.
   ============================================================ */
const KEY = process.env.BREVO_API_KEY || "";
const FROM = process.env.MAIL_FROM || "";
const FROM_NAME = process.env.MAIL_FROM_NAME || "Tension Lab";
const DRYRUN = process.env.MAIL_DRYRUN === "1"; // log instead of sending (for testing)

const enabled = () => DRYRUN || !!(KEY && FROM);

async function send(to, subject, html) {
  if (DRYRUN) { console.log("[email dry-run] to=" + to + " subject=" + subject); return true; }
  if (!enabled()) throw new Error("Email is not configured.");
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", "api-key": KEY },
    body: JSON.stringify({
      sender: { email: FROM, name: FROM_NAME },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error("Email send failed (" + res.status + "): " + (await res.text()).slice(0, 200));
  return true;
}

function verificationHtml(link) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;color:#1b2b28">
    <h2 style="color:#0B6E5F;margin:0 0 6px">Confirm your email</h2>
    <p style="font-size:15px;line-height:1.5">Welcome to <b>Tension Lab</b> by Mensin Tennis! Please confirm your email address to activate your account.</p>
    <p style="margin:22px 0">
      <a href="${link}" style="background:#0B6E5F;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;display:inline-block">Confirm my email</a>
    </p>
    <p style="font-size:12px;color:#6b7b77;line-height:1.5">If the button doesn't work, paste this link into your browser:<br>${link}</p>
    <p style="font-size:12px;color:#9aa8a4">If you didn't create this account, you can ignore this email.</p>
  </div>`;
}

async function sendVerification(to, link) {
  return send(to, "Confirm your Tension Lab account", verificationHtml(link));
}

module.exports = { enabled, send, sendVerification };
