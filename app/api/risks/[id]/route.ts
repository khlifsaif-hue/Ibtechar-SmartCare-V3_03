import { deleteRisk, updateRisk } from "../../../lib/project-control";
import { hasSmartCarePermission } from "../../../lib/auth-server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await hasSmartCarePermission(request, "project_risks", "edit"))) {
      return Response.json({ error: "Edit permission required" }, { status: 403 });
    }
    const { id } = await params;
    return Response.json({ risk: await updateRisk(id, await request.json()) });
  } catch (error) {
    console.error("PATCH /api/risks/[id] failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to update risk" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await hasSmartCarePermission(request, "project_risks", "delete"))) {
      return Response.json({ error: "Delete permission required" }, { status: 403 });
    }
    const { id } = await params;
    await deleteRisk(id);
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/risks/[id] failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to delete risk" },
      { status: 400 },
    );
  }
}
