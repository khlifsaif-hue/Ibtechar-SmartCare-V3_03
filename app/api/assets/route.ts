import { createAsset, isPlatformAdministrator, listAssets, listProjectsForUser } from "../../lib/database";
import { getSmartCareActor, hasProjectPermission, hasSmartCarePermission } from "../../lib/auth-server";

export async function GET() {
  try {
    const actor=await getSmartCareActor();
    if(!actor)return Response.json({error:"Unauthorized"},{status:401});
    const projects=(await listProjectsForUser(actor)).map(p=>String((p as {name:string}).name));
    const assets=await listAssets();
    return Response.json({ assets: isPlatformAdministrator(actor.role)?assets:assets.filter(asset=>projects.includes(asset.project)) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load assets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if(!await hasSmartCarePermission(request,"assets","create"))return Response.json({error:"Asset-create permission required"},{status:403});
    const payload = await request.json() as Record<string, unknown>;
    const name = String(payload.name ?? "").trim();
    const category = String(payload.category ?? "").trim();
    if (!name || !category) return Response.json({ error: "name and category are required" }, { status: 400 });

    if(!await hasProjectPermission(request,String(payload.project||"Ibtechar"),"create"))return Response.json({error:"Project access required"},{status:403});
    const created = await createAsset({ ...payload, name, category } as Parameters<typeof createAsset>[0]);
    return Response.json({ asset: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to register asset" }, { status: 500 });
  }
}
