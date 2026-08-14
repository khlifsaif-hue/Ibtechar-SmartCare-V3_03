import { createUser, listProjects, listRoleNames, listUsers, USER_ROLES } from "../../lib/database";
import { getSmartCareActor, hasSmartCarePermission } from "../../lib/auth-server";

export async function GET(request:Request){
  try{
    const actor=await getSmartCareActor();
    if(!actor)return Response.json({error:"Unauthorized"},{status:401});
    if(!await hasSmartCarePermission(request,"users","view"))return Response.json({error:"User-management access required"},{status:403});
    const[users,roles,projects]=await Promise.all([listUsers(),listRoleNames(),listProjects()]);
    return Response.json({users,roles,projects:projects.map(({id,name})=>({id,name}))});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to load user management data"},{status:500})}
}

export async function POST(request:Request){
  try{
    if(!await hasSmartCarePermission(request,"users","create"))return Response.json({error:"User-create permission required"},{status:403});
    const body=await request.json() as Record<string,unknown>;
    const name=String(body.name||"").trim(), email=String(body.email||"").trim().toLowerCase(), role=String(body.role||"VIEWER");
    if(!name||!email)return Response.json({error:"Name and email are required"},{status:400});
    const roles=await listRoleNames();
    if(!roles.includes(role)||!USER_ROLES.includes(role as (typeof USER_ROLES)[number]))return Response.json({error:"Invalid role"},{status:400});
    const projectIds=Array.isArray(body.projectIds)?body.projectIds.map(String):[];
    const user=await createUser({name,email,role:role as (typeof USER_ROLES)[number],department:String(body.department||""),jobTitle:String(body.jobTitle||""),phone:String(body.phone||""),active:body.active!==false,projectIds});
    return Response.json({user},{status:201});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to create user"},{status:400})}
}
