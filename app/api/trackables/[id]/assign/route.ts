import { assignTrackable } from "../../../../lib/project-control";
import { hasSmartCarePermission } from "../../../../lib/auth-server";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{if(!await hasSmartCarePermission(request,"project_tasks","edit"))return Response.json({error:"Assignment permission required"},{status:403});const{id}=await params;return Response.json({item:await assignTrackable(id,await request.json())})}catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to assign item"},{status:400})}}
