"use client";

import { Box, Drill, FileDown, Filter, Plus, Printer, Radiation, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AssetRecord } from "../lib/demo-data";
import { exportReport, type ReportFormat } from "../lib/report-export";

const iconMap = { "FDM 3D Printer": Printer, "CNC Router": Drill, "RF CO₂ Laser Engraver": Radiation };

export default function AssetsPage() {
  const [assets, setAssets] = useState<(AssetRecord&{warningCount?:number})[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [project,setProject]=useState("all"),[location,setLocation]=useState("all"),[warning,setWarning]=useState("all"),[sort,setSort]=useState("status-asc"),[reportFormat,setReportFormat]=useState<ReportFormat>("pdf");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(()=>{fetch("/api/assets").then(r=>r.json()).then((d:{assets?:AssetRecord[]})=>{if(d.assets)setAssets(d.assets)}).catch(()=>{})},[]);

  const filtered = useMemo(() => assets.filter((asset) => {
    const matchesText = `${asset.name} ${asset.id} ${asset.category} ${asset.serialNumber}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || asset.tone === status;
    return matchesText && matchesStatus && (project==="all"||asset.project===project) && (location==="all"||asset.location===location) && (warning==="all"||(warning==="warning"?Number(asset.warningCount||0)>0:Number(asset.warningCount||0)===0));
  }).sort((a,b)=>sort==="status-desc"?b.status.localeCompare(a.status):sort==="health-desc"?b.health-a.health:sort==="health-asc"?a.health-b.health:a.status.localeCompare(b.status)), [assets, query, status,project,location,warning,sort]);
  const projects=useMemo(()=>Array.from(new Set(assets.map(a=>a.project))).sort(),[assets]),locations=useMemo(()=>Array.from(new Set(assets.map(a=>a.location))).sort(),[assets]);

  async function generateReport(){await exportReport({title:"Asset Registry Report",format:reportFormat,columns:[{key:"id",label:"Asset ID"},{key:"name",label:"Equipment"},{key:"project",label:"Project"},{key:"location",label:"Location"},{key:"status",label:"Status"},{key:"health",label:"Health %"},{key:"warningCount",label:"Warnings"}],rows:filtered as unknown as Record<string,unknown>[],meta:{filters:{Status:status,Project:project,Location:location,Warning:warning,Sort:sort}}})}

  async function registerAsset(formData: FormData) {
    setSaving(true); setMessage("");
    const payload = Object.fromEntries([...formData.entries()].filter(([key])=>key!=="image")) as Record<string,unknown>;
    const image=formData.get("image") as File|null;let imageData="";if(image?.size){const upload=new FormData();upload.set("file",image);upload.set("bucket","asset-images");const response=await fetch("/api/storage/upload",{method:"POST",body:upload}),result=await response.json() as {path?:string;signedUrl?:string;error?:string};if(!response.ok)throw new Error(result.error||"Image upload failed");payload.imagePath=result.path;imageData=result.signedUrl||"";}
    try {
      const response = await fetch("/api/assets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("The asset database is still being prepared.");
      const data = await response.json() as { asset: AssetRecord };
      setAssets((current) => [...current, {...data.asset,imageData}]);
      setRegisterOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save asset");
    } finally { setSaving(false); }
  }

  return <main className="dashboard-main section-page">
    <section className="page-heading"><div><p className="eyebrow">Asset registry</p><h1>Equipment & Asset Passports</h1><p className="page-subtitle">Every machine, document, warranty and maintenance record in one place.</p></div><button className="button primary" type="button" onClick={() => setRegisterOpen(true)}><Plus size={18}/> Register asset</button></section>

    <section className="toolbar-card">
      <label className="page-search"><Search size={18}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search by name, ID, serial or category"/></label>
      <label className="filter-select"><Filter size={17}/><select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="healthy">Healthy</option><option value="due">Maintenance due</option><option value="warning">Warning</option></select></label>
      <label className="filter-select"><select value={project} onChange={e=>setProject(e.target.value)}><option value="all">All projects</option>{projects.map(v=><option key={v}>{v}</option>)}</select></label>
      <label className="filter-select"><select value={location} onChange={e=>setLocation(e.target.value)}><option value="all">All locations</option>{locations.map(v=><option key={v}>{v}</option>)}</select></label>
      <label className="filter-select"><select value={warning} onChange={e=>setWarning(e.target.value)}><option value="all">All warning states</option><option value="warning">With warning</option><option value="clear">No warning</option></select></label>
      <label className="filter-select"><select value={sort} onChange={e=>setSort(e.target.value)}><option value="status-asc">Status A–Z</option><option value="status-desc">Status Z–A</option><option value="health-desc">Status % high–low</option><option value="health-asc">Status % low–high</option></select></label>
      <label className="filter-select"><select value={reportFormat} onChange={e=>setReportFormat(e.target.value as ReportFormat)}><option value="pdf">PDF</option><option value="xlsx">Excel</option><option value="csv">CSV</option><option value="html">HTML</option></select></label><button className="button secondary" onClick={generateReport}><FileDown size={16}/> Report</button>
      <span className="result-count">{filtered.length} of {assets.length} assets</span>
    </section>

    <section className="registry-grid">
      {filtered.map((asset) => { const Icon = iconMap[asset.category as keyof typeof iconMap] ?? Box; return <Link className="registry-card" href={`/assets/${asset.id}`} key={asset.id}>
        <div className={`registry-visual ${asset.tone}`}>{asset.imageData?<img src={asset.imageData} alt={asset.name}/>:<Icon size={42} strokeWidth={1.4}/>}<span className={`status-dot ${asset.tone}`}/></div>
        <div className="registry-main"><span className="asset-category">{asset.category}</span><h2>{asset.name}</h2><p>{asset.location}</p><div className="registry-meta"><span><small>Asset ID</small><strong>{asset.id}</strong></span><span><small>Model</small><strong>{asset.model}</strong></span></div></div>
        <div className="registry-health"><strong>{asset.health}%</strong><span>Health</span><div><i className={asset.tone} style={{width:`${asset.health}%`}}/></div><em className={asset.tone}>{asset.status}</em></div>
      </Link>})}
      {!filtered.length && <div className="empty-state"><Box size={34}/><h2>No matching assets</h2><p>Try another search or status filter.</p></div>}
    </section>

    {registerOpen && <div className="modal-layer drawer-layer" role="dialog" aria-modal="true" aria-labelledby="register-title"><button className="modal-backdrop" type="button" onClick={()=>setRegisterOpen(false)} aria-label="Close registration form"/><section className="issue-drawer"><div className="drawer-header"><div><p className="eyebrow">Asset onboarding</p><h2 id="register-title">Register new equipment</h2></div><button className="modal-close inline" type="button" onClick={()=>setRegisterOpen(false)} aria-label="Close"><X size={20}/></button></div><form action={registerAsset}>
      <div className="form-grid"><label>Asset name<input name="name" required placeholder="e.g. Bambu Lab printer"/></label><label>Category<select name="category" required><option>FDM 3D Printer</option><option>CNC Router</option><option>RF CO₂ Laser Engraver</option><option>Laser Cutter</option><option>Technical Furniture</option><option>Other Equipment</option></select></label></div>
      <div className="form-grid"><label>Manufacturer<input name="manufacturer" placeholder="Manufacturer"/></label><label>Model<input name="model" placeholder="Exact model"/></label></div>
      <label>Equipment photo<input name="image" type="file" accept="image/jpeg,image/png,image/webp"/></label><label>Serial number<input name="serialNumber" placeholder="Serial number"/></label><label>Location<select name="location" defaultValue="IBTECHAR_STORE"><option>STUDIO 5</option><option>IBTECHAR_OFFICE</option><option>IBTECHAR_STORE</option><option>MCIT</option><option>TEEN_HUT</option></select></label>
      <div className="form-grid"><label>Installation date<input type="date" name="installedOn" defaultValue="2026-08-03"/></label><label>Warranty until<input type="date" name="warrantyUntil"/></label></div>
      <div className="form-grid"><label>Project<select name="project" defaultValue="Ibtechar"><option>Ibtechar</option><option>Sanea</option><option>Studio 5</option><option>DIC</option></select></label><label>Responsible team<input name="owner" defaultValue="Technical Services"/></label></div>
      <div className="form-grid"><label>Acquisition cost (QAR)<input type="number" min="0" name="acquisitionCost" placeholder="0"/></label><label>Residual value (QAR)<input type="number" min="0" name="residualValue" placeholder="0"/></label></div>
      <div className="form-grid"><label>Useful life (years)<input type="number" min="1" name="usefulLifeYears" defaultValue="5"/></label><label>Purchase date<input type="date" name="purchaseDate" defaultValue="2026-08-04"/></label></div>
      {message && <p className="form-error">{message}</p>}
      <button className="button primary full" type="submit" disabled={saving}>{saving ? "Saving asset…" : "Create asset passport"}</button>
    </form></section></div>}
  </main>;
}

