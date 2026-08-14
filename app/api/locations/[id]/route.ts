import { updateLocation } from "../../../lib/database";
import { hasSmartCarePermission } from "../../../lib/auth-server";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){if(!await hasSmartCarePermission(request,"locations","edit"))return Response.json({error:"Location-edit permission required"},{status:403});const {id}=await params;const location=await updateLocation(Number(id),await request.json() as Record<string,unknown>);return location?Response.json({location}):Response.json({error:"Location not found"},{status:404});}
