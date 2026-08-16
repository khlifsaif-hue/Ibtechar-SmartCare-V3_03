import { receivePurchaseOrder } from "../../../../lib/database";
import { getSmartCareActor, hasSmartCarePermission, isPurchaseDecisionMaker } from "../../../../lib/auth-server";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const actor=await getSmartCareActor(request);
    if(!actor?.active)return Response.json({error:"Authentication required"},{status:401});
    if(!isPurchaseDecisionMaker(actor.role)||!await hasSmartCarePermission(request,"procurement","edit"))return Response.json({error:"Only CEO, Admin, or Finance can receive a purchase order"},{status:403});
    const{id}=await params;
    const result=await receivePurchaseOrder(id,await request.json() as Record<string,unknown>,actor.id);
    return Response.json(result);
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to receive equipment"},{status:400})}
}
