"use client";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

type ImportedRow=Record<string,unknown>;
type PreviewRow={rowNumber:number;assetId:string;assetName:string;action:"create"|"update";errors:string[]};
type Project={id:string;name:string};
const aliases:Record<string,string>={asset_id:"asset_id",assetid:"asset_id",id_number_code_number:"asset_id",code_number:"asset_id",asset_name:"asset_name",assetname:"asset_name",item_name:"asset_name",category:"category",model:"model",model_number:"model",serial_number:"serial_number",status:"status",qty:"quantity",quantity:"quantity",link:"source_link",where_to_find:"location",notes_storage_container:"notes",project:"project",manufacturer:"manufacturer",owner:"owner",purchase_date:"purchase_date",acquisition_cost_qar:"acquisition_cost_qar",residual_value_qar:"residual_value_qar",useful_life_years:"useful_life_years",warranty_until:"warranty_until"};
const clean=(value:unknown)=>String(value??"").trim();
const headerKey=(value:unknown)=>{const key=clean(value).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");return aliases[key]||key};

function workbookRows(matrix:unknown[][],defaultProject:string){
  let headers:string[]=[];let lastName="";const rows:ImportedRow[]=[];const ids=new Map<string,number>();
  matrix.forEach((raw,rowIndex)=>{
    const values=raw.map(clean),keys=values.map(headerKey);
    if(keys.includes("asset_name")&&keys.includes("category")){headers=keys;return}
    if(!headers.length||!values.some(Boolean))return;
    const record=Object.fromEntries(headers.map((key,index)=>[key,values[index]??""]));
    const suppliedName=clean(record.asset_name);if(suppliedName)lastName=suppliedName;
    const hasAssetData=clean(record.category)||clean(record.asset_id)||clean(record.model)||clean(record.serial_number)||clean(record.quantity);
    if(!hasAssetData||!lastName)return;
    record.asset_name=lastName;record.project=clean(record.project)||defaultProject;record.quantity=clean(record.quantity)||"1";
    let id=clean(record.asset_id)||`ST5-INV-${String(rowIndex+1).padStart(4,"0")}`;
    const count=(ids.get(id.toLowerCase())||0)+1;ids.set(id.toLowerCase(),count);if(count>1)id=`${id}-${String(count).padStart(2,"0")}`;record.asset_id=id;rows.push(record);
  });
  return rows;
}

export default function ImportsPage(){
  const inputRef=useRef<HTMLInputElement>(null);
  const[rows,setRows]=useState<ImportedRow[]>([]),[preview,setPreview]=useState<PreviewRow[]>([]),[projects,setProjects]=useState<Project[]>([]),[defaultProject,setDefaultProject]=useState("Studio 5"),[fileName,setFileName]=useState(""),[message,setMessage]=useState(""),[loading,setLoading]=useState(false),[result,setResult]=useState<{created:number;updated:number;rejected:number}|null>(null);
  const valid=preview.filter(r=>!r.errors.length),invalid=preview.filter(r=>r.errors.length);
  useEffect(()=>{fetch("/api/projects").then(r=>r.json()).then((d:{projects?:Project[]})=>{const list=d.projects||[];setProjects(list);if(!list.some(p=>p.name==="Studio 5")&&list[0])setDefaultProject(list[0].name)}).catch(()=>{})},[]);
  async function readFile(file?:File){
    if(!file)return;setLoading(true);setRows([]);setPreview([]);setResult(null);setMessage("");setFileName(file.name);
    try{const buffer=await file.arrayBuffer(),book=XLSX.read(buffer,{type:"array",cellDates:true}),target=book.SheetNames.find(n=>n.trim().toLowerCase()==="assets import")||book.SheetNames[0],matrix=XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[target],{header:1,defval:"",raw:false}),data=workbookRows(matrix,defaultProject);if(!data.length)throw new Error("No compatible asset rows were found. Keep the Item Name, Category, ID/Code and QTY header row in the workbook.");const response=await fetch("/api/assets/import",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rows:data,fileName:file.name,dryRun:true})}),payload=await response.json() as {preview?:PreviewRow[];error?:string};if(!response.ok||!payload.preview)throw new Error(payload.error||"Unable to validate this workbook.");setRows(data);setPreview(payload.preview);setMessage(`${data.length} asset rows read from ${target}. ${payload.preview.filter(row=>!row.errors.length).length} are ready to import.`)}catch(error){setMessage(error instanceof Error?error.message:"Unable to read this file.")}finally{setLoading(false);if(inputRef.current)inputRef.current.value=""}
  }
  async function confirmImport(){if(!rows.length||!valid.length)return;setLoading(true);setMessage("");try{const response=await fetch("/api/assets/import",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rows,fileName,createdBy:"Saif Khlif"})}),payload=await response.json() as {created:number;updated:number;rejected:number;error?:string};if(!response.ok)throw new Error(payload.error||"Import failed");setResult(payload);setMessage(`Import completed: ${payload.created} created, ${payload.updated} updated, ${payload.rejected} rejected.`)}catch(error){setMessage(error instanceof Error?error.message:"Import failed.")}finally{setLoading(false)}}

  return <main className="dashboard-main section-page"><section className="page-heading"><div><p className="eyebrow">Fast onboarding</p><h1>Bulk Upload Center</h1><p className="page-subtitle">Upload the existing Studio 5 inventory sheet or the SmartCare template. Repeated section headers are handled automatically.</p></div><a className="button secondary" href="/api/assets/template"><Download size={18}/> Download compatible template</a></section>
  <section className="import-layout"><article className="upload-card"><span className="upload-icon"><UploadCloud size={30}/></span><h2>Upload assets workbook</h2><p>Accepted: .xlsx, .xls or .csv. Columns such as <strong>Item Name, ID/Code, QTY, Link and Where to Find?</strong> are mapped automatically.</p><label>Default project for rows without Project<select value={defaultProject} onChange={e=>setDefaultProject(e.target.value)}>{projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></label><input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e=>readFile(e.target.files?.[0])}/><button className="button primary" type="button" disabled={loading} onClick={()=>inputRef.current?.click()}><FileSpreadsheet size={18}/>{loading?"Reading workbook…":"Select file"}</button><small>Missing or repeated IDs receive a safe unique SmartCare ID.</small></article><article className="import-guide"><h2>Real import workflow</h2><ol><li><span>01</span><div><strong>Select the project</strong><small>Studio 5 is the default for the linked inventory sheet.</small></div></li><li><span>02</span><div><strong>Validate before writing</strong><small>SmartCare shows every create/update and any rejected row.</small></div></li><li><span>03</span><div><strong>Confirm the import</strong><small>QTY, status, location, notes and source link are saved with each asset.</small></div></li></ol></article></section>
  {message&&<section className={`import-message ${result||valid.length?"success":"error"}`}>{result||valid.length?<CheckCircle2 size={19}/>:<AlertTriangle size={19}/>}<span>{message}</span></section>}
  {preview.length>0&&<section className="budget-table-card"><div className="panel-heading"><div><h2>Validation preview · {fileName}</h2><p>{valid.length} valid rows · {invalid.length} rows need correction.</p></div><button className="button primary" disabled={loading||!valid.length||!!result} onClick={confirmImport}>{loading?"Importing…":result?<><CheckCircle2 size={17}/> Imported</>:"Confirm import"}</button></div><div className="responsive-table"><table><thead><tr><th>Row</th><th>Asset ID</th><th>Asset name</th><th>Action</th><th>Validation</th></tr></thead><tbody>{preview.map(row=><tr key={`${row.rowNumber}-${row.assetId}`}><td>{row.rowNumber}</td><td><strong>{row.assetId||"—"}</strong></td><td>{row.assetName||"—"}</td><td><span className={`table-status ${row.action==="create"?"healthy":"due"}`}>{row.action}</span></td><td>{row.errors.length?<span className="import-row-error">{row.errors.join(" · ")}</span>:<span className="import-row-ok">Ready</span>}</td></tr>)}</tbody></table></div>{invalid.length>0&&<div className="import-complete"><AlertTriangle size={18}/><span>Only valid rows will be imported. Correct the listed rows and upload again to include them.</span></div>}</section>}</main>
}
