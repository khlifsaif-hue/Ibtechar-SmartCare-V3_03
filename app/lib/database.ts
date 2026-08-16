import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import type { AssetRecord } from "./demo-data";

export const USER_ROLES = ["CEO", "ADMIN", "PROJECT_MANAGER", "MANAGER", "FINANCE", "TECHNICIAN", "STAFF", "VIEWER"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const MODULE_ACTIONS = ["view", "create", "edit", "delete", "approve"] as const;
export type ModuleAction = (typeof MODULE_ACTIONS)[number];

export type UserRecord = {
  id: string; name: string; email: string; role: UserRole; department: string;
  jobTitle: string; phone: string; active: boolean; projectIds: string[];
  projectNames: string[]; createdAt: string; updatedAt: string;
};
export type UserWriteInput = Omit<UserRecord, "id" | "projectIds" | "projectNames" | "createdAt" | "updatedAt"> & { projectIds?: string[] };
export type ModuleRecord = { key: string; title: string; path: string; enabled: boolean; sortOrder: number };
export type UserPermissionRecord = { userId: string; moduleKey: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; canApprove: boolean };
export type ProjectAccessRecord = { userId: string; projectId: string; projectName: string; canView: boolean; canCreate: boolean; canEdit: boolean; canApprove: boolean };
export type LocationRecord = { id: number; name: string; projectId: string | null; projectName?: string; active: boolean };
export type PurchaseOrderRecord = { id: string; date: string; supplier: string; equipment: string; equipmentType: "Asset" | "Consumable"; budgetBranch: string; project: string; location: string; quantity: number; unitPrice: number; total: number; status: string; assetCreated: boolean; purchaseRequestId?: string; approvedBy?: string; approvedAt?: string; receivedAt?: string; receivedCondition?: string; receivedManufacturer?: string; receivedModel?: string; receivedSerialNumber?: string; receivedWarrantyUntil?: string };
export type ProjectExpenseRecord = { id: string; projectId: string; projectName: string; budgetBranch: string; expenseType: string; description: string; amount: number; incurredOn: string; status: string; assetId: string | null; createdBy: string | null };
export type ProjectTaskRecord = { id: string; projectId: string; projectName: string; title: string; description: string; priority: "High" | "Medium" | "Normal"; assigneeUserId: string; assigneeName: string; assignedByUserId: string | null; assignedByName: string | null; dueDate: string; status: string; deferReason: string | null; responseNote: string | null; respondedAt: string | null; createdAt: string };
export type AssetImportIssue = { rowNumber: number; assetId: string; message: string };
export type AssetImportPreview = { rowNumber: number; assetId: string; assetName: string; action: "create" | "update"; errors: string[] };

type Row = Record<string, unknown>;
type ImportRow = Record<string, unknown>;

function fail(error: { message?: string } | null, fallback = "Supabase operation failed") {
  if (error) throw new Error(error.message || fallback);
}
function text(value: unknown, fallback = "") { return value == null ? fallback : String(value); }
function num(value: unknown, fallback = 0) { const result = Number(value); return Number.isFinite(result) ? result : fallback; }
function relName(value: unknown) {
  if (Array.isArray(value)) return text((value[0] as Row | undefined)?.name ?? (value[0] as Row | undefined)?.full_name);
  return text((value as Row | null)?.name ?? (value as Row | null)?.full_name);
}
function oneRelation(value: unknown): Row | undefined {
  if (Array.isArray(value)) return value[0] as Row | undefined;
  return value && typeof value === "object" ? value as Row : undefined;
}
export function isPlatformAdministrator(role?: string) { return role === "CEO" || role === "ADMIN"; }
export function canViewMoney(role?: string) { return isPlatformAdministrator(role) || role === "PROJECT_MANAGER" || role === "FINANCE"; }
const PROFILE_SELECT = "*,roles(name),user_project_access(project_id,projects(name))";
function userProjectsFromRow(row: Row) {
  const accessRows = Array.isArray(row.user_project_access) ? row.user_project_access as Row[] : [];
  return {
    projectIds: accessRows.map((access) => text(access.project_id)).filter(Boolean),
    projectNames: accessRows.map((access) => relName(access.projects)).filter(Boolean),
  };
}
function userFromRow(row: Row): UserRecord {
  const projects = userProjectsFromRow(row);
  return {
    id: text(row.id), name: text(row.full_name), email: text(row.email),
    role: (relName(row.roles) || text(row.role) || "VIEWER") as UserRole,
    department: text(row.department), jobTitle: text(row.job_title), phone: text(row.phone),
    active: row.active !== false, projectIds: projects.projectIds, projectNames: projects.projectNames,
    createdAt: text(row.created_at), updatedAt: text(row.updated_at),
  };
}
function projectFromRow(row: Row) {
  const finance = oneRelation(row.project_financials);
  return {
    id: text(row.id), name: text(row.name), manager: text(row.manager),
    approvedBudget: num(finance?.approved_budget), committed: num(finance?.committed), spent: num(finance?.spent),
    financialVisible: Boolean(finance),
    status: text(row.status, "Active"), assets: num(row.asset_count), imageData: row.image_url || null,
  };
}
function assetFromRow(row: Row): AssetRecord {
  const finance = oneRelation(row.asset_financials);
  return {
    id: text(row.id), name: text(row.name), manufacturer: text(row.manufacturer), model: text(row.model),
    serialNumber: text(row.serial_number), category: text(row.category), location: text(row.location),
    installedOn: text(row.installed_on), warrantyUntil: text(row.warranty_until), status: text(row.status),
    tone: text(row.tone, "healthy") as AssetRecord["tone"], health: num(row.health, 100), uptime: num(row.uptime),
    metricLabel: text(row.metric_label), metric: text(row.metric), maintenanceLabel: text(row.maintenance_label),
    maintenance: text(row.maintenance), dataSource: text(row.data_source), connectivity: text(row.connectivity),
    lastSeen: text(row.last_seen), owner: text(row.owner), project: relName(row.projects) || text(row.project),
    acquisitionCost: num(finance?.acquisition_cost), residualValue: num(finance?.residual_value), usefulLifeYears: num(finance?.useful_life_years, 5),
    purchaseDate: text(finance?.purchase_date), imageData: text(row.image_url) || undefined,
    insured: Boolean(finance?.insured), openBox: Boolean(finance?.open_box), damagePercent: num(finance?.damage_percent),
    financialVisible: Boolean(finance),
    warningCount: num(row.warning_count),
    quantity: Math.max(1, num(row.quantity, 1)), notes: text(row.notes), sourceLink: text(row.source_link), purchaseOrderId: text(row.purchase_order_id) || undefined,
  };
}
async function signedUrls(bucket: string, rows: Row[], pathKey = "image_path") {
  const paths = rows.map((row) => text(row[pathKey])).filter(Boolean);
  if (!paths.length) return rows;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600);
  const byPath = new Map((data || []).map((item) => [item.path, item.signedUrl]));
  return rows.map((row) => ({ ...row, image_url: byPath.get(text(row[pathKey])) || null }));
}

