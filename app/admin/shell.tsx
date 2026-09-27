'use client';
import { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, CalendarDays, CalendarPlus2, MessageCircle, Scissors, Images, Wallet, Settings, UserRound, UsersRound, Menu, X, ExternalLink, LogOut } from 'lucide-react';
import { adminItems, sectionTitle } from '@/lib/admin-nav';
import NotificationCenter from './notification-center';
import { unsubscribePush } from '@/app/unsubscribe-push';
const icons=[CalendarPlus2,LayoutDashboard,CalendarDays,MessageCircle,Scissors,Images,Wallet,Settings,UserRound,UsersRound];
const items=adminItems.map((item,index)=>({...item,icon:icons[index]}));
export default function AdminShell({section,children}:{section:string;children:React.ReactNode}){
  const [open,setOpen]=useState(false);
  async function signOut(){await unsubscribePush();await fetch('/api/auth/logout',{method:'POST'});window.location.assign('/admin/agendar')}
  return <div className="admin-shell"><div className={`admin-mobile-bar ${open?'menu-open':''}`}><Link className="admin-brand-logo" href="/admin/agendar" aria-label="Eric Zambonini — painel administrativo"><img src="/images/eric-zambonini-horizontal-v2.png" alt="Eric Zambonini" width="1420" height="180"/></Link><button type="button" aria-label={open?'Fechar menu':'Abrir menu'} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={26}/>:<Menu size={26}/>}</button></div>{open&&<button className="admin-backdrop" aria-label="Fechar menu" onClick={()=>setOpen(false)}/>}<aside className={`admin-sidebar ${open?'is-open':''}`}><Link className="admin-logo" href="/admin/agendar" aria-label="Eric Zambonini — início da gestão"><img src="/images/eric-zambonini-horizontal-v2.png" alt="Eric Zambonini" width="1420" height="180"/><span>PAINEL ADMINISTRATIVO</span></Link><nav aria-label="Menu administrativo">{items.map(item=>{const Icon=item.icon;return <Link key={item.slug} href={`/admin/${item.slug}`} aria-current={section===item.slug?'page':undefined} onClick={()=>setOpen(false)}><Icon size={19}/>{item.label}</Link>})}</nav><div className="admin-side-bottom"><Link href="/" className="admin-visit" onClick={()=>setOpen(false)}><ExternalLink size={19}/>Ver site</Link><button type="button" onClick={()=>void signOut()}><LogOut size={19}/>Sair</button></div></aside><main className="admin-main"><div className="admin-heading"><div><p className="eyebrow">GESTÃO DO SITE</p><h1>{sectionTitle(section)}</h1></div><div className="admin-heading-actions"><NotificationCenter/><Link className="button outline admin-open-site" href="/">Ver site <ExternalLink size={17}/></Link></div></div>{children}</main></div>
}
