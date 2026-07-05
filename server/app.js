/* ============================================================
   Express app — shared by local dev (server/index.js) and by
   the Vercel serverless entry (api/index.js). Exports the app
   itself, which is a valid (req,res) handler for Vercel.
   ============================================================ */
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) =>
  res.json({ ok: true, ai: !!process.env.ANTHROPIC_API_KEY }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api", require("./routes/data"));
app.use("/api/setups", require("./routes/setups"));
app.use("/api/admin", require("./routes/admin"));

// Static files. On Vercel these are served by the platform/CDN from /public,
// so this middleware is really for local `npm start`; it's harmless on Vercel
// because only /api/* is routed to this function.
app.use(express.static(path.join(__dirname, "..", "public")));

// JSON error handler (so a thrown async error returns JSON, not an HTML crash page)
app.use((err, req, res, next) => {
  console.error("[app] error:", err && err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Server error." });
});

module.exports = app;