export async function listUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select(PROFILE_SELECT).order("full_name");
  fail(error); return (data || []).map((row) => userFromRow(row as Row));
}
export async function listRoleNames() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").select("name").order("name");
  fail(error); return (data || []).map((row) => text(row.name)).filter(Boolean);
}
export async function findUserByEmail(email: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select(PROFILE_SELECT).ilike("email", email).maybeSingle();
  fail(error); return data ? userFromRow(data as Row) : undefined;
}
export async function findUserById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select(PROFILE_SELECT).eq("id", id).maybeSingle();
  fail(error); return data ? userFromRow(data as Row) : undefined;
}
async function roleId(role: UserRole) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").select("id").eq("name", role).single();
  fail(error); if (!data) throw new Error(`Role '${role}' was not found.`); return data.id as number;
}
function defaultProjectAccess(role: UserRole) {
  return {
    can_view: true,
    can_create: !["VIEWER"].includes(role),
    can_edit: ["CEO", "ADMIN", "PROJECT_MANAGER", "MANAGER", "FINANCE", "TECHNICIAN"].includes(role),
    can_approve: ["CEO", "ADMIN", "PROJECT_MANAGER", "FINANCE"].includes(role),
  };
}
async function replaceUserProjectAccess(userId: string, projectIds: string[], role: UserRole, client = createAdminClient()) {
  const ids = [...new Set(projectIds.map(String).map((id) => id.trim()).filter(Boolean))];
  if (ids.length) {
    const { data: validProjects, error: projectError } = await client.from("projects").select("id").in("id", ids);
    fail(projectError);
    if ((validProjects || []).length !== ids.length) throw new Error("One or more selected projects do not exist.");
  }
  const { error: deleteError } = await client.from("user_project_access").delete().eq("user_id", userId);
  fail(deleteError);
  if (!ids.length) return;
  const defaults = defaultProjectAccess(role);
  const { error } = await client.from("user_project_access").insert(ids.map((projectId) => ({ user_id: userId, project_id: projectId, ...defaults })));
  fail(error);
}
export async function createUser(input: UserWriteInput) {
  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, { data: { full_name: input.name }, ...(siteUrl ? { redirectTo: `${siteUrl}/auth/reset-password` } : {}) });
  fail(error); if (!data.user) throw new Error("Supabase did not create the invited user.");
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id, email: input.email.toLowerCase(), full_name: input.name, department: input.department,
    job_title: input.jobTitle, phone: input.phone || "", active: input.active, role_id: await roleId(input.role),
  });
  fail(profileError); await seedPermissionsForUser(data.user.id, input.role, admin);
  await replaceUserProjectAccess(data.user.id, input.projectIds || [], input.role, admin);
  const { data: profile, error: readError } = await admin.from("profiles").select(PROFILE_SELECT).eq("id", data.user.id).single();
  fail(readError); return userFromRow(profile as Row);
}
export async function updateUser(id: string, input: Partial<UserWriteInput>) {
  const admin = createAdminClient();
  const current = await findUserById(id); if (!current) throw new Error("User not found");
  const next = { ...current, ...input };
  const { error } = await admin.from("profiles").update({ full_name: next.name, email: next.email.toLowerCase(), department: next.department, job_title: next.jobTitle, phone: next.phone || "", active: next.active, role_id: await roleId(next.role) }).eq("id", id);
  fail(error); if (input.email) fail((await admin.auth.admin.updateUserById(id, { email: input.email })).error);
  if (input.role) await seedPermissionsForUser(id, next.role, admin);
  if (input.role || input.projectIds) await replaceUserProjectAccess(id, input.projectIds || current.projectIds, next.role, admin);
  const { data, error: readError } = await admin.from("profiles").select(PROFILE_SELECT).eq("id", id).single();
  fail(readError); return userFromRow(data as Row);
}
export async function deleteUser(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id); fail(error); return true;
}

async function seedPermissionsForUser(userId: string, role: UserRole, client = createAdminClient()) {
  const { data, error } = await client.from("app_modules").select("module_key"); fail(error);
  const tech = new Set(["overview","projects","project_dashboard","assets","maintenance","work_orders","inventory","ai_assistant","reports","project_tasks"]);
  const projectManager = new Set(["overview","projects","project_budgets","project_dashboard","assets","maintenance","work_orders","lab_calendar","purchase_requests","spare_parts","reports","project_tasks","project_risks"]);
  const finance = new Set(["overview","projects","project_budgets","project_dashboard","purchase_requests","procurement","depreciation","reports"]);
  const staff = new Set(["overview","projects","project_dashboard","assets","purchase_requests","ai_assistant","reports","project_tasks"]);
  const viewer = new Set(["overview","projects","project_dashboard","assets","reports"]);
  const rows = (data || []).map(({ module_key }) => {
    const full = isPlatformAdministrator(role);
    const canView = full || (role === "PROJECT_MANAGER" && projectManager.has(module_key)) || (role === "MANAGER" && projectManager.has(module_key)) || (role === "TECHNICIAN" && tech.has(module_key)) || (role === "FINANCE" && finance.has(module_key)) || (role === "STAFF" && staff.has(module_key)) || (role === "VIEWER" && viewer.has(module_key));
    const canWrite = full || (["PROJECT_MANAGER","MANAGER"].includes(role) && ["project_dashboard","assets","maintenance","work_orders","purchase_requests","project_tasks","project_risks"].includes(module_key)) || (role === "TECHNICIAN" && ["assets","maintenance","work_orders","inventory","project_tasks"].includes(module_key)) || (role === "FINANCE" && ["projects","purchase_requests","procurement"].includes(module_key)) || (role === "STAFF" && ["purchase_requests","project_tasks"].includes(module_key));
    return { user_id: userId, module_key, can_view: canView, can_create: canWrite, can_edit: canWrite, can_delete: full || (["PROJECT_MANAGER","MANAGER"].includes(role) && ["project_tasks","project_risks"].includes(module_key)), can_approve: full || (["PROJECT_MANAGER","FINANCE"].includes(role) && ["purchase_requests","project_tasks"].includes(module_key)) };
  });
  if (rows.length) fail((await client.from("user_permissions").upsert(rows)).error);
}
export async function importUsers(rows: Row[]) {
  let created = 0, updated = 0, skipped = 0;
  for (const raw of rows) {
    const lower = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]+/g, ""), value]));
    const name = text(lower.name || lower.fullname || `${text(lower.firstname)} ${text(lower.lastname)}`).trim();
    const email = text(lower.email || lower.emailaddress || lower.primaryemail).trim().toLowerCase();
    if (!name || !email) { skipped++; continue; }
    const existing = await findUserByEmail(email);
    if (existing) { await updateUser(existing.id, { name, phone: text(lower.phone || lower.mobile) || existing.phone, department: text(lower.department) || existing.department, jobTitle: text(lower.jobtitle || lower.title) || existing.jobTitle }); updated++; }
    else { await createUser({ name, email, phone: text(lower.phone || lower.mobile), department: text(lower.department), jobTitle: text(lower.jobtitle || lower.title), role: "VIEWER", active: true, projectIds: [] }); created++; }
  }
  return { created, updated, skipped };
}

export async function listModules() {
  const supabase = await createClient(); const { data, error } = await supabase.from("app_modules").select("*").order("sort_order"); fail(error);
  return (data || []).map((row) => ({ key: row.module_key, title: row.title, path: row.path, enabled: row.enabled, sortOrder: row.sort_order })) as ModuleRecord[];
}
export async function upsertModule(input: ModuleRecord) {
  const supabase = await createClient(); const { data, error } = await supabase.from("app_modules").upsert({ module_key: input.key, title: input.title, path: input.path, enabled: input.enabled, sort_order: input.sortOrder }).select().single(); fail(error);
  return { key: data.module_key, title: data.title, path: data.path, enabled: data.enabled, sortOrder: data.sort_order } as ModuleRecord;
}
export async function setModuleEnabled(key: string, enabled: boolean) { const supabase = await createClient(); const { error, count } = await supabase.from("app_modules").update({ enabled }, { count: "exact" }).eq("module_key", key); fail(error); return Boolean(count); }
export async function setModuleOrder(key: string, sortOrder: number) { const supabase = await createClient(); const { error, count } = await supabase.from("app_modules").update({ sort_order: sortOrder }, { count: "exact" }).eq("module_key", key); fail(error); return Boolean(count); }
export async function listUserPermissions(userId: string) {
  const supabase = await createClient(); const { data, error } = await supabase.from("user_permissions").select("*").eq("user_id", userId).order("module_key"); fail(error);
  return (data || []).map((row) => ({ userId: row.user_id, moduleKey: row.module_key, canView: row.can_view, canCreate: row.can_create, canEdit: row.can_edit, canDelete: row.can_delete, canApprove: row.can_approve })) as UserPermissionRecord[];
}
export async function setUserPermission(userId: string, moduleKey: string, input: Partial<UserPermissionRecord>) {
  const supabase = await createClient(); const row = { user_id: userId, module_key: moduleKey, can_view: Boolean(input.canView), can_create: Boolean(input.canCreate), can_edit: Boolean(input.canEdit), can_delete: Boolean(input.canDelete), can_approve: Boolean(input.canApprove) };
  const { error } = await supabase.from("user_permissions").upsert(row); fail(error); return { userId, moduleKey, canView: row.can_view, canCreate: row.can_create, canEdit: row.can_edit, canDelete: row.can_delete, canApprove: row.can_approve };
}
export async function userCan(userId: string, moduleKey: string, action: ModuleAction) {
  const supabase = await createClient(); const column = { view: "can_view", create: "can_create", edit: "can_edit", delete: "can_delete", approve: "can_approve" }[action];
  const { data, error } = await supabase.from("user_permissions").select(column).eq("user_id", userId).eq("module_key", moduleKey).maybeSingle(); fail(error); return Boolean(data?.[column as keyof typeof data]);
}
export async function listUserProjectAccess(userId: string) {
  const supabase = await createClient(); const { data, error } = await supabase.from("user_project_access").select("*,projects(name)").eq("user_id", userId); fail(error);
  return (data || []).map((row) => ({ userId: row.user_id, projectId: row.project_id, projectName: relName(row.projects), canView: row.can_view, canCreate: row.can_create, canEdit: row.can_edit, canApprove: row.can_approve })) as ProjectAccessRecord[];
}
export async function setUserProjectAccess(userId: string, projectId: string, input: Partial<ProjectAccessRecord>) {
  const row = { user_id: userId, project_id: projectId, can_view: Boolean(input.canView), can_create: Boolean(input.canCreate), can_edit: Boolean(input.canEdit), can_approve: Boolean(input.canApprove) };
  const supabase = await createClient(); const { error } = await supabase.from("user_project_access").upsert(row); fail(error); return { canView: row.can_view, canCreate: row.can_create, canEdit: row.can_edit, canApprove: row.can_approve };
}
export async function userProjectCan(userId: string, projectName: string, action: "view" | "create" | "edit" | "approve" = "view") {
  const supabase = await createClient(); const { data: project, error: projectError } = await supabase.from("projects").select("id").ilike("name", projectName).maybeSingle(); fail(projectError); if (!project) return false;
  const column = { view: "can_view", create: "can_create", edit: "can_edit", approve: "can_approve" }[action];
  const { data, error } = await supabase.from("user_project_access").select(column).eq("user_id", userId).eq("project_id", project.id).maybeSingle(); fail(error); return Boolean(data?.[column as keyof typeof data]);
}

