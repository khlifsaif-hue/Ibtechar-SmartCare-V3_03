import { applyTrackableSourceEvent } from "../../../lib/project-control";
import { getSmartCareActor } from "../../../lib/auth-server";
import { isPlatformAdministrator } from "../../../lib/database";

export async function POST(request:Request){try{const actor=await getSmartCareActor();if(!actor)return Response.json({error:"Unauthorized"},{status:401});if(!isPlatformAdministrator(actor.role)&&actor.role!=="PROJECT_MANAGER")return Response.json({error:"Project Manager, Admin or CEO access required"},{status:403});return Response.json({item:await applyTrackableSourceEvent(await request.json())})}catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to apply source event"},{status:400})}}
