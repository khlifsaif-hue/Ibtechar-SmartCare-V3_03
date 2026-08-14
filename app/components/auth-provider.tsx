"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ModuleAction, ModuleRecord, UserPermissionRecord, UserRecord } from "../lib/database";
import { createClient } from "../lib/supabase/client";

type AuthState = {
  user: UserRecord | null; modules: ModuleRecord[]; permissions: UserPermissionRecord[];
  loading: boolean; error: string; isLocalPreview: boolean;
  login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>;
  switchUser: (email: string) => Promise<void>; can: (moduleKey: string, action?: ModuleAction) => boolean;
};
const AuthContext = createContext<AuthState | null>(null);
export function useSmartCareAuth(){const value=useContext(AuthContext);if(!value)throw new Error("useSmartCareAuth must be used inside SmartCareAuthProvider");return value;}

export function SmartCareAuthProvider({children}:{children:React.ReactNode}){
  const [user,setUser]=useState<UserRecord|null>(null),[modules,setModules]=useState<ModuleRecord[]>([]),[permissions,setPermissions]=useState<UserPermissionRecord[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const isLocalPreview=false;
  async function loadProfile(){const response=await fetch("/api/users/profile",{cache:"no-store"});if(!response.ok){setUser(null);setPermissions([]);const body=await response.json().catch(()=>null) as {error?:string}|null;throw new Error(body?.error||"Your authentication worked, but this identity is not linked to an active SmartCare user in this database.");}const data=await response.json() as {user:UserRecord;modules:ModuleRecord[];permissions:UserPermissionRecord[]};setUser(data.user);setModules(data.modules);setPermissions(data.permissions);}
  useEffect(()=>{let active=true;const supabase=createClient();supabase.auth.getSession().then(async({data})=>{if(data.session)await loadProfile();}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Authentication unavailable");}).finally(()=>{if(active)setLoading(false);});const{data}=supabase.auth.onAuthStateChange(async(event,session)=>{if(!active)return;if(event==="SIGNED_OUT"||!session){setUser(null);setPermissions([]);return;}try{await loadProfile();}catch(reason){setError(reason instanceof Error?reason.message:"Access denied");}});return()=>{active=false;data.subscription.unsubscribe();};},[]);
  async function login(email:string,password:string){setLoading(true);setError("");try{const{error:authError}=await createClient().auth.signInWithPassword({email,password});if(authError)throw authError;await loadProfile();}catch(reason){const message=reason instanceof Error?reason.message:"Login failed";setError(message);throw reason;}finally{setLoading(false);}}
  async function logout(){await createClient().auth.signOut();setUser(null);setPermissions([]);}
  async function switchUser(_email:string){throw new Error("Switch User is disabled with Supabase Auth. Sign out and use the other account so RLS remains enforceable.");}
  const can=(moduleKey:string,action:ModuleAction="view")=>{if(user?.role==="CEO"||user?.role==="ADMIN")return true;const permission=permissions.find(item=>item.moduleKey===moduleKey);const field={view:"canView",create:"canCreate",edit:"canEdit",delete:"canDelete",approve:"canApprove"}[action] as keyof UserPermissionRecord;return Boolean(permission?.[field]);};
  const value=useMemo(()=>({user,modules,permissions,loading,error,isLocalPreview,login,logout,switchUser,can}),[user,modules,permissions,loading,error,isLocalPreview]);return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthGate({children}:{children:React.ReactNode}){const{user,loading,error,login}=useSmartCareAuth();const[email,setEmail]=useState(""),[password,setPassword]=useState("");if(loading)return <div className="auth-screen"><img src="/ibtechar-main-logo.png" alt="Ibtechar"/><p>Loading SmartCare V3_02…</p></div>;if(!user)return <main className="auth-screen"><section className="auth-card"><img src="/ibtechar-main-logo.png" alt="Ibtechar"/><p className="eyebrow">Secure access · V3_02</p><h1>SmartCare Login</h1><p>Sign in with your approved company account. Supabase Auth verifies your identity and SmartCare RLS applies your project permissions.</p><form onSubmit={async event=>{event.preventDefault();try{await login(email,password);}catch{}}}><label>Email<input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></label>{error&&<p className="form-error">{error}</p>}<button className="button primary full">Sign in</button></form><button className="text-button" type="button" onClick={async()=>{if(!email){window.alert("Enter your email address first.");return;}const callback=`${window.location.origin}/auth/callback?next=/auth/reset-password`;const{error:resetError}=await createClient().auth.resetPasswordForEmail(email,{redirectTo:callback});window.alert(resetError?resetError.message:"Password reset email sent. Open the latest email link to choose a new password.");}}>Forgot password?</button><small>Ibtechar SmartCare V3_02 · Developed by Seif Khlif</small></section></main>;return <>{children}</>;}
