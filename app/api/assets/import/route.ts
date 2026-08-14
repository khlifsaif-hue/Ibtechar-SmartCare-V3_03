import { importAssets, previewAssetImport } from "../../../lib/database";
import { hasSmartCarePermission } from "../../../lib/auth-server";

export async function POST(request:Request){
  try{
    if(!await hasSmartCarePermission(request,"imports","create"))return Response.json({error:"Asset-import permission required"},{status:403});
    const body=await request.json() as {rows?:Record<string,unknown>[];fileName?:string;dryRun?:boolean;createdBy?:string};
    if(!Array.isArray(body.rows)||!body.rows.length)return Response.json({error:"No workbook rows were received"},{status:400});
    if(body.rows.length>1000)return Response.json({error:"Maximum 1,000 rows per import"},{status:400});
    if(body.dryRun)return Response.json({preview:await previewAssetImport(body.rows)});
    return Response.json(await importAssets(body.rows,body.fileName||"assets-import.xlsx",body.createdBy||"SmartCare user"));
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Asset import failed"},{status:400})}
}
