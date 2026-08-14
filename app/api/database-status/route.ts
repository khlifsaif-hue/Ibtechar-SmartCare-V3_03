import { databaseStats } from "../../lib/database";
export async function GET(){return Response.json(await databaseStats())}
