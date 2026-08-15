import fs from "node:fs";
import * as XLSX from "xlsx";

const file = process.argv[2];
if (!file) throw new Error("Usage: node scripts/prepare-google-sheet-assets.mjs <csv-or-xlsx>");

const book = XLSX.read(fs.readFileSync(file), { type: "buffer", raw: false });
const matrix = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, defval: "", raw: false });
const clean = (value) => String(value ?? "").trim();
const key = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const aliases = {
  item_name: "name",
  id_number_code_number: "id",
  code_number: "id",
  model_number: "model",
  serial_number: "serial_number",
  qty: "quantity",
  where_to_find: "location",
  notes_storage_container: "notes",
  link: "source_link",
};

let headers = [];
let lastName = "";
const ids = new Map();
const records = [];

matrix.forEach((raw, index) => {
  const values = raw.map(clean);
  const possibleHeaders = values.map((value) => aliases[key(value)] || key(value));
  if (possibleHeaders.includes("name") && possibleHeaders.includes("category")) {
    headers = possibleHeaders;
    return;
  }
  if (!headers.length || !values.some(Boolean)) return;
  const row = Object.fromEntries(headers.map((header, column) => [header, values[column] || ""]));
  if (row.name) lastName = row.name;
  const hasAssetData = row.category || row.id || row.model || row.serial_number || row.quantity;
  if (!hasAssetData || !lastName) return;
  let id = row.id || `ST5-GS-${String(index + 1).padStart(4, "0")}`;
  const count = (ids.get(id.toLowerCase()) || 0) + 1;
  ids.set(id.toLowerCase(), count);
  if (count > 1) id = `${id}-${String(count).padStart(2, "0")}`;
  const status = row.status || "Setup required";
  const normalizedStatus = status.toUpperCase();
  const condition = /POOR|TO FIX|DAMAGED|BROKEN|OUT OF SERVICE/.test(normalizedStatus)
    ? { tone: "warning", health: 35 }
    : /NEW|NOT OPENED/.test(normalizedStatus)
      ? { tone: "healthy", health: 100 }
      : /GOOD|OPERATIONAL|ACTIVE/.test(normalizedStatus)
        ? { tone: "healthy", health: 90 }
        : { tone: "due", health: 70 };
  records.push({
    id,
    name: lastName,
    category: row.category || "Uncategorized",
    model: row.model || "To be confirmed",
    serial_number: row.serial_number || "Pending",
    status,
    quantity: Math.max(1, Number.parseInt(row.quantity, 10) || 1),
    source_link: row.source_link || "",
    location: row.location || "IBTECHAR_STORE",
    notes: row.notes || "",
    tone: condition.tone,
    health: condition.health,
  });
});

process.stdout.write(JSON.stringify(records));