export async function listProjects() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select("*,project_financials(*),assets(count)").order("name"); fail(error);
  const rows = await signedUrls("asset-images", (data || []).map((row) => ({ ...row, asset_count: Array.isArray(row.assets) ? num(row.assets[0]?.count) : 0 })) as Row[]);
  return rows.map(projectFromRow);
}
export async function listProjectsForUser(user: Pick<UserRecord, "id" | "role">) {
  if (isPlatformAdministrator(user.role)) return listProjects();
  const supabase = await createClient();
  const { data: accessRows, error: accessError } = await supabase.from("user_project_access").select("project_id").eq("user_id", user.id).eq("can_view", true);
  fail(accessError);
  const projectIds = (accessRows || []).map((row) => text(row.project_id)).filter(Boolean);
  if (!projectIds.length) return [];
  const { data, error } = await supabase.from("projects").select("*,project_financials(*),assets(count)").in("id", projectIds).order("name");
  fail(error);
  const rows = await signedUrls("asset-images", (data || []).map((row) => ({ ...row, asset_count: Array.isArray(row.assets) ? num(row.assets[0]?.count) : 0 })) as Row[]);
  return rows.map(projectFromRow);
}
export async function getProject(id: string) {
  const supabase = await createClient(); const { data, error } = await supabase.from("projects").select("*,project_financials(*),assets(count)").eq("id", id).maybeSingle(); fail(error); if (!data) return undefined;
  const [row] = await signedUrls("asset-images", [{ ...data, asset_count: Array.isArray(data.assets) ? num(data.assets[0]?.count) : 0 } as Row]); return projectFromRow(row);
}
export async function createProject(input: { name: string; manager: string; approvedBudget: number }) {
  const id = crypto.randomUUID();
  const supabase = await createClient(); const { data, error } = await supabase.from("projects").insert({ id, name: input.name, manager: input.manager }).select().single(); fail(error);
  fail((await supabase.from("project_financials").insert({project_id:id,approved_budget:input.approvedBudget})).error);
  const branches = ["Marketing","Equipment","Consumables","Call-off"].map((name) => ({ project_id: id, name })); fail((await supabase.from("budget_branches").insert(branches)).error); return projectFromRow({...data,project_financials:{approved_budget:input.approvedBudget,committed:0,spent:0}} as Row);
}
export async function updateProject(id: string, input: Row) {
  const current = await getProject(id); if (!current) return undefined;
  const update: Row = { name: text(input.name, current.name), manager: text(input.manager, current.manager), status: text(input.status, current.status) };
  if (input.imagePath) update.image_path = text(input.imagePath);
  const supabase = await createClient(); const { data, error } = await supabase.from("projects").update(update).eq("id", id).select().single(); fail(error);
  if(input.approvedBudget != null)fail((await supabase.from("project_financials").upsert({project_id:id,approved_budget:num(input.approvedBudget),committed:current.committed,spent:current.spent})).error);
  return projectFromRow({...data,project_financials:{approved_budget:input.approvedBudget == null?current.approvedBudget:num(input.approvedBudget),committed:current.committed,spent:current.spent}} as Row);
}

export async function listAssets() {
  const supabase = await createClient(); const { data, error } = await supabase.from("assets").select("*,projects(name),asset_financials(*),alerts(count)").is("deleted_at",null).order("name"); fail(error);
  const rows = await signedUrls("asset-images", (data || []).map((row) => ({ ...row, warning_count: Array.isArray(row.alerts) ? num(row.alerts[0]?.count) : 0 })) as Row[]);
  return rows.map(assetFromRow);
}
export async function findAsset(id: string) {
  const supabase = await createClient(); const { data, error } = await supabase.from("assets").select("*,projects(name),asset_financials(*),alerts(count)").eq("id", id).is("deleted_at",null).maybeSingle(); fail(error); if (!data) return undefined;
  const [row] = await signedUrls("asset-images", [{ ...data, warning_count: Array.isArray(data.alerts) ? num(data.alerts[0]?.count) : 0 } as Row]); return assetFromRow(row);
}
async function projectIdByName(project: string) {
  const supabase = await createClient(); const { data, error } = await supabase.from("projects").select("id").ilike("name", project).maybeSingle(); fail(error);
  if (!data) throw new Error(`Project '${project}' does not exist in SmartCare.`); return data.id as string;
}
function importedCondition(status?: string) {
  const normalized = text(status).trim().toUpperCase();
  if (/POOR|TO FIX|DAMAGED|BROKEN|OUT OF SERVICE/.test(normalized)) return { tone: "warning" as const, health: 35 };
  if (/NEW|NOT OPENED/.test(normalized)) return { tone: "healthy" as const, health: 100 };
  if (/GOOD|OPERATIONAL|ACTIVE/.test(normalized)) return { tone: "healthy" as const, health: 90 };
  return { tone: "due" as const, health: 70 };
}
function assetInsert(input: Partial<AssetRecord> & Pick<AssetRecord, "name" | "category">, id = `AST-${Date.now().toString().slice(-8)}`) {
  const today = new Date().toISOString().slice(0, 10);
  const condition = importedCondition(input.status);
  return { id, name: input.name, manufacturer: input.manufacturer || "To be confirmed", model: input.model || "To be confirmed", serial_number: input.serialNumber || "Pending", category: input.category, location: input.location || "IBTECHAR_STORE", quantity: Math.max(1,num(input.quantity,1)), notes: input.notes || "", source_link: input.sourceLink || "", installed_on: input.installedOn || today, warranty_until: input.warrantyUntil || null, status: input.status || "Setup required", tone: input.tone || condition.tone, health: input.health ?? condition.health, uptime: input.uptime ?? 0, metric_label: input.metricLabel || "Monitoring", metric: input.metric || "Pending", maintenance_label: input.maintenanceLabel || "Baseline inspection", maintenance: input.maintenance || "Required", data_source: input.dataSource || "Manual entry", connectivity: input.connectivity || "Not connected", last_seen: null, owner: input.owner || "Technical Services", image_path: undefined };
}
function assetFinance(input:Partial<AssetRecord>,assetId:string,projectId:string){const today=new Date().toISOString().slice(0,10);return{asset_id:assetId,project_id:projectId,acquisition_cost:num(input.acquisitionCost),residual_value:num(input.residualValue),useful_life_years:num(input.usefulLifeYears,5),purchase_date:input.purchaseDate||today,insured:Boolean(input.insured),open_box:Boolean(input.openBox),damage_percent:num(input.damagePercent)}}
export async function createAsset(input: Partial<AssetRecord> & Pick<AssetRecord, "name" | "category">) {
  const projectId=await projectIdByName(input.project || "Ibtechar"),row = { ...assetInsert(input), project_id: projectId };
  const supabase = await createClient(); const { data, error } = await supabase.from("assets").insert(row).select("*,projects(name)").single(); fail(error);const finance=assetFinance(input,row.id,projectId);fail((await supabase.from("asset_financials").insert(finance)).error);return assetFromRow({...data,asset_financials:finance} as Row);
}
export async function updateAsset(id: string, input: Row) {
  const current = await findAsset(id); if (!current) return undefined;
  const next = { ...current, ...input } as unknown as AssetRecord & { imagePath?: string };
  const normalizedStatus=text(next.status);const statusTone=normalizedStatus==="Operational"?"healthy":normalizedStatus==="Out of service"?"warning":normalizedStatus==="Awaiting commissioning"||normalizedStatus==="Maintenance due"?"due":text(next.tone,"healthy");
  const row: Row = { name: next.name, manufacturer: next.manufacturer, model: next.model, serial_number: next.serialNumber, category: next.category, location: next.location, quantity: Math.max(1,num(next.quantity,1)), notes: next.notes || "", source_link: next.sourceLink || "", installed_on: next.installedOn || null, warranty_until: next.warrantyUntil || null, status: normalizedStatus, tone: statusTone, health: next.health, owner: next.owner, project_id: await projectIdByName(next.project) };
  if (next.imagePath) row.image_path = next.imagePath;
  const supabase = await createClient(); const { data, error } = await supabase.from("assets").update(row).eq("id", id).select("*,projects(name)").single(); fail(error);const finance=assetFinance(next,id,row.project_id as string);if(current.financialVisible)fail((await supabase.from("asset_financials").upsert(finance)).error);await recalculateProjectFinancials(row.project_id as string); return assetFromRow({...data,asset_financials:current.financialVisible?finance:undefined} as Row);
}

