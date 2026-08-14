import { createRisk, listRisks } from "../../lib/project-control";
import { getSmartCareActor, hasSmartCarePermission } from "../../lib/auth-server";

export async function GET(request: Request) {
  try {
    const actor = await getSmartCareActor();
    if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const projectId = new URL(request.url).searchParams.get("projectId") || undefined;
    return Response.json({ risks: await listRisks(projectId) });
  } catch (error) {
    console.error("GET /api/risks failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load risks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getSmartCareActor();
    if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await hasSmartCarePermission(request, "project_risks", "create"))) {
      return Response.json({ error: "Create permission required" }, { status: 403 });
    }

    return Response.json({ risk: await createRisk(await request.json(), actor) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/risks failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to create risk" },
      { status: 400 },
    );
  }
}
