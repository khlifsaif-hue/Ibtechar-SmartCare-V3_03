"use client";

import {
  AlertTriangle, Bell, Box, ChevronDown, ClipboardList, FileBarChart, Home,
  Landmark, LayoutDashboard, LogOut, MapPin, Menu, Package, RadioTower, Search, ShieldCheck, ShoppingCart, Sparkles, Target, Upload, UserCircle2, UsersRound, WalletCards, Wrench, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSmartCareAuth } from "./auth-provider";

const iconByKey:Record<string,typeof Home>={overview:Home,assets:Box,projects:WalletCards,project_dashboard:LayoutDashboard,purchase_requests:ClipboardList,procurement:ShoppingCart,inventory:Package,depreciation:Landmark,imports:Upload,maintenance:Wrench,work_orders:ClipboardList,ai_assistant:Sparkles,integrations:RadioTower,reports:FileBarChart,users:UsersRound,access_control:ShieldCheck,project_tasks:Target,project_risks:AlertTriangle};
const modulePath=(key:string,path:string)=>{
  const mapped:Record<string,string>={
    overview:"/",
    project_risks:"/risks",
    project_tasks:"/tasks",
    project_budgets:"/projects",
    spare_parts:"/inventory",
    bulk_upload:"/imports",
    lab_calendar:"/maintenance",
  };
  return mapped[key] || path;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const [noticeOpen,setNoticeOpen]=useState(false),[notices,setNotices]=useState<{id:number;entityType:string;entityId:string;title:string;message:string;readAt:string|null;createdAt:string;link:string}[]>([]);
  const [accountOpen,setAccountOpen]=useState(false);
  const {user,modules,can,logout}=useSmartCareAuth();
  const router=useRouter();
  const navItems=useMemo(()=>modules.filter(m=>m.enabled&&can(m.key,"view")).map(m=>({key:m.key,href:modulePath(m.key,m.path),label:m.title,icon:iconByKey[m.key]||LayoutDashboard})),[modules,can]);
  async function refreshNotifications(){if(!user)return;const r=await fetch("/api/notifications",{cache:"no-store"});if(r.ok){const d=await r.json() as {notifications?:typeof notices};setNotices(d.notifications||[])}}
  useEffect(()=>{refreshNotifications().catch(()=>{});const timer=window.setInterval(()=>refreshNotifications().catch(()=>{}),60000);return()=>window.clearInterval(timer)},[user]);
  async function openNotification(notice:typeof notices[number]){setNoticeOpen(false);setNotices(current=>current.map(n=>n.id===notice.id?{...n,readAt:n.readAt||new Date().toISOString()}:n));await fetch("/api/notifications",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:notice.id})}).catch(()=>{});router.push(notice.link);}
  const currentModule=modules.find(m=>{const path=modulePath(m.key,m.path);return path==="/"?pathname==="/":pathname===path||pathname.startsWith(`${path}/`)});
  const allowed=!currentModule||can(currentModule.key,"view");
  const initials=(user?.name||"SmartCare User").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand-mark">
          <span className="brand-symbol"><img src="/ibtechar-main-logo.png" alt="Ibtechar SmartCare" width={164} height={72}/></span>
          <button className="mobile-nav-close" type="button" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={20}/></button>
        </div>
        <nav className="side-nav" aria-label="Primary navigation" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
            return <Link href={href} className={`nav-item ${active ? "active" : ""}`} key={href} onClick={() => setMobileNav(false)}><Icon size={20} strokeWidth={1.8}/><span>{label}</span></Link>;
          })}
        </nav>
        <div className="system-state"><span className="online-dot"/><div><strong>System online</strong><small>All gateways connected</small></div></div>
        <div className="platform-credit"><strong>Ibtechar SmartCare V3_02</strong><small>Developed by Seif Khlif</small></div>
      </aside>
      {mobileNav && <button className="nav-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}

      <div className="main-area">
        <header className="topbar">
          <button className="mobile-menu" type="button" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={22}/></button>
          <label className="site-picker"><MapPin size={18}/><select aria-label="Active project"><option>Ibtechar</option><option>Sanea</option><option>Studio 5</option><option>DIC</option></select><ChevronDown size={16}/></label>
          <label className="global-search"><Search size={18}/><input aria-label="Search assets, work orders or alerts" placeholder="Search assets, work orders, or alerts"/></label>
          <div className="notification-wrap"><button className="icon-button notification-button" type="button" aria-label="Notifications" onClick={()=>{setNoticeOpen(v=>!v);refreshNotifications().catch(()=>{})}}><Bell size={20}/>{notices.some(n=>!n.readAt)&&<span/>}</button>{noticeOpen&&<div className="notification-popover"><strong>Notifications</strong>{notices.slice(0,12).map(n=><button type="button" className={n.readAt?"read":"unread"} key={n.id} onClick={()=>openNotification(n)}><b>{n.title}</b><small>{n.message}</small><time>{new Date(n.createdAt).toLocaleString()}</time></button>)}{!notices.length&&<small>No new notifications.</small>}</div>}</div>
          <div className="account-wrap"><button className="profile-button" type="button" onClick={()=>{setAccountOpen(v=>!v);setNoticeOpen(false)}} aria-expanded={accountOpen}><span>{initials}</span><div><strong>{user?.name||"SmartCare User"}</strong><small>{user?.jobTitle||user?.department||"SmartCare"}</small></div><ChevronDown size={15}/></button>{accountOpen&&<div className="account-popover"><div className="account-summary"><span>{initials}</span><div><strong>{user?.name}</strong><small>{user?.email}</small><em>{user?.role}</em></div></div><button type="button" onClick={()=>{setAccountOpen(false);router.push("/profile")}}><UserCircle2 size={16}/> My Profile</button><button type="button" onClick={()=>{setAccountOpen(false);router.push("/profile?tab=permissions")}}><ShieldCheck size={16}/> My Permissions</button><button type="button" className="account-signout" onClick={async()=>{setAccountOpen(false);await logout();router.push("/")}}><LogOut size={16}/>Sign out</button></div>}</div>
        </header>
        {allowed?children:<main className="dashboard-main section-page"><section className="empty-state"><h1>Access restricted</h1><p>Your SmartCare role does not have permission to view this module. Ask an Admin or Manager to update your access.</p></section></main>}
      </div>
    </div>
  );
}