export async function archiveAsset(id:string,deletedBy:string){
  const supabase=await createClient();
  const {data,error}=await supabase.from("assets").update({deleted_at:new Date().toISOString(),deleted_by:deletedBy}).eq("id",id).is("deleted_at",null).select("id").maybeSingle();
  fail(error);return Boolean(data);
}

const importAliases: Record<string,string> = { assetid:"asset_id",asset_id:"asset_id",id_number_code_number:"asset_id",code_number:"asset_id",assetname:"asset_name",asset_name:"asset_name",item_name:"asset_name",serialnumber:"serial_number",serial_number:"serial_number",model_number:"model",qty:"quantity",quantity:"quantity",where_to_find:"location",notes_storage_container:"notes",link:"source_link",purchasedate:"purchase_date",purchase_date:"purchase_date",acquisitioncostqar:"acquisition_cost_qar",acquisition_cost_qar:"acquisition_cost_qar",residualvalueqar:"residual_value_qar",residual_value_qar:"residual_value_qar",usefullifeyears:"useful_life_years",useful_life_years:"useful_life_years",warrantyuntil:"warranty_until",warranty_until:"warranty_until" };
function importKey(key: string) { const clean = key.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,""); return importAliases[clean] || clean; }
function importValue(value: unknown) { return value == null ? "" : String(value).trim(); }
function importNumber(value: unknown) { return num(importValue(value).replace(/[^0-9.-]/g,"")); }
function importDate(value: unknown) { const raw=importValue(value); if(!raw)return ""; if(/^\d+(\.\d+)?$/.test(raw)){const date=new Date((Number(raw)-25569)*86400000);return Number.isNaN(date.getTime())?"":date.toISOString().slice(0,10);}const date=new Date(raw);return Number.isNaN(date.getTime())?raw:date.toISOString().slice(0,10); }
function normalizeImportRow(row: ImportRow) { return Object.fromEntries(Object.entries(row).map(([key,value]) => [importKey(key),value])); }
export async function previewAssetImport(rows: ImportRow[]): Promise<AssetImportPreview[]> {
  const [assets, projects] = await Promise.all([listAssets(), listProjects()]); const assetIds = new Set(assets.map((asset) => asset.id.toLowerCase())); const projectNames = new Set(projects.map((project) => project.name.toLowerCase())); const seen = new Set<string>();
  return rows.map((raw,index) => { const row=normalizeImportRow(raw), assetId=importValue(row.asset_id), assetName=importValue(row.asset_name), errors:string[]=[]; if(!assetId)errors.push("asset_id is required");else if(seen.has(assetId.toLowerCase()))errors.push("Duplicate asset_id within this workbook");else seen.add(assetId.toLowerCase()); if(!assetName)errors.push("asset_name is required"); if(!importValue(row.project))errors.push("project is required");else if(!projectNames.has(importValue(row.project).toLowerCase()))errors.push(`Project '${importValue(row.project)}' does not exist in SmartCare`); if(!importValue(row.category))errors.push("category is required"); if(importValue(row.quantity)&&importNumber(row.quantity)<=0)errors.push("quantity must be greater than zero"); if(importValue(row.useful_life_years)&&importNumber(row.useful_life_years)<=0)errors.push("useful_life_years must be greater than zero"); return {rowNumber:index+2,assetId,assetName,action:assetIds.has(assetId.toLowerCase())?"update":"create",errors}; });
}
export async function importAssets(rows: ImportRow[], sourceFileName: string, _createdBy = "SmartCare user") {
  const preview = await previewAssetImport(rows); let created=0,updated=0; const issues:AssetImportIssue[]=[];
  for (let index=0; index<rows.length; index++) { const item=preview[index]; if(item.errors.length){item.errors.forEach(message=>issues.push({rowNumber:item.rowNumber,assetId:item.assetId,message}));continue;} const row=normalizeImportRow(rows[index]); const existing=await findAsset(item.assetId); const input = { name:importValue(row.asset_name), category:importValue(row.category), project:importValue(row.project), manufacturer:importValue(row.manufacturer)||existing?.manufacturer, model:importValue(row.model)||existing?.model, serialNumber:importValue(row.serial_number)||existing?.serialNumber, location:importValue(row.location)||existing?.location, quantity:importNumber(row.quantity)||existing?.quantity||1, notes:importValue(row.notes)||existing?.notes, sourceLink:importValue(row.source_link)||existing?.sourceLink, status:importValue(row.status)||existing?.status, installedOn:importDate(row.installed_on)||importDate(row.purchase_date)||existing?.installedOn, warrantyUntil:importDate(row.warranty_until)||existing?.warrantyUntil, owner:importValue(row.owner)||existing?.owner, acquisitionCost:importNumber(row.acquisition_cost_qar)||existing?.acquisitionCost, residualValue:importNumber(row.residual_value_qar)||existing?.residualValue, usefulLifeYears:importNumber(row.useful_life_years)||existing?.usefulLifeYears, purchaseDate:importDate(row.purchase_date)||existing?.purchaseDate } as Partial<AssetRecord> & Pick<AssetRecord,"name"|"category">; if(existing){await updateAsset(existing.id,input as Row);updated++;}else{const projectId=await projectIdByName(importValue(row.project)),insert={...assetInsert(input,item.assetId),project_id:projectId,data_source:"Excel bulk import"},supabase=await createClient();fail((await supabase.from("assets").insert(insert)).error);fail((await supabase.from("asset_financials").insert(assetFinance(input,item.assetId,projectId))).error);created++;} }
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); await supabase.from("asset_import_batches").insert({source_file_name:sourceFileName,total_rows:rows.length,created_count:created,updated_count:updated,rejected_count:new Set(issues.map(i=>i.rowNumber)).size,created_by:user?.id||null});
  return {created,updated,rejected:new Set(issues.map(i=>i.rowNumber)).size,issues,preview};
}

export async function listLocations(activeOnly = true) {
  const supabase=await createClient(); let query=supabase.from("locations").select("*,projects(name)").order("name"); if(activeOnly)query=query.eq("active",true); const {data,error}=await query;fail(error);
  return (data||[]).map(row=>({id:row.id,name:row.name,projectId:row.project_id,projectName:relName(row.projects),active:row.active})) as LocationRecord[];
}
export async function createLocation(input:Row){const name=text(input.name).trim();if(!name)throw new Error("Location name is required");const supabase=await createClient();const{data,error}=await supabase.from("locations").insert({name,project_id:text(input.projectId)||null,active:input.active!==false}).select().single();fail(error);return {id:data.id,name:data.name,projectId:data.project_id,active:data.active};}
export async function updateLocation(id:number,input:Row){const supabase=await createClient();const{data,error}=await supabase.from("locations").update({name:input.name,project_id:text(input.projectId)||null,active:input.active!==false}).eq("id",id).select().maybeSingle();fail(error);return data?{id:data.id,name:data.name,projectId:data.project_id,active:data.active}:undefined;}

export async function listParts(){const supabase=await createClient();const{data,error}=await supabase.from("spare_parts").select("*").order("name");fail(error);return(data||[]).map(row=>({sku:row.sku,name:row.name,category:row.category,onHand:row.on_hand,reorderPoint:row.reorder_point,unitCost:num(row.unit_cost),location:row.location,linkedAssets:row.linked_assets}));}
export async function createPart(input:Row){const sku=text(input.sku).trim();if(!sku)throw new Error("SKU is required");const supabase=await createClient();const{data,error}=await supabase.from("spare_parts").insert({sku,name:text(input.name),category:text(input.category,"Other"),on_hand:num(input.onHand),reorder_point:num(input.reorderPoint),unit_cost:num(input.unitCost),location:text(input.location),linked_assets:text(input.linkedAssets)}).select().single();fail(error);return{sku:data.sku,name:data.name,category:data.category,onHand:data.on_hand,reorderPoint:data.reorder_point,unitCost:num(data.unit_cost),location:data.location,linkedAssets:data.linked_assets};}
export async function updatePart(sku:string,input:Row){const supabase=await createClient();const{data,error}=await supabase.from("spare_parts").update({name:input.name,category:input.category,on_hand:num(input.onHand),reorder_point:num(input.reorderPoint),unit_cost:num(input.unitCost),location:text(input.location),linked_assets:text(input.linkedAssets)}).eq("sku",sku).select().maybeSingle();fail(error);return data?{sku:data.sku,name:data.name,category:data.category,onHand:data.on_hand,reorderPoint:data.reorder_point,unitCost:num(data.unit_cost),location:data.location,linkedAssets:data.linked_assets}:undefined;}
export async function deletePart(sku:string){const supabase=await createClient();const{error,count}=await supabase.from("spare_parts").delete({count:"exact"}).eq("sku",sku);fail(error);return Boolean(count);}

