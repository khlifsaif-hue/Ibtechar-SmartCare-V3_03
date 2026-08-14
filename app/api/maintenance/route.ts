import { createWorkOrder, findAsset, isPlatformAdministrator, listAssets, listMaintenanceTasks, listProjectsForUser } from "../../lib/database";
import { getSmartCareActor, hasProjectPermission, hasSmartCarePermission } from "../../lib/auth-server";

export async function GET() {
  try {
    const actor=await getSmartCareActor();if(!actor)return Response.json({error:"Unauthorized"},{status:401});const allowed=new Set((await listProjectsForUser(actor)).map(p=>String((p as {name:string}).name)));const assets=await listAssets();const assetIds=new Set((isPlatformAdministrator(actor.role)?assets:assets.filter(a=>allowed.has(a.project))).map(a=>a.id));const tasks=await listMaintenanceTasks() as {assetId:string}[];return Response.json({ maintenanceTasks: tasks.filter(task=>assetIds.has(String(task.assetId)))});
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load maintenance" }, { status: 500 });
  }
}

export async function POST(request:Request){try{if(!await hasSmartCarePermission(request,"maintenance","create"))return Response.json({error:"Maintenance-create permission required"},{status:403});const body=await request.json() as Record<string,unknown>;if(!String(body.assetId||"")||!String(body.title||""))return Response.json({error:"Asset and work required are mandatory"},{status:400});const asset=await findAsset(String(body.assetId));if(!asset||!await hasProjectPermission(request,asset.project,"create"))return Response.json({error:"Project access required"},{status:403});const workOrder=await createWorkOrder(body);return Response.json({workOrder,maintenanceTasks:await listMaintenanceTasks()},{status:201});}catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to create maintenance task"},{status:400})}}
