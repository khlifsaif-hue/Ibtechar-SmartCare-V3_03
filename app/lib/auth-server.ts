import { createClient } from "./supabase/server";
import { findUserById, isPlatformAdministrator, type ModuleAction, userCan, userProjectCan } from "./database";

/** Financial approval is deliberately narrower than general module access. */
export function isPurchaseDecisionMaker(role?: string) {
  return role === "CEO" || role === "ADMIN" || role === "FINANCE";
}

export async function getSmartCareActor(_request?: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return undefined;
  return findUserById(data.user.id);
}

export async function hasSmartCarePermission(request: Request, moduleKey: string, action: ModuleAction) {
  const actor = await getSmartCareActor(request);
  if (!actor?.active) return false;
  if (isPlatformAdministrator(actor.role)) return true;
  return userCan(actor.id, moduleKey, action);
}

export async function hasProjectPermission(request: Request, projectName: string, action: "view" | "create" | "edit" | "approve" = "view") {
  const actor = await getSmartCareActor(request);
  if (!actor?.active) return false;
  if (isPlatformAdministrator(actor.role)) return true;
  return userProjectCan(actor.id, projectName, action);
}
