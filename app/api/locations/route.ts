import { createLocation, listLocations } from "../../lib/database";
import { hasSmartCarePermission } from "../../lib/auth-server";
export async function GET(){return Response.json({locations:await listLocations(false)})}
export async function POST(request:Request){try{if(!await hasSmartCarePermission(request,"locations","create"))return Response.json({error:"Location-create permission required"},{status:403});return Response.json({location:await createLocation(await request.json() as Record<string,unknown>)},{status:201})}catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to create location"},{status:400})}}
