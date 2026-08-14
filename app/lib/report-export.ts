"use client";

import * as XLSX from "xlsx";

export type ReportFormat="pdf"|"xlsx"|"csv"|"html";
export type ReportMeta={project?:string;projectImage?:string;details?:Record<string,string|number>;filters?:Record<string,string>};
export type ReportColumn={key:string;label:string};

const stamp=()=>new Date().toLocaleString("en-QA",{dateStyle:"medium",timeStyle:"medium"});
const safe=(value:unknown)=>value===null||value===undefined?"":String(value);
const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
function metadata(title:string,meta:ReportMeta){return [[title],["Generated",stamp()],["Project",meta.project||"All projects"],...Object.entries(meta.details||{}).map(([k,v])=>[k,safe(v)]),...Object.entries(meta.filters||{}).map(([k,v])=>[`Filter: ${k}`,v])];}

export async function exportReport(args:{title:string;columns:ReportColumn[];rows:Record<string,unknown>[];format:ReportFormat;meta?:ReportMeta}){
  const {title,columns,rows,format}=args,meta=args.meta||{},filename=`${slug(title)||"smartcare-report"}-${new Date().toISOString().slice(0,10)}`;
  const body=rows.map(row=>columns.map(c=>safe(row[c.key]))),heads=columns.map(c=>c.label),info=metadata(title,meta);
  if(format==="xlsx"){
    const aoa=[...info,["Project picture reference",meta.projectImage?"Stored with project in SmartCare":"Not provided"],[],heads,...body];
    const ws=XLSX.utils.aoa_to_sheet(aoa);ws["!cols"]=heads.map((h,i)=>({wch:Math.min(42,Math.max(h.length+3,...body.map(r=>safe(r[i]).length+2)))}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"SmartCare Report");XLSX.writeFile(wb,`${filename}.xlsx`);return;
  }
  if(format==="csv"){
    const csv=[...info,["Project picture",meta.projectImage?"Stored in SmartCare project record":"Not provided"],[],heads,...body].map(row=>row.map(v=>`"${safe(v).replace(/"/g,'""')}"`).join(",")).join("\n");download(new Blob([csv],{type:"text/csv;charset=utf-8"}),`${filename}.csv`);return;
  }
  const image=meta.projectImage?`<img src="${meta.projectImage}" alt="Project" style="width:120px;height:80px;object-fit:cover;border-radius:8px">`:"";
  const detailHtml=info.slice(1).map(([k,v])=>`<div><b>${k}</b><span>${v||""}</span></div>`).join("");
  const table=`<table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map(row=>`<tr>${row.map(v=>`<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;color:#18334f;padding:32px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #0050C2;padding-bottom:18px}h1{color:#003167;margin:0}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}.meta div{padding:9px;background:#f4f7fa}.meta b,.meta span{display:block;font-size:11px}.meta span{margin-top:4px;color:#61748a}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#0050C2;color:white;text-align:left;padding:9px}td{padding:8px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#EEEEEE}</style></head><body><header><div><small>IBTECHAR SMARTCARE</small><h1>${title}</h1></div>${image}</header><section class="meta">${detailHtml}</section>${table}</body></html>`;
  if(format==="html"){download(new Blob([html],{type:"text/html;charset=utf-8"}),`${filename}.html`);return;}
  const popup=window.open("","_blank","width=1100,height=800");if(!popup)throw new Error("Allow pop-ups to export PDF");popup.document.write(html);popup.document.close();popup.focus();setTimeout(()=>popup.print(),250);
}