async function recipientsForRoles(roles:string[]){const supabase=await createClient();const{data,error}=await supabase.from("profiles").select("id,roles!inner(name)").eq("active",true).in("roles.name",roles);fail(error);return(data||[]).map(row=>row.id);}

function poFromRow(row:Row):PurchaseOrderRecord{return{id:text(row.id),date:text(row.po_date),supplier:text(row.supplier),equipment:text(row.equipment),equipmentType:text(row.equipment_type)==="Consumable"?"Consumable":"Asset",budgetBranch:text(row.budget_branch),project:relName(row.projects),location:text(row.location),quantity:num(row.quantity,1),unitPrice:num(row.unit_price),total:num(row.total),status:text(row.status),assetCreated:Boolean(row.asset_created),purchaseRequestId:text(row.purchase_request_id),approvedBy:relName(row.approved_by_profile),approvedAt:text(row.approved_at),receivedAt:text(row.received_at),receivedCondition:text(row.received_condition),receivedManufacturer:text(row.received_manufacturer),receivedModel:text(row.received_model),receivedSerialNumber:text(row.received_serial_number),receivedWarrantyUntil:text(row.received_warranty_until)};}
export async function listPurchaseOrders(){const supabase=await createClient();const{data,error}=await supabase.from("purchase_orders").select("*,projects(name),approved_by_profile:profiles!purchase_orders_approved_by_fkey(full_name)").order("po_date",{ascending:false});fail(error);return(data||[]).map(row=>poFromRow(row as Row));}
export async function createPurchaseOrder(input:Row){const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();const equipmentType=text(input.equipmentType)==="Consumable"?"Consumable":"Asset";const quantity=Math.max(1,num(input.quantity,1)),unitPrice=num(input.unitPrice);const id=text(input.id)||`IBT-PO-${Date.now().toString().slice(-7)}`,projectId=await projectIdByName(text(input.project));const{data,error}=await supabase.from("purchase_orders").insert({id,project_id:projectId,po_date:text(input.date)||new Date().toISOString().slice(0,10),supplier:text(input.supplier,"To be confirmed"),equipment:text(input.equipment),equipment_type:equipmentType,budget_branch:text(input.budgetBranch,equipmentType==="Asset"?"Equipment":"Consumables"),location:text(input.location),quantity,unit_price:unitPrice,status:"Review",purchase_request_id:text(input.purchaseRequestId)||null,created_by:user?.id||null}).select("*,projects(name),approved_by_profile:profiles!purchase_orders_approved_by_fkey(full_name)").single();fail(error);await insertNotifications(await recipientsForRoles(["FINANCE"]),"purchase_order",id,"Purchase order submitted for finance review",`${id} · ${text(input.equipment)} · ${text(input.project)} · QAR ${(quantity*unitPrice).toLocaleString()}.`);await recalculateProjectFinancials(projectId);return poFromRow(data as Row);}

async function createAssetsFromReceivedPo(order:PurchaseOrderRecord){
  if(order.equipmentType!=="Asset"||order.assetCreated||!order.receivedAt)return [];
  const supabase=await createClient(),projectId=await projectIdByName(order.project);
  const inputs=Array.from({length:order.quantity},(_,index)=>{
    const id=`AST-${order.id.replace(/[^A-Z0-9]/gi,"").slice(-6)}-${String(index+1).padStart(2,"0")}`;
    const input={name:order.quantity>1?`${order.equipment} #${index+1}`:order.equipment,category:/3d printer/i.test(order.equipment)?"FDM 3D Printer":"Procured Asset",project:order.project,location:order.location,manufacturer:order.receivedManufacturer||"To be confirmed",model:order.receivedModel||"To be confirmed",serialNumber:order.quantity===1?(order.receivedSerialNumber||"Pending"):(order.receivedSerialNumber?`${order.receivedSerialNumber}-${index+1}`:"Pending"),installedOn:order.receivedAt,warrantyUntil:order.receivedWarrantyUntil,acquisitionCost:order.unitPrice,residualValue:0,usefulLifeYears:5,purchaseDate:order.receivedAt,status:"Operational",health:100};
    return{id,input,row:{...assetInsert(input,id),project_id:projectId,purchase_order_id:order.id,status:"Operational",tone:"healthy",health:100}};
  });
  fail((await supabase.from("assets").upsert(inputs.map(x=>x.row),{onConflict:"id",ignoreDuplicates:true})).error);
  fail((await supabase.from("asset_financials").upsert(inputs.map(x=>assetFinance(x.input,x.id,projectId)),{onConflict:"asset_id"})).error);
  fail((await supabase.from("purchase_orders").update({asset_created:true}).eq("id",order.id)).error);
  for(const x of inputs){await supabase.from("service_events").upsert({id:`EVT-${x.id}-RECEIVED`,asset_id:x.id,type:"Asset Registered",title:"Equipment received and asset registered",performed_by:"Procurement / Technical Services",performed_at:`${order.receivedAt}T12:00:00Z`,notes:`Received from ${order.supplier} via ${order.id}. Condition: ${order.receivedCondition||"Not recorded"}.`},{onConflict:"id"});}
  return inputs.map(x=>x.id);
}

export async function updatePurchaseOrder(id:string,input:Row,approvedBy?:string){const current=(await listPurchaseOrders()).find(order=>order.id===id);if(!current)return undefined;const next={...current,...input};const supabase=await createClient();const quantity=Math.max(1,num(next.quantity,1)),unitPrice=num(next.unitPrice);const requestedStatus=text(input.status);const status=["Review","Approved","Rejected"].includes(requestedStatus)?requestedStatus:current.status;const approvalFields=status==="Approved"&&current.status!=="Approved"?{approved_by:approvedBy||null,approved_at:new Date().toISOString()}:(status==="Rejected"?{approved_by:null,approved_at:null}:{});const{data,error}=await supabase.from("purchase_orders").update({po_date:next.date,supplier:next.supplier,equipment:next.equipment,equipment_type:next.equipmentType,budget_branch:next.budgetBranch,project_id:await projectIdByName(next.project),location:next.location,quantity,unit_price:unitPrice,status,...approvalFields}).eq("id",id).select("*,projects(name),approved_by_profile:profiles!purchase_orders_approved_by_fkey(full_name)").single();fail(error);const order=poFromRow(data as Row);if(data.purchase_request_id)await supabase.from("purchase_requests").update({status:status==="Approved"?"PO approved — awaiting receipt":status==="Rejected"?"PO rejected":"PO in review"}).eq("id",data.purchase_request_id);await notifyProject(data.project_id,"purchase_order",id,`Purchase order ${status.toLowerCase()}`,`${id} is ${status.toLowerCase()}.`);await recalculateProjectFinancials(data.project_id);return order;}

export async function receivePurchaseOrder(id:string,input:Row,receivedBy?:string){
  const current=(await listPurchaseOrders()).find(order=>order.id===id);if(!current)throw new Error("PO not found");
  if(current.status!=="Approved")throw new Error("Only an approved purchase order can be received");
  if(current.equipmentType!=="Asset")throw new Error("This receiving workflow is for asset purchase orders");
  if(current.assetCreated)throw new Error("Assets have already been created for this purchase order");
  const receivedAt=text(input.receivedAt)||new Date().toISOString().slice(0,10),condition=text(input.condition,"New"),manufacturer=text(input.manufacturer),model=text(input.model),serialNumber=text(input.serialNumber),location=text(input.location,current.location),warrantyUntil=text(input.warrantyUntil);
  if(!manufacturer||!model||!serialNumber||!location)throw new Error("Manufacturer, model, serial number and location are required at receiving");
  const supabase=await createClient(),projectId=await projectIdByName(current.project);
  const{data,error}=await supabase.from("purchase_orders").update({status:condition==="Received damaged"?"Received damaged":"Received",received_at:receivedAt,received_condition:condition,received_by:receivedBy||null,received_manufacturer:manufacturer,received_model:model,received_serial_number:serialNumber,received_warranty_until:warrantyUntil||null,location}).eq("id",id).select("*,projects(name),approved_by_profile:profiles!purchase_orders_approved_by_fkey(full_name)").single();fail(error);
  const order=poFromRow(data as Row);const assetIds=await createAssetsFromReceivedPo(order);
  if(data.purchase_request_id)await supabase.from("purchase_requests").update({status:"Received — asset registered"}).eq("id",data.purchase_request_id);
  await notifyProject(projectId,"purchase_order",id,"Equipment received",`${order.equipment} received under ${id}; asset registered.`);await recalculateProjectFinancials(projectId);
  return{order:{...order,assetCreated:true},assetIds};
}

