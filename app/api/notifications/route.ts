import { listNotificationsForUser, markNotificationReadForUser } from "../../lib/database";
import { getSmartCareActor } from "../../lib/auth-server";

export async function GET(request:Request){
 const actor=await getSmartCareActor(request);if(!actor?.active)return Response.json({error:"Unauthorized"},{status:401});
 const entityId=new URL(request.url).searchParams.get("entityId")||undefined;
 return Response.json({notifications:await listNotificationsForUser(actor.id,entityId)});
}
export async function POST(request:Request){
 const actor=await getSmartCareActor(request);if(!actor?.active)return Response.json({error:"Unauthorized"},{status:401});
 const body=await request.json() as {id?:number};if(!body.id)return Response.json({error:"Notification id is required"},{status:400});
 return await markNotificationReadForUser(body.id,actor.id)?Response.json({ok:true}):Response.json({error:"Notification not found"},{status:404});
}
