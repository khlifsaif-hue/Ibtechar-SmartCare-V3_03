import { createPart, listParts } from "../../lib/database";
export async function GET(){return Response.json({parts:await listParts()})}
export async function POST(request:Request){try{const body=await request.json() as Record<string,unknown>;if(!String(body.sku||"").trim()||!String(body.name||"").trim())return Response.json({error:"SKU and part name are required"},{status:400});return Response.json({part:await createPart(body)},{status:201})}catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to create spare part"},{status:400})}}
