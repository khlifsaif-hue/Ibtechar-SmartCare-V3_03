import { listModules, listUserPermissions } from "../../../lib/database";
import { getSmartCareActor } from "../../../lib/auth-server";
import { createClient } from "../../../lib/supabase/server";
export async function GET(request:Request){const user=await getSmartCareActor(request);if(!user){const supabase=await createClient();const{data}=await supabase.auth.getUser();const email=data.user?.email||"this account";return Response.json({error:`Authentication succeeded, but ${email} is not linked to an active SmartCare profile in this Supabase project. Run supabase/repair-first-admin-profile.sql once for the first administrator.`},{status:404});}return Response.json({user,modules:await listModules(),permissions:await listUserPermissions(user.id)});}
