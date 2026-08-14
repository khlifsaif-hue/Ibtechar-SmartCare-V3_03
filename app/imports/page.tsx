"use client";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";

type ImportedRow=Record<string,unknown>;
type PreviewRow={rowNumber:number;assetId:string;assetName:string;action:"create"|"update";errors:string[]};
const required=["asset_id","asset_name","project","category"];
const headerKey=(value:unknown)=>String(value??"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");

export default function ImportsPage(){
  const inputRef=useRef<HTMLInputElement>(null);
  const [rows,setRows]=useState<ImportedRow[]>([]),[preview,setPreview]=useState<PreviewRow[]>([]),[fileName,setFileName]=useState(""),[message,setMessage]=useState(""),[loading,setLoading]=useState(false),[result,setResult]=useState<{created:number;updated:number;rejected:number}|null>(null);
  const valid=preview.filter(r=>!r.errors.length);
  const invalid=preview.filter(r=>r.errors.length);

  async function readFile(file?:File){
    if(!file)return;setLoading(true);setRows([]);setPreview([]);setResult(null);setMessage("");setFileName(file.name);
    try{
      const buffer=await file.arrayBuffer(),book=XLSX.read(buffer,{type:"array",cellDates:true});
      const target=book.SheetNames.find(n=>n.trim().toLowerCase()==="assets import")||book.SheetNames[0];
      const matrix=XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[target],{header:1,defval:"",raw:false});
      const headerIndex=matrix.findIndex(row=>required.every(column=>(row as unknown[]).map(headerKey).includes(column)));
      if(headerIndex<0)throw new Error("Could not find the required header row. Download the new template and keep the headers unchanged.");
      const headers=(matrix[headerIndex] as unknown[]).map(headerKey);
      const data=matrix.slice(headerIndex+1).filter(row=>(row as unknown[]).some(value=>String(value).trim()!=="")).map(row=>Object.fromEntries(headers.map((header,index)=>[header,(row as unknown[])[index]??""])));
      if(!data.length)throw new Error("The selected Assets Import sheet has no data rows.");
      const response=await fetch("/api/assets/import",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rows:data,fileName:file.name,dryRun:true})});
      const payload=await response.json() as {preview?:PreviewRow[];error?:string};if(!response.ok||!payload.preview)throw new Error(payload.error||"Unable to validate this workbook.");
      setRows(data);setPreview(payload.preview);setMessage(`${data.length} rows read from ${target}. ${payload.preview.filter(row=>!row.errors.length).length} are ready to import.`);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to read this file.");}
    finally{setLoading(false);if(inputRef.current)inputRef.current.value="";}
  }

  async function confirmImport(){
    if(!rows.length||!valid.length)return;setLoading(true);setMessage("");
    try{const response=await fetch("/api/assets/import",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rows,fileName,createdBy:"Saif Khlif"})});const payload=await response.json() as {created:number;updated:number;rejected:number;issues?:{rowNumber:number;assetId:string;message:string}[];error?:string};if(!response.ok)throw new Error(payload.error||"Import failed");setResult(payload);setMessage(`Import completed: ${payload.created} created, ${payload.updated} updated, ${payload.rejected} rejected.`);}catch(error){setMessage(error instanceof Error?error.message:"Import failed.");}finally{setLoading(false)}
  }

  return <main className="dashboard-main section-page"><section className="page-heading"><div><p className="eyebrow">Fast onboarding</p><h1>Bulk Upload Center</h1><p className="page-subtitle">Upload an Excel asset register, validate each row, then create or update assets directly in SmartCare.</p></div><a className="button secondary" href="/api/assets/template"><Download size={18}/> Download compatible template</a></section>
  <section className="import-layout"><article className="upload-card"><span className="upload-icon"><UploadCloud size={30}/></span><h2>Upload assets workbook</h2><p>Accepted: .xlsx, .xls or .csv. The importer uses the <strong>Assets Import</strong> sheet when it exists.</p><input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e=>readFile(e.target.files?.[0])}/><button className="button primary" type="button" disabled={loading} onClick={()=>inputRef.current?.click()}><FileSpreadsheet size={18}/>{loading?"Reading workbook…":"Select file"}</button><small>Required columns: asset_id, asset_name, project, category.</small></article><article className="import-guide"><h2>Real import workflow</h2><ol><li><span>01</span><div><strong>Download the compatible template</strong><small>It contains the exact SmartCare headers and supported project names.</small></div></li><li><span>02</span><div><strong>Validate the workbook</strong><small>Rows with missing fields, duplicate IDs or unavailable projects are highlighted before import.</small></div></li><li><span>03</span><div><strong>Confirm the import</strong><small>Valid Asset IDs create new assets; existing IDs update the matching asset record.</small></div></li></ol></article></section>
  {message&&<section className={`import-message ${result||valid.length?"success":"error"}`}>{result||valid.length?<CheckCircle2 size={19}/>:<AlertTriangle size={19}/>}<span>{message}</span></section>}
  {preview.length>0&&<section className="budget-table-card"><div className="panel-heading"><div><h2>Validation preview · {fileName}</h2><p>{valid.length} valid rows · {invalid.length} rows need correction.</p></div><button className="button primary" disabled={loading||!valid.length||!!result} onClick={confirmImport}>{loading?"Importing…":result?<><CheckCircle2 size={17}/> Imported</>:"Confirm import"}</button></div><div className="responsive-table"><table><thead><tr><th>Row</th><th>Asset ID</th><th>Asset name</th><th>Action</th><th>Validation</th></tr></thead><tbody>{preview.map(row=><tr key={row.rowNumber}><td>{row.rowNumber}</td><td><strong>{row.assetId||"—"}</strong></td><td>{row.assetName||"—"}</td><td><span className={`table-status ${row.action==="create"?"healthy":"due"}`}>{row.action}</span></td><td>{row.errors.length?<span className="import-row-error">{row.errors.join(" · ")}</span>:<span className="import-row-ok">Ready</span>}</td></tr>)}</tbody></table></div>{invalid.length>0&&<div className="import-complete"><AlertTriangle size={18}/><span>Only valid rows will be imported. Correct the listed rows in Excel and upload again to include them.</span></div>}</section>}</main>;
}
