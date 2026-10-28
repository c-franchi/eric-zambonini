'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Native document navigation avoids inert SPA transitions in the installed Android app. */
import { useState } from 'react';
import { Menu, X, ExternalLink, LogOut } from 'lucide-react';
import { adminItems, sectionTitle } from '@/lib/admin-nav';
import { adminIcons } from '@/lib/admin-icons';
import NotificationCenter from './notification-center';
import { unsubscribePush } from '@/app/unsubscribe-push';

const items=adminItems.map(item=>({...item,icon:adminIcons[item.slug]}));

export default function AdminShell({section,children}:{section:string;children:React.ReactNode}){
  const [open,setOpen]=useState(false);
  async function signOut(){await unsubscribePush();await fetch('/api/auth/logout',{method:'POST'});window.location.assign('/admin/agendar')}
  return <div className="admin-shell">
    <div className={`admin-mobile-bar ${open?'menu-open':''}`}>
      <a className="admin-brand-logo" href="/admin/agendar" aria-label="Eric Zambonini — painel administrativo"><img src="/images/eric-zambonini-horizontal-v2.png" alt="Eric Zambonini" width="1420" height="180"/></a>
      <button type="button" aria-label={open?'Fechar menu':'Abrir menu'} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?<X size={26}/>:<Menu size={26}/>}</button>
    </div>
    <aside className={`admin-sidebar ${open?'is-open':''}`}>
      <a className="admin-logo" href="/admin/agendar" aria-label="Eric Zambonini — início da gestão"><img src="/images/eric-zambonini-horizontal-v2.png" alt="Eric Zambonini" width="1420" height="180"/><span>PAINEL ADMINISTRATIVO</span></a>
      <nav aria-label="Menu administrativo">{items.map(item=>{const Icon=item.icon;return <a key={item.slug} href={`/admin/${item.slug}`} aria-current={section===item.slug?'page':undefined}><Icon size={19}/>{item.label}</a>})}</nav>
      <div className="admin-side-bottom"><a href="/" className="admin-visit"><ExternalLink size={19}/>Ver site</a><button type="button" onClick={()=>void signOut()}><LogOut size={19}/>Sair</button></div>
    </aside>
    <main className="admin-main"><div className="admin-heading"><div><p className="eyebrow">GESTÃO DO SITE</p><h1>{sectionTitle(section)}</h1></div><div className="admin-heading-actions"><NotificationCenter/><a className="button outline admin-open-site" href="/">Ver site <ExternalLink size={17}/></a></div></div>{children}</main>
  </div>
}
