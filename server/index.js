/* Local development server. On Vercel this file is NOT used —
   the app runs from /api/index.js as a serverless function. */
require("dotenv").config();
const app = require("./app");
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Tension Lab running at http://localhost:${PORT}`));
