import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

/** Returns the branded, validated Excel template used by Bulk Upload Center. */
export async function GET() {
  const filePath = path.join(
    process.cwd(),
    "public",
    "templates",
    "Ibtechar-SmartCare-Assets-Import-Template.xlsx",
  );
  const workbook = await readFile(filePath);

  return new Response(workbook, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=Ibtechar-SmartCare-Assets-Import-Template.xlsx",
      "Cache-Control": "no-store",
    },
  });
}