export async function deletePurchaseOrder(id:string){const supabase=await createClient();await supabase.from("purchase_requests").update({purchase_order_id:null}).eq("purchase_order_id",id);const{error,count}=await supabase.from("purchase_orders").delete({count:"exact"}).eq("id",id);fail(error);return Boolean(count);}

function prFromRow(row:Row){return{id:text(row.id),date:text(row.request_date),project:relName(row.project),fundingProject:relName(row.funding_project),reason:text(row.reason),budgetBranch:text(row.budget_branch),amount:num(row.amount),description:text(row.description),requester:text(row.requester),status:text(row.status),purchaseOrderId:text(row.purchase_order_id)||null,proformaInvoicePath:text(row.proforma_invoice_path)||undefined,proformaInvoiceName:text(row.proforma_invoice_name)||undefined,proformaInvoiceUrl:text(row.proforma_invoice_url)||undefined};}
export async function listPurchaseRequests(){const supabase=await createClient();const{data,error}=await supabase.from("purchase_requests").select("*,project:projects!purchase_requests_project_id_fkey(name),funding_project:projects!purchase_requests_funding_project_id_fkey(name)").order("request_date",{ascending:false});fail(error);const rows=data||[];const paths=rows.map(row=>text(row.proforma_invoice_path)).filter(Boolean);const urls=new Map<string,string>();if(paths.length){const{data:signed}=await supabase.storage.from("purchase-order-pdfs").createSignedUrls(paths,3600);for(const item of signed||[])if(item.path&&item.signedUrl)urls.set(item.path,item.signedUrl)}return rows.map(row=>prFromRow({...row,proforma_invoice_url:urls.get(text(row.proforma_invoice_path))||""} as Row));}
export async function createPurchaseRequest(input:Row){const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Authentication required");const id=text(input.id)||`IBT-PR-${Date.now().toString().slice(-7)}`,projectId=await projectIdByName(text(input.project)),fundingId=await projectIdByName(text(input.fundingProject||input.project));const{data,error}=await supabase.from("purchase_requests").insert({id,project_id:projectId,funding_project_id:fundingId,request_date:text(input.date)||new Date().toISOString().slice(0,10),reason:text(input.reason),budget_branch:text(input.budgetBranch,"Equipment"),amount:num(input.amount),description:text(input.description),requester:text(input.requester),requester_user_id:user.id,status:text(input.status,"Submitted"),proforma_invoice_path:text(input.proformaInvoicePath)||null,proforma_invoice_name:text(input.proformaInvoiceName)||null}).select("*,project:projects!purchase_requests_project_id_fkey(name),funding_project:projects!purchase_requests_funding_project_id_fkey(name)").single();fail(error);await notifyProject(projectId,"purchase_request",id,"New purchase request",`${id} submitted for ${text(input.project)}.`);await recalculateProjectFinancials(projectId);return prFromRow(data as Row);}
async function createPurchaseOrderFromApprovedRequest(request:ReturnType<typeof prFromRow>){
  if(request.purchaseOrderId)return request.purchaseOrderId;
  const equipmentType=request.budgetBranch.toLowerCase()==="consumables"?"Consumable":"Asset";
  const order=await createPurchaseOrder({
    purchaseRequestId:request.id,project:request.project,date:request.date,
    supplier:"To be confirmed",equipment:request.reason||request.description||"Purchase request item",
    equipmentType,budgetBranch:request.budgetBranch||"Equipment",location:"IBTECHAR_STORE",
    quantity:1,unitPrice:request.amount,
  });
  const supabase=await createClient();
  fail((await supabase.from("purchase_requests").update({purchase_order_id:order.id,status:"Approved — PO ready for procurement"}).eq("id",request.id)).error);
  await notifyProject(await projectIdByName(request.project),"purchase_order",order.id,"Purchase order ready for procurement",`${order.id} was created from approved request ${request.id}.`);
  return order.id;
}
export async function updatePurchaseRequest(id:string,input:Row,approvedBy?:string){const current=(await listPurchaseRequests()).find(item=>item.id===id);if(!current)return undefined;const decision=text(input.decision).toLowerCase();const decisionStatus=decision==="approved"?"Approved":decision==="rejected"?"Rejected":text(input.status||current.status);const next={...current,...input,status:decisionStatus};const supabase=await createClient();const requestUpdate={project_id:await projectIdByName(next.project),funding_project_id:await projectIdByName(next.fundingProject),reason:next.reason,budget_branch:next.budgetBranch,amount:num(next.amount),description:next.description,requester:next.requester,status:decisionStatus,...(decision==="approved"?{approved_by:approvedBy||null,approved_at:new Date().toISOString()}:{})};const{data,error}=await supabase.from("purchase_requests").update(requestUpdate).eq("id",id).select("*,project:projects!purchase_requests_project_id_fkey(name),funding_project:projects!purchase_requests_funding_project_id_fkey(name)").single();fail(error);const saved=data as Row;let orderId=text(saved.purchase_order_id);if(decision==="approved")orderId=await createPurchaseOrderFromApprovedRequest(prFromRow(saved));await notifyProject(text(saved.project_id),"purchase_request",id,`Purchase request ${decision||"updated"}`,`${id} status changed to ${decisionStatus}.`);await recalculateProjectFinancials(text(saved.project_id));const updated=prFromRow({...saved,purchase_order_id:orderId} as Row);return{request:updated,purchaseOrderId:orderId};}

function notificationLink(type:string,id:string){if(type.includes("work_order"))return`/work-orders?open=${encodeURIComponent(id)}`;if(type==="purchase_order")return`/procurement?open=${encodeURIComponent(id)}`;if(type==="purchase_request")return`/purchase-requests?open=${encodeURIComponent(id)}`;if(type==="project_task")return`/tasks?open=${encodeURIComponent(id)}`;if(type==="asset")return`/assets/${encodeURIComponent(id)}`;return"/";}
async function insertNotifications(userIds:string[],entityType:string,entityId:string,title:string,message:string){if(!userIds.length)return;const supabase=await createClient();fail((await supabase.from("notifications").insert(userIds.map(user_id=>({user_id,entity_type:entityType,entity_id:entityId,title,message})))).error);}
async function notifyProject(projectId:string,entityType:string,entityId:string,title:string,message:string){const supabase=await createClient();const{data,error}=await supabase.from("user_project_access").select("user_id").eq("project_id",projectId).eq("can_view",true);fail(error);await insertNotifications((data||[]).map(row=>row.user_id),entityType,entityId,title,message);}
export async function listNotificationsForUser(userId:string,entityId?:string){const supabase=await createClient();let query=supabase.from("notifications").select("*").eq("user_id",userId).order("created_at",{ascending:false}).limit(100);if(entityId)query=query.eq("entity_id",entityId);const{data,error}=await query;fail(error);return(data||[]).map(row=>({id:row.id,entityType:row.entity_type,entityId:row.entity_id,title:row.title,message:row.message,readAt:row.read_at,createdAt:row.created_at,link:notificationLink(row.entity_type,row.entity_id)}));}
export async function markNotificationReadForUser(id:number,userId:string){const supabase=await createClient();const{error,count}=await supabase.from("notifications").update({read_at:new Date().toISOString()},{count:"exact"}).eq("id",id).eq("user_id",userId);fail(error);return Boolean(count);}

export async function listProjectExpenses(projectName?:string){const supabase=await createClient();let query=supabase.from("project_expenses").select("*,projects(name),profiles(full_name)").order("incurred_on",{ascending:false});if(projectName){const projectId=await projectIdByName(projectName);query=query.eq("project_id",projectId);}const{data,error}=await query;fail(error);return(data||[]).map(row=>({id:row.id,projectId:row.project_id,projectName:relName(row.projects),budgetBranch:row.budget_branch,expenseType:row.expense_type,description:row.description,amount:num(row.amount),incurredOn:row.incurred_on,status:row.status,assetId:row.asset_id,createdBy:relName(row.profiles)})) as ProjectExpenseRecord[];}
export async function createProjectExpense(input:Row,actor?:UserRecord){const projectId=text(input.projectId),project=await getProject(projectId);if(!project)throw new Error("A valid project is required");const amount=num(input.amount);if(amount<=0)throw new Error("Expense amount must be greater than zero");const supabase=await createClient(),id=`EXP-${Date.now().toString().slice(-8)}`,expenseType=text(input.expenseType,"Consumable"),incurredOn=text(input.incurredOn)||new Date().toISOString().slice(0,10);let assetId:string|null=null;if(expenseType==="Asset"){const asset=await createAsset({name:text(input.assetName||input.description,"New project asset"),category:text(input.assetCategory,"Procured Asset"),project:project.name,location:text(input.location,"IBTECHAR_STORE"),acquisitionCost:amount,residualValue:num(input.residualValue),usefulLifeYears:num(input.usefulLifeYears,5),purchaseDate:incurredOn,owner:text(input.owner,"Technical Services")});assetId=asset.id;await notifyProject(projectId,"asset",asset.id,"Asset added from project expense",`${asset.name} was recorded under ${project.name}.`);}const{data,error}=await supabase.from("project_expenses").insert({id,project_id:projectId,budget_branch:text(input.budgetBranch,"Consumables"),expense_type:expenseType,description:text(input.description,expenseType),amount,incurred_on:incurredOn,status:text(input.status,"Recorded"),asset_id:assetId,created_by:actor?.id||null}).select("*,projects(name),profiles(full_name)").single();fail(error);await recalculateProjectFinancials(projectId);return{id:data.id,projectId:data.project_id,projectName:relName(data.projects),budgetBranch:data.budget_branch,expenseType:data.expense_type,description:data.description,amount:num(data.amount),incurredOn:data.incurred_on,status:data.status,assetId:data.asset_id,createdBy:relName(data.profiles)} as ProjectExpenseRecord;}

function taskFromRow(row:Row):ProjectTaskRecord{return{id:text(row.id),projectId:text(row.project_id),projectName:relName(row.projects),title:text(row.title),description:text(row.description),priority:text(row.priority,"Normal") as ProjectTaskRecord["priority"],assigneeUserId:text(row.assignee_user_id),assigneeName:relName(row.assignee),assignedByUserId:row.assigned_by_user_id?text(row.assigned_by_user_id):null,assignedByName:relName(row.assigner)||null,dueDate:text(row.due_date),status:text(row.status),deferReason:row.defer_reason?text(row.defer_reason):null,responseNote:row.response_note?text(row.response_note):null,respondedAt:row.responded_at?text(row.responded_at):null,createdAt:text(row.created_at)};}
const taskSelect="*,projects(name),assignee:profiles!project_tasks_assignee_user_id_fkey(full_name),assigner:profiles!project_tasks_assigned_by_user_id_fkey(full_name)";
export async function listProjectTasks(filters:{projectName?:string;userId?:string}={}){const supabase=await createClient();let query=supabase.from("project_tasks").select(taskSelect).order("due_date");if(filters.projectName)query=query.eq("project_id",await projectIdByName(filters.projectName));if(filters.userId)query=query.eq("assignee_user_id",filters.userId);const{data,error}=await query;fail(error);return(data||[]).map(row=>taskFromRow(row as Row));}
export async function createProjectTask(input:Row,actor:UserRecord){const projectId=text(input.projectId),assigneeUserId=text(input.assigneeUserId);if(!projectId||!assigneeUserId)throw new Error("Project and assignee are required");const project=await getProject(projectId),assignee=await findUserById(assigneeUserId);if(!project||!assignee?.active)throw new Error("Project or assignee is not available");const dueDate=text(input.dueDate);if(!dueDate)throw new Error("Due date is required");const id=`TSK-${Date.now().toString().slice(-8)}`,priority=["High","Medium","Normal"].includes(text(input.priority))?text(input.priority):"Normal",supabase=await createClient();const{data,error}=await supabase.from("project_tasks").insert({id,project_id:projectId,title:text(input.title),description:text(input.description),priority,assignee_user_id:assigneeUserId,assigned_by_user_id:actor.id,due_date:dueDate,status:"Pending"}).select(taskSelect).single();fail(error);await supabase.from("project_task_updates").insert({task_id:id,actor_user_id:actor.id,event_type:"Assigned",note:text(input.description)});await insertNotifications([assigneeUserId],"project_task",id,"New project task assigned",`${project.name} · ${text(input.title)} · due ${dueDate}.`);return taskFromRow(data as Row);}
export async function respondToProjectTask(id:string,input:Row,actor:UserRecord){const current=(await listProjectTasks()).find(task=>task.id===id);if(!current)return undefined;if(current.assigneeUserId!==actor.id&&!isPlatformAdministrator(actor.role))throw new Error("Only the assigned employee can respond to this task");const action=text(input.action),status=action==="accept"?"Accepted":action==="defer"?"Deferred":action==="complete"?"Completed":"";if(!status)throw new Error("Choose accept, defer, or complete");const note=text(input.note).trim();if(status==="Deferred"&&!note)throw new Error("A reason is required when postponing a task");const supabase=await createClient();const{data,error}=await supabase.from("project_tasks").update({status,defer_reason:status==="Deferred"?note:null,response_note:note||null,responded_at:new Date().toISOString()}).eq("id",id).select(taskSelect).single();fail(error);await supabase.from("project_task_updates").insert({task_id:id,actor_user_id:actor.id,event_type:status,note:note||null});if(current.assignedByUserId)await insertNotifications([current.assignedByUserId],"project_task",id,`Task ${status.toLowerCase()}`,`${current.assigneeName} ${status.toLowerCase()} “${current.title}”.${note?` Note: ${note}`:""}`);return taskFromRow(data as Row);}

export async function listProjectActivities(project?:string){const supabase=await createClient();let query=supabase.from("project_activities").select("*,projects(name)").order("activity_date",{ascending:false});if(project)query=query.eq("project_id",await projectIdByName(project));const{data,error}=await query;fail(error);return(data||[]).map(row=>({id:row.id,project:relName(row.projects),type:row.type,title:row.title,date:row.activity_date,quantity:row.quantity,school:row.school,status:row.status}));}
export async function createProjectActivity(input:Row){const supabase=await createClient(),id=text(input.id)||`ACT-${Date.now()}`;const{data,error}=await supabase.from("project_activities").insert({id,project_id:await projectIdByName(text(input.project)),type:text(input.type,"Workshop"),title:text(input.title),activity_date:text(input.date)||new Date().toISOString().slice(0,10),quantity:num(input.quantity,1),school:text(input.school),status:text(input.status,"Completed")}).select("*,projects(name)").single();fail(error);return{id:data.id,project:relName(data.projects),type:data.type,title:data.title,date:data.activity_date,quantity:data.quantity,school:data.school,status:data.status};}

function workOrderFromRow(row:Row){return{id:text(row.id),assetId:text(row.asset_id),maintenanceTaskId:row.maintenance_task_id?text(row.maintenance_task_id):null,diagnosticSessionId:row.diagnostic_session_id?num(row.diagnostic_session_id):null,title:text(row.title),description:text(row.description),status:text(row.status),priority:text(row.priority),assignee:text(row.assignee),dueDate:text(row.due_date),scheduledStart:text(row.scheduled_start),startedAt:row.started_at?text(row.started_at):null,cancelledAt:row.cancelled_at?text(row.cancelled_at):null,completedAt:row.completed_at?text(row.completed_at):null,completionWork:text(row.completion_work),resolution:text(row.resolution),completionTechnician:text(row.completion_technician),completionPartNote:text(row.completion_part_note),createdAt:text(row.created_at),updatedAt:text(row.updated_at),assetName:relName(row.assets),assetModel:Array.isArray(row.assets)?text((row.assets[0] as Row)?.model):text((row.assets as Row|null)?.model)};}
export async function listWorkOrders(){const supabase=await createClient();const{data,error}=await supabase.from("work_orders").select("*,assets(name,model)").order("created_at",{ascending:false});fail(error);return(data||[]).map(row=>workOrderFromRow(row as Row));}
export async function getWorkOrder(id:string){const supabase=await createClient();const{data,error}=await supabase.from("work_orders").select("*,assets(name,model)").eq("id",id).maybeSingle();fail(error);return data?workOrderFromRow(data as Row):undefined;}
async function recipientsForAssignee(assignee:string){const supabase=await createClient();const{data,error}=await supabase.from("profiles").select("id").eq("active",true).or(`full_name.ilike.${assignee},email.ilike.${assignee}`);fail(error);if(data?.length)return data.map(row=>row.id);const{data:managers,error:managerError}=await supabase.from("profiles").select("id,roles!inner(name)").in("roles.name",["CEO","ADMIN","PROJECT_MANAGER"]);fail(managerError);return(managers||[]).map(row=>row.id);}
export async function createWorkOrder(input:Row){const now=new Date(),stamp=now.getTime().toString().slice(-8),id=text(input.id)||`WO-${stamp}`,taskId=text(input.maintenanceTaskId)||`MT-${stamp}`,assetId=text(input.assetId),title=text(input.title),dueDate=text(input.dueDate)||now.toISOString().slice(0,10),scheduledStart=text(input.scheduledStart)||`${dueDate}T09:00:00Z`,assignee=text(input.assignee,"Unassigned"),supabase=await createClient();fail((await supabase.from("maintenance_tasks").upsert({id:taskId,asset_id:assetId,title,cadence:text(input.cadence,"One-off"),next_due:dueDate,status:"Upcoming",source:text(input.source,"Lab calendar / Work Order Control")},{onConflict:"id"})).error);const{data,error}=await supabase.from("work_orders").insert({id,asset_id:assetId,maintenance_task_id:taskId,diagnostic_session_id:input.diagnosticSessionId?num(input.diagnosticSessionId):null,title,description:text(input.description),status:"Scheduled",priority:text(input.priority,"Normal"),assignee,due_date:dueDate,scheduled_start:scheduledStart}).select("*,assets(name,model)").single();fail(error);const asset=await findAsset(assetId);await insertNotifications(await recipientsForAssignee(assignee),"work_order",id,"New maintenance task assigned",`${asset?.name||assetId} · ${title} · scheduled ${dueDate}.`);return workOrderFromRow(data as Row);}
export async function updateWorkOrder(id:string,input:Row){const current=await getWorkOrder(id);if(!current)return undefined;if((text(input.status).toLowerCase()==="completed"||input.complete===true)&&!text(input.resolution).trim())throw new Error("Resolution is required to complete a work order");const next={...current,...input},now=new Date().toISOString(),startedAt=input.start===true&&!current.startedAt?now:next.startedAt||null,isComplete=text(input.status).toLowerCase()==="completed"||input.complete===true,completedAt=isComplete?(current.completedAt||now):current.completedAt||null,cancelledAt=text(next.status).toLowerCase()==="cancelled"?(next.cancelledAt||now):null,supabase=await createClient();const status=isComplete?"Completed":text(next.status);const completion={completed_at:completedAt,completion_work:isComplete?text(input.completionWork):current.completionWork,resolution:isComplete?text(input.resolution):current.resolution,completion_technician:isComplete?text(input.completionTechnician,current.assignee):current.completionTechnician,completion_part_note:isComplete?text(input.completionPartNote):current.completionPartNote};const{data,error}=await supabase.from("work_orders").update({title:next.title,description:next.description,status,priority:next.priority,assignee:next.assignee,due_date:next.dueDate,scheduled_start:next.scheduledStart,started_at:startedAt,cancelled_at:cancelledAt,...completion}).eq("id",id).select("*,assets(name,model)").single();fail(error);if(next.maintenanceTaskId)await supabase.from("maintenance_tasks").update({title:next.title,next_due:next.dueDate,status:isComplete?"Completed":cancelledAt?"Cancelled":startedAt?"In progress":"Upcoming"}).eq("id",next.maintenanceTaskId);if(input.start===true&&!current.startedAt)await supabase.from("service_events").insert({id:`EVT-${id}-STARTED`,asset_id:current.assetId,type:"Repair Started",title:`Repair started · ${current.title}`,performed_by:next.assignee,performed_at:startedAt,notes:text(next.description)});if(isComplete){await supabase.from("service_events").upsert({id:`EVT-${id}-COMPLETED`,asset_id:current.assetId,type:"Repair Completed",title:`Repair completed · ${current.title}`,performed_by:text(input.completionTechnician,current.assignee),performed_at:completedAt,notes:`${text(input.resolution)}${text(input.completionPartNote)?` · Part/note: ${text(input.completionPartNote)}`:""}`},{onConflict:"id"});fail((await supabase.from("assets").update({status:"Operational",tone:"healthy",health:100}).eq("id",current.assetId)).error);}const order=workOrderFromRow(data as Row);await insertNotifications(await recipientsForAssignee(order.assignee),"work_order",id,`Work order ${order.status}`,`${order.assetName} · ${order.title} · ${order.status} · due ${order.dueDate}.`);return order;}

export async function cancelWorkOrder(id:string){return updateWorkOrder(id,{status:"Cancelled"});}
export async function listMaintenanceTasks(){const supabase=await createClient();const{data,error}=await supabase.from("maintenance_tasks").select("*,assets(name),work_orders(id)").order("next_due");fail(error);return(data||[]).map(row=>({id:row.id,assetId:row.asset_id,title:row.title,cadence:row.cadence,nextDue:row.next_due,status:row.status,source:row.source,workOrderId:Array.isArray(row.work_orders)?row.work_orders[0]?.id:null,assetName:relName(row.assets)}));}
export async function assetBundle(id:string){const supabase=await createClient();const[asset,tasks,orders,events,alerts,rawAsset,diagnostics]=await Promise.all([findAsset(id),supabase.from("maintenance_tasks").select("*,work_orders(id)").eq("asset_id",id),supabase.from("work_orders").select("*,assets(name,model)").eq("asset_id",id),supabase.from("service_events").select("*").eq("asset_id",id),supabase.from("alerts").select("*").eq("asset_id",id).eq("resolved",false),supabase.from("assets").select("purchase_order_id").eq("id",id).maybeSingle(),supabase.from("diagnostic_sessions").select("id,observed_symptom,result_json,created_at").eq("asset_id",id).order("created_at")]);fail(tasks.error);fail(orders.error);fail(events.error);fail(alerts.error);fail(rawAsset.error);fail(diagnostics.error);let purchaseOrder=null;if(rawAsset.data?.purchase_order_id){const po=await supabase.from("purchase_orders").select("id,po_date,supplier,equipment,total,status,received_at,received_condition,received_manufacturer,received_model,received_serial_number,received_warranty_until").eq("id",rawAsset.data.purchase_order_id).maybeSingle();fail(po.error);purchaseOrder=po.data;}return{asset:asset?{...asset,purchaseOrderId:rawAsset.data?.purchase_order_id||undefined}:asset,purchaseOrder,tasks:(tasks.data||[]).map(row=>({id:row.id,assetId:row.asset_id,title:row.title,cadence:row.cadence,nextDue:row.next_due,status:row.status,source:row.source,workOrderId:Array.isArray(row.work_orders)?row.work_orders[0]?.id:null})),orders:(orders.data||[]).map(row=>workOrderFromRow(row as Row)),events:(events.data||[]).map(row=>({id:row.id,assetId:row.asset_id,type:row.type,title:row.title,performedBy:row.performed_by,performedAt:row.performed_at,notes:row.notes})),diagnostics:(diagnostics.data||[]).map(row=>({id:row.id,symptom:row.observed_symptom,result:row.result_json,createdAt:row.created_at})),alerts:(alerts.data||[]).map(row=>({id:row.id,assetId:row.asset_id,severity:row.severity,title:row.title,message:row.message,triggeredAt:row.triggered_at}))};}

async function recalculateProjectFinancials(projectId:string){const supabase=await createClient();const[{data:expenses,error:expenseError},{data:requests,error:requestError},{data:orders,error:orderError}]=await Promise.all([supabase.from("project_expenses").select("amount").eq("project_id",projectId),supabase.from("purchase_requests").select("amount,status,purchase_order_id").eq("funding_project_id",projectId),supabase.from("purchase_orders").select("total,status").eq("project_id",projectId)]);fail(expenseError);fail(requestError);fail(orderError);const spent=(expenses||[]).reduce((sum,row)=>sum+num(row.amount),0)+(orders||[]).filter(row=>["received","received damaged","delivered"].includes(text(row.status).toLowerCase())).reduce((sum,row)=>sum+num(row.total),0);const committed=(requests||[]).filter(row=>!row.purchase_order_id&&!['rejected','cancelled'].some(status=>text(row.status).toLowerCase().includes(status))).reduce((sum,row)=>sum+num(row.amount),0)+(orders||[]).filter(row=>!["rejected","received","received damaged","delivered"].includes(text(row.status).toLowerCase())).reduce((sum,row)=>sum+num(row.total),0);const{data:existing,error:readError}=await supabase.from("project_financials").select("approved_budget").eq("project_id",projectId).maybeSingle();fail(readError);if(existing)fail((await supabase.from("project_financials").update({spent,committed}).eq("project_id",projectId)).error);}
export async function databaseStats(){const supabase=await createClient();const [users,assets,projects]=await Promise.all([supabase.from("profiles").select("id",{count:"exact",head:true}),supabase.from("assets").select("id",{count:"exact",head:true}),supabase.from("projects").select("id",{count:"exact",head:true})]);fail(users.error);fail(assets.error);fail(projects.error);return{users:users.count||0,assets:assets.count||0,projects:projects.count||0,tables:"Supabase",path:"PostgreSQL + RLS"};}
