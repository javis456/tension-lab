/* Vercel serverless entry.
   vercel.json routes every /api/* request here; Vercel bundles the
   whole Express app into one function. Locally you don't use this file —
   `npm start` runs server/index.js with app.listen instead. */
module.exports = require("../server/app");
