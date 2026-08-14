"use client";

import { AlertTriangle, Flag, Pencil, Plus, ShieldAlert, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSmartCareAuth } from "../components/auth-provider";

type Project = { id: string; name: string };
type Person = { id: string; name: string };
type Risk = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "mitigated" | "closed";
  ownerId?: string;
  ownerName: string;
  dueDate?: string;
  createdByName?: string;
  createdAt: string;
};

async function readJson(response: Response) {
  const body = await response.text();
  if (!body) return { error: `${response.status} ${response.statusText || "Empty response"}` };
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return { error: `${response.status} ${response.statusText || "Invalid server response"}` };
  }
}

export default function RisksPage() {
  const { can } = useSmartCareAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<Person[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [projectId, setProjectId] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Risk | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const suffix = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const [riskResponse, optionResponse] = await Promise.all([
      fetch(`/api/risks${suffix}`, { cache: "no-store" }),
      fetch(`/api/project-control-options${suffix}`, { cache: "no-store" }),
    ]);
    const [riskData, optionData] = await Promise.all([readJson(riskResponse), readJson(optionResponse)]);
    if (!riskResponse.ok) throw new Error(String(riskData.error || "Unable to load risks"));
    if (!optionResponse.ok) throw new Error(String(optionData.error || "Unable to load project options"));

    const nextProjects = (optionData.projects || []) as Project[];
    setRisks((riskData.risks || []) as Risk[]);
    setProjects(nextProjects);
    setUsers((optionData.users || []) as Person[]);
    setError("");
    if (!projectId && nextProjects[0]?.id) setProjectId(nextProjects[0].id);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load risks"));
  }, [projectId]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return risks.filter((risk) =>
      (!severity || risk.severity === severity) &&
      (!status || risk.status === status) &&
      (!term || `${risk.title} ${risk.description} ${risk.ownerName}`.toLowerCase().includes(term)),
    );
  }, [risks, search, severity, status]);

  async function createRisk(formData: FormData) {
    const response = await fetch("/api/risks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId,
        title: String(formData.get("title") || ""),
        description: String(formData.get("description") || ""),
        severity: String(formData.get("severity") || "medium"),
        ownerId: String(formData.get("ownerId") || ""),
        dueDate: String(formData.get("dueDate") || ""),
      }),
    });
    const result = await readJson(response);
    if (!response.ok) return setError(String(result.error || "Unable to create risk"));
    setCreateOpen(false);
    await load();
  }

  async function updateRisk(formData: FormData) {
    if (!editing) return;
    const response = await fetch(`/api/risks/${encodeURIComponent(editing.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: String(formData.get("title") || ""),
        description: String(formData.get("description") || ""),
        severity: String(formData.get("severity") || "medium"),
        status: String(formData.get("status") || "open"),
        ownerId: String(formData.get("ownerId") || ""),
        dueDate: String(formData.get("dueDate") || ""),
      }),
    });
    const result = await readJson(response);
    if (!response.ok) return setError(String(result.error || "Unable to update risk"));
    setEditing(null);
    await load();
  }

  async function removeRisk(risk: Risk) {
    if (!window.confirm(`Delete risk “${risk.title}”?`)) return;
    const response = await fetch(`/api/risks/${encodeURIComponent(risk.id)}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await readJson(response);
      return setError(String(result.error || "Unable to delete risk"));
    }
    await load();
  }

  return (
    <main className="dashboard-main section-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Project assurance</p>
          <h1>Risks &amp; Issues</h1>
          <p className="page-subtitle">Register, assign and monitor project risks through mitigation and closure.</p>
        </div>
        {can("project_risks", "create") && <button className="button primary" onClick={() => setCreateOpen(true)}><Plus size={17}/> New risk</button>}
      </section>

      {error && <p className="form-error">{error}</p>}

      <section className="trackable-filterbar">
        <label>Project<select value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label>Severity<select value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="">All</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All</option><option value="open">Open</option><option value="mitigated">Mitigated</option><option value="closed">Closed</option></select></label>
        <label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, details or owner"/></label>
      </section>

      <section className="trackable-summary">
        <Summary icon={<Flag/>} value={visible.filter((risk) => risk.status === "open").length} label="Open risks" tone="warning"/>
        <Summary icon={<ShieldAlert/>} value={visible.filter((risk) => ["high", "critical"].includes(risk.severity) && risk.status === "open").length} label="High / critical" tone="danger"/>
        <Summary icon={<AlertTriangle/>} value={visible.filter((risk) => risk.status === "mitigated").length} label="Mitigated" tone="healthy"/>
      </section>

      <article className="risk-register">
        <header><div><h2>Risk register</h2><p>{visible.length} record(s) in the selected view.</p></div></header>
        <div className="responsive-table"><table><thead><tr><th>Risk</th><th>Project</th><th>Severity</th><th>Owner</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {visible.map((risk) => <tr key={risk.id}>
            <td><strong>{risk.title}</strong><small>{risk.description || "No description"}</small></td>
            <td>{risk.projectName}</td>
            <td><span className={`rag-badge ${risk.severity}`}>{risk.severity}</span></td>
            <td>{risk.ownerName || "Unassigned"}</td>
            <td>{risk.dueDate || "—"}</td>
            <td><span className={`rag-badge ${risk.status === "closed" ? "healthy" : risk.status === "mitigated" ? "blue" : "warning"}`}>{risk.status}</span></td>
            <td>{can("project_risks", "edit") && <button className="text-button" onClick={() => setEditing(risk)}><Pencil size={14}/> Edit</button>}{can("project_risks", "delete") && <button className="text-button danger" onClick={() => removeRisk(risk)}><Trash2 size={14}/> Delete</button>}</td>
          </tr>)}
          {!visible.length && <tr><td colSpan={7} className="empty-row">No risks match the selected filters.</td></tr>}
        </tbody></table></div>
      </article>

      {createOpen && <RiskModal title="Create risk" users={users} close={() => setCreateOpen(false)} submit={createRisk}/>} 
      {editing && <RiskModal title="Update risk" users={users} risk={editing} close={() => setEditing(null)} submit={updateRisk}/>} 
    </main>
  );
}

function Summary({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: string }) {
  return <article className={`summary-chip ${tone}`}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>;
}

function RiskModal({ title, users, risk, close, submit }: { title: string; users: Person[]; risk?: Risk; close: () => void; submit: (formData: FormData) => Promise<void> }) {
  return <div className="modal-layer"><button className="modal-backdrop" onClick={close} aria-label="Close"/><section className="modal-card activity-modal"><button className="modal-close" onClick={close} aria-label="Close"><X size={19}/></button><p className="eyebrow">Risk control</p><h2>{title}</h2><form action={submit}><label>Title<input name="title" defaultValue={risk?.title} required/></label><label>Description<textarea name="description" defaultValue={risk?.description} rows={4}/></label><div className="form-grid"><label>Severity<select name="severity" defaultValue={risk?.severity || "medium"}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>{risk && <label>Status<select name="status" defaultValue={risk.status}><option value="open">Open</option><option value="mitigated">Mitigated</option><option value="closed">Closed</option></select></label>}</div><div className="form-grid"><label>Owner<select name="ownerId" defaultValue={risk?.ownerId || ""}><option value="">Unassigned</option>{users.filter((user) => !user.id.startsWith("group:")).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label>Due date<input name="dueDate" type="date" defaultValue={risk?.dueDate || ""}/></label></div><button className="button primary full">{title}</button></form></section></div>;
}
