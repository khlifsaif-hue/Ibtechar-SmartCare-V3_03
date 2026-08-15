"use client";

import {
  Activity, AlertTriangle, Box, ChevronRight, CircleGauge,
  ClipboardList, Drill, Printer, QrCode, Radiation, ScanLine,
  Sparkles, Wrench, X,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import type { AssetRecord } from "./lib/demo-data";

type DashboardWorkOrder={id:string;title:string;status:string};

const assetIcons = { "FDM 3D Printer": Printer, "CNC Router": Drill, "RF CO₂ Laser Engraver": Radiation };

function HealthRing({ score, tone }: { score: number; tone: string }) {
  return <div className={`health-ring ${tone}`} style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties} aria-label={`Health score ${score}%`}><span>{score}%</span></div>;
}

export default function HomePage() {
  const [assets,setAssets]=useState<AssetRecord[]>([]);
  const demoAssets=assets;
  const [workOrders,setWorkOrders]=useState<DashboardWorkOrder[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord|null>(null);
  useEffect(()=>{Promise.all([fetch("/api/assets",{cache:"no-store"}),fetch("/api/work-orders",{cache:"no-store"})]).then(async([assetsResponse,ordersResponse])=>{const assetData=await assetsResponse.json() as {assets?:AssetRecord[]};const orderData=await ordersResponse.json() as {workOrders?:DashboardWorkOrder[]};setAssets(assetData.assets||[]);setWorkOrders(orderData.workOrders||[])}).catch(()=>{})},[]);
  const warnings=useMemo(()=>assets.filter(asset=>(asset.warningCount||0)>0||asset.tone==="warning").length,[assets]);
  const averageUptime=assets.length?Math.round(assets.reduce((sum,asset)=>sum+asset.uptime,0)/assets.length):0;
  const showQr = (asset = assets[0]) => { if(!asset)return;setSelectedAsset(asset); setQrOpen(true); };

  return <>
    <main className="dashboard-main">
      <section className="page-heading">
        <div><p className="eyebrow">Live asset intelligence</p><h1>Asset Health Overview</h1><div className="sync-line"><span>Supabase workspace · {assets.length} registered assets</span><i/><span className="sync-state"><span/> Live database</span></div></div>
        <div className="heading-actions"><button className="button primary" type="button" onClick={() => showQr()}><ScanLine size={19}/> Scan QR</button><button className="button secondary" type="button" onClick={() => setIssueOpen(true)}><AlertTriangle size={19}/> Report issue</button></div>
      </section>

      <section className="kpi-grid" aria-label="Asset health indicators">
        <article className="kpi-card"><div className="kpi-icon teal"><Box size={25}/></div><div><strong>{assets.length}</strong><span>Assets</span></div><small className="kpi-note good">RLS-authorized</small></article>
        <article className="kpi-card"><div className="kpi-icon amber"><AlertTriangle size={25}/></div><div><strong>{warnings}</strong><span>Warnings</span></div><small className="kpi-note attention">Needs attention</small></article>
        <article className="kpi-card"><div className="kpi-icon coral"><Wrench size={25}/></div><div><strong>{workOrders.filter(order=>!["Completed","Cancelled"].includes(order.status)).length}</strong><span>Open work orders</span></div><small className="kpi-note attention">Technical queue</small></article>
        <article className="kpi-card"><div className="kpi-icon blue"><Activity size={25}/></div><div><strong>{averageUptime}%</strong><span>Uptime</span></div><small className="kpi-note good">Portfolio average</small></article>
      </section>

      <section className="asset-grid" aria-label="Monitored assets">
        {assets.map((asset) => { const Icon = assetIcons[asset.category as keyof typeof assetIcons] ?? Box; return <article className="asset-card" key={asset.id}>
          <div className="asset-card-header"><div><span className="asset-category">{asset.category}</span><h2>{asset.name}</h2></div><span className={`status-pill ${asset.tone}`}><i/>{asset.status}</span></div>
          <div className="asset-card-body"><div className={`machine-visual ${asset.tone}`}><span className="machine-grid"/><Icon size={66} strokeWidth={1.25}/><button type="button" onClick={() => showQr(asset)} aria-label={`Show QR for ${asset.name}`}><QrCode size={16}/></button></div><div className="asset-metrics"><div><span>Asset ID</span><strong>{asset.id}</strong></div><div><span>{asset.metricLabel}</span><strong className={asset.tone}>{asset.metric}</strong><div className="metric-bar"><i className={asset.tone} style={{width:`${asset.health}%`}}/></div></div><div><span>{asset.maintenanceLabel}</span><strong className={asset.tone}>{asset.maintenance}</strong></div></div></div>
          <div className="asset-card-footer"><HealthRing score={asset.health} tone={asset.tone}/><div className="health-copy"><span>Health score</span><small>{asset.dataSource}</small></div><Link className="text-button" href={`/assets/${asset.id}`}>View asset <ChevronRight size={16}/></Link></div>
        </article>})}
      </section>

      <section className="operations-grid">
        <article className="panel"><div className="panel-heading"><h2>Active alerts</h2><Link href="/maintenance">View all</Link></div><button className="alert-row" type="button"><span className="alert-icon amber"><AlertTriangle size={18}/></span><span><strong>CNC lubrication service overdue</strong><small>Monolab SR20 CNC · CNC-00078</small></span><time>2 days ago</time><ChevronRight size={16}/></button><button className="alert-row" type="button"><span className="alert-icon coral"><CircleGauge size={18}/></span><span><strong>Laser exhaust airflow below threshold</strong><small>Thunder Laser Bolt · LAS-00055</small></span><time>15 min ago</time><ChevronRight size={16}/></button></article>
        <article className="panel"><div className="panel-heading"><h2>Work orders</h2><Link href="/work-orders">View all</Link></div>{workOrders.slice(0,5).map((order) => <Link className="work-row" href={`/work-orders?open=${order.id}`} key={order.id}><span className="work-icon"><ClipboardList size={18}/></span><span><strong>{order.title}</strong><small>{order.id}</small></span><em className={order.status.toLowerCase().replace(" ","")}>{order.status}</em><ChevronRight size={16}/></Link>)}</article>
        <article className="panel trend-panel"><div className="panel-heading"><h2>Uptime trend</h2><span>Last 7 days</span></div><div className="trend-stat"><strong>94.0%</strong><span><Activity size={14}/> Stable this week</span></div><svg viewBox="0 0 420 112" role="img" aria-label="Seven day uptime trend"><defs><linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#11a9a5" stopOpacity=".24"/><stop offset="100%" stopColor="#11a9a5" stopOpacity="0"/></linearGradient></defs><path className="chart-area" d="M8 43 L75 34 L142 45 L209 31 L276 49 L343 40 L410 42 L410 104 L8 104 Z"/><path className="chart-line" d="M8 43 L75 34 L142 45 L209 31 L276 49 L343 40 L410 42"/>{[8,75,142,209,276,343,410].map((x,i)=><circle key={x} cx={x} cy={[43,34,45,31,49,40,42][i]} r="3.5"/>)}</svg><div className="chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></article>
      </section>
    </main>

    {qrOpen && selectedAsset && <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="qr-title"><button className="modal-backdrop" onClick={() => setQrOpen(false)} aria-label="Close QR code"/><section className="modal-card qr-modal"><button className="modal-close" onClick={() => setQrOpen(false)} type="button" aria-label="Close"><X size={20}/></button><span className="modal-icon"><QrCode size={24}/></span><p className="eyebrow">Asset passport</p><h2 id="qr-title">{selectedAsset.name}</h2><p>Scan to open the asset record, maintenance history and issue form.</p><div className="qr-frame"><QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : "https://smartcare.ibtechar.com"}/assets/${selectedAsset.id}`} size={184} level="H" marginSize={2} fgColor="#003167"/></div><strong className="qr-id">{selectedAsset.id}</strong><button className="button primary full" type="button" onClick={() => window.print()}><QrCode size={18}/> Print asset label</button></section></div>}

    {issueOpen && <div className="modal-layer drawer-layer" role="dialog" aria-modal="true" aria-labelledby="issue-title"><button className="modal-backdrop" onClick={() => setIssueOpen(false)} aria-label="Close issue form"/><section className="issue-drawer"><div className="drawer-header"><div><p className="eyebrow">New service request</p><h2 id="issue-title">Report an equipment issue</h2></div><button className="modal-close inline" onClick={() => setIssueOpen(false)} type="button" aria-label="Close"><X size={20}/></button></div>{submitted ? <div className="success-state"><span><ClipboardList size={28}/></span><h3>Work order created</h3><p>WO-1048 has been added to the technical queue with high priority.</p><button className="button primary full" type="button" onClick={() => {setSubmitted(false);setIssueOpen(false)}}>Done</button></div> : <form onSubmit={(e)=>{e.preventDefault();setSubmitted(true)}}><label>Asset<select defaultValue="LAS-00055">{demoAssets.map(a=><option value={a.id} key={a.id}>{a.name} · {a.id}</option>)}</select></label><label>Issue category<select defaultValue="performance"><option value="performance">Performance or quality</option><option value="offline">Offline / connection</option><option value="safety">Safety alarm</option><option value="maintenance">Maintenance request</option></select></label><label>What happened?<textarea required defaultValue="Exhaust airflow appears weak and smoke is taking longer to clear." rows={5}/></label><div className="form-grid"><label>Priority<select defaultValue="high"><option>Normal</option><option value="high">High</option><option>Critical</option></select></label><label>Observed at<input type="datetime-local" defaultValue="2026-08-03T20:15"/></label></div><div className="ai-hint"><Sparkles size={18}/><span><strong>AI triage ready</strong><small>The description will be checked against this asset&apos;s history and known faults.</small></span></div><button className="button primary full" type="submit"><ClipboardList size={18}/> Create work order</button></form>}</section></div>}
  </>;
}
