import { createWorkOrder, findAsset, isPlatformAdministrator, listAssets, listProjectsForUser, listWorkOrders } from "../../lib/database";
import { getSmartCareActor, hasProjectPermission, hasSmartCarePermission } from "../../lib/auth-server";

export async function GET() {
  try {
    const actor=await getSmartCareActor();if(!actor)return Response.json({error:"Unauthorized"},{status:401});
    const allowed=new Set((await listProjectsForUser(actor)).map(p=>String((p as {name:string}).name)));
    const assets=await listAssets();const assetIds=new Set((isPlatformAdministrator(actor.role)?assets:assets.filter(a=>allowed.has(a.project))).map(a=>a.id));
    const orders=await listWorkOrders() as {assetId:string}[];return Response.json({ workOrders: orders.filter(order=>assetIds.has(order.assetId)) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load work orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if(!await hasSmartCarePermission(request,"work_orders","create"))return Response.json({error:"Work-order create permission required"},{status:403});const payload = await request.json() as Record<string, unknown>;
    const assetId = String(payload.assetId ?? "").trim();
    const title = String(payload.title ?? "").trim();
    if (!assetId || !title) return Response.json({ error: "assetId and title are required" }, { status: 400 });
    const asset=await findAsset(assetId);if(!asset||!await hasProjectPermission(request,asset.project,"create"))return Response.json({error:"Project access required"},{status:403});const created = await createWorkOrder({ ...payload, assetId, title });
    return Response.json({ workOrder: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create work order" }, { status: 500 });
  }
}
