/* ============================================================
   CSV parsing for bulk upload.
   A proper state-machine parser (handles quoted fields, commas and
   newlines inside quotes, escaped "" quotes, CRLF) so columns never
   shift. Rows are then mapped to fields BY HEADER NAME (never by
   position), which is what prevents data landing in the wrong field.
   ============================================================ */

// -> array of arrays (raw cells)
function parseRows(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  const s = String(text).replace(/^\uFEFF/, ""); // strip BOM
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.length > 1 || row[0] !== "") rows.push(row); }
  return rows;
}

const norm = (h) => String(h || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

// Parse into objects keyed by a canonical header name.
// aliases: { canonicalKey: [accepted header spellings...] }
// returns { headerMap, records:[{__line, ...canonicalKey:value}], missingRequired:[...] }
function parseToRecords(text, aliases, required) {
  const rows = parseRows(text);
  if (!rows.length) return { headerMap: {}, records: [], headers: [], missingRequired: required.slice() };
  const headers = rows[0];
  // build lookup: normalized header -> index
  const idxByNorm = {};
  headers.forEach((h, i) => { const n = norm(h); if (!(n in idxByNorm)) idxByNorm[n] = i; });
  // resolve each canonical key to a column index via its aliases
  const headerMap = {}; // canonicalKey -> { index, header }
  for (const key in aliases) {
    for (const alias of aliases[key]) {
      const n = norm(alias);
      if (n in idxByNorm) { headerMap[key] = { index: idxByNorm[n], header: headers[idxByNorm[n]] }; break; }
    }
  }
  const missingRequired = required.filter((k) => !(k in headerMap));
  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.every((c) => String(c).trim() === "")) continue; // skip blank lines
    const rec = { __line: r + 1 };
    for (const key in headerMap) rec[key] = (cells[headerMap[key].index] || "").trim();
    records.push(rec);
  }
  return { headerMap, headers, records, missingRequired };
}

module.exports = { parseRows, parseToRecords };
