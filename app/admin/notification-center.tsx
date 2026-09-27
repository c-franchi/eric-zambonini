'use client';
import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ChevronLeft, ChevronDown, Trash2, X } from 'lucide-react';
import PushToggle from '@/app/push-toggle';
import { useConfirmAction } from '@/app/confirm-action';

type Item={id:string;kind:string;title:string;body:string;link:string;created_at:string;read_at:string|null;email_status:string;email_error:string|null};
type Feed={items:Item[];unread:number;total:number;readCount:number;hasMore:boolean;pendingEmails:number;apiKeyConfigured:boolean;webhookConfigured:boolean;settings:{to:string;from:string}};
const dateLabel=(value:string)=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});

export default function NotificationCenter(){
 const [feed,setFeed]=useState<Feed|null>(null),[allItems,setAllItems]=useState<Item[]>([]),[allMode,setAllMode]=useState(false),[hasMore,setHasMore]=useState(false),[selected,setSelected]=useState<Set<string>>(new Set()),[open,setOpen]=useState(false),[to,setTo]=useState(''),[from,setFrom]=useState(''),[message,setMessage]=useState(''),[saving,setSaving]=useState(false),[loadingAll,setLoadingAll]=useState(false),[busy,setBusy]=useState(false);
 const lastSeen=useRef<string|null>(null),settingsLoaded=useRef(false),{confirm,dialog}=useConfirmAction();

 async function load(){
  try{
   const r=await fetch('/api/admin/notifications',{cache:'no-store'});if(!r.ok)return;
   const value:Feed=await r.json(),latest=value.items[0];
   if(lastSeen.current&&latest&&latest.id!==lastSeen.current&&'Notification'in window&&Notification.permission==='granted'&&localStorage.getItem('eric-device-alerts')==='on'){
    const seen=value.items.findIndex(item=>item.id===lastSeen.current);
    for(const item of value.items.slice(0,seen<0?1:seen).reverse())if(!item.read_at)navigator.serviceWorker?.ready.then(worker=>worker.showNotification(item.title,{body:item.body,icon:'/pwa-192.png',data:{url:item.link},tag:item.id})).catch(()=>{});
   }
   lastSeen.current=latest?.id||null;setFeed(value);
   if(!settingsLoaded.current){setTo(value.settings.to);setFrom(value.settings.from);settingsLoaded.current=true}
  }catch{}
 }
 async function loadAllPage(offset:number,replace=false){
  setLoadingAll(true);
  try{
   const r=await fetch(`/api/admin/notifications?all=1&offset=${offset}`,{cache:'no-store'}),data:Feed&{error?:string}=await r.json();
   if(!r.ok)throw Error(data.error||'Não foi possível carregar os avisos.');
   setAllItems(current=>replace?data.items:[...current,...data.items]);setHasMore(data.hasMore);setFeed(current=>current?{...current,total:data.total,unread:data.unread}:data);setMessage('');
  }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível carregar os avisos.')}
  finally{setLoadingAll(false)}
 }
 async function showAll(){setAllMode(true);setSelected(new Set());setAllItems([]);await loadAllPage(0,true)}
 async function refreshAll(){if(allMode){setAllItems([]);setSelected(new Set());await loadAllPage(0,true)}}
 useEffect(()=>{const initial=setTimeout(()=>void load(),0),timer=setInterval(()=>void load(),30000);return()=>{clearTimeout(initial);clearInterval(timer)}},[]);

 async function mark(id:string){
  const r=await fetch('/api/admin/notifications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id})});
  if(!r.ok){setMessage('Não foi possível marcar o aviso como visto.');return}
  await load();await refreshAll();
 }
 async function markAll(){
  setBusy(true);setMessage('');
  try{const r=await fetch('/api/admin/notifications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({all:true})}),data:{error?:string}=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível marcar todos como vistos.');setMessage('Todos os avisos foram marcados como vistos.');await load();await refreshAll()}
  catch(error){setMessage(error instanceof Error?error.message:'Não foi possível marcar todos como vistos.')}
  finally{setBusy(false)}
 }
 async function deleteSelected(){
  if(!selected.size)return;
  const confirmed=await confirm({title:'Excluir avisos selecionados?',description:`${selected.size} aviso(s) serão removidos permanentemente. Esta ação não pode ser desfeita.`,confirmLabel:'Excluir avisos',danger:true});if(!confirmed)return;
  setBusy(true);setMessage('');
  try{
   const ids=[...selected];
   for(let start=0;start<ids.length;start+=100){const r=await fetch('/api/admin/notifications',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({ids:ids.slice(start,start+100)})}),data:{error?:string}=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível excluir os avisos.')}
   setSelected(new Set());setMessage('Avisos selecionados excluídos.');await load();await refreshAll();
  }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível excluir os avisos.')}
  finally{setBusy(false)}
 }
 async function deleteRead(){
  const confirmed=await confirm({title:'Excluir todos os avisos vistos?',description:'Todos os avisos já marcados como vistos serão removidos. Os avisos não lidos serão mantidos.',confirmLabel:'Excluir avisos vistos',danger:true});if(!confirmed)return;
  setBusy(true);setMessage('');
  try{const r=await fetch('/api/admin/notifications',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({read:true})}),data:{error?:string;deleted?:number}=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível excluir os avisos vistos.');setSelected(new Set());setMessage(`${data.deleted||0} aviso(s) visto(s) excluído(s).`);await load();await refreshAll()}
  catch(error){setMessage(error instanceof Error?error.message:'Não foi possível excluir os avisos vistos.')}
  finally{setBusy(false)}
 }
 function toggleSelected(id:string){setSelected(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next})}
 function toggleAllLoaded(){setSelected(current=>current.size===allItems.length?new Set():new Set(allItems.map(item=>item.id)))}
 async function save(event:React.FormEvent){event.preventDefault();setSaving(true);setMessage('');try{const r=await fetch('/api/admin/notifications',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({to,from})});const data:{error?:string}=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível salvar.');setMessage('Configuração salva.');void load()}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível salvar.')}finally{setSaving(false)}}
 const items=allMode?allItems:feed?.items||[];
 return <div className="admin-notification-wrap">{dialog}<button className="admin-notification-trigger" type="button" aria-label={`Notificações: ${feed?.unread||0} não lidas`} aria-expanded={open} onClick={()=>setOpen(!open)}><Bell size={21}/>{Boolean(feed?.unread)&&<span>{feed!.unread}</span>}</button>{open&&<div className={`admin-notification-panel${allMode?' all-mode':''}`}><div className="admin-notification-head">{allMode?<button type="button" className="notification-back" onClick={()=>{setAllMode(false);setSelected(new Set());setMessage('')}}><ChevronLeft size={18}/> Recentes</button>:<strong>Avisos da agenda</strong>}<button type="button" aria-label="Fechar avisos" onClick={()=>setOpen(false)}><X size={18}/></button></div>
  <div className="notification-toolbar">{allMode?<><span className="notification-total">{feed?.total||0} aviso(s)</span><button type="button" onClick={toggleAllLoaded} disabled={!allItems.length}>{selected.size===allItems.length&&allItems.length?'Desmarcar seleção':hasMore?'Selecionar exibidos':'Selecionar todos'}</button><button type="button" onClick={()=>void markAll()} disabled={busy||!feed?.unread}><CheckCheck size={15}/> Marcar todos vistos</button><button type="button" onClick={()=>void deleteRead()} disabled={busy||!feed?.readCount}><Trash2 size={15}/> Excluir vistos</button>{selected.size>0&&<button type="button" className="notification-delete-selected" onClick={()=>void deleteSelected()} disabled={busy}><Trash2 size={15}/> Excluir selecionados ({selected.size})</button>}</>:<><button type="button" onClick={()=>void showAll()}>Visualizar todos <ChevronDown size={15}/></button><button type="button" onClick={()=>void markAll()} disabled={busy||!feed?.unread}><CheckCheck size={15}/> Marcar todos vistos</button></>}</div>
  <div className="admin-notification-list">{items.length?items.map(item=><article key={item.id} className={item.read_at?'':'unread'}>{allMode&&<label className="notification-select"><input type="checkbox" checked={selected.has(item.id)} onChange={()=>toggleSelected(item.id)}/>Selecionar</label>}<strong>{item.title}</strong><p>{item.body}</p><small>{item.email_status==='DELIVERED'?'E-mail entregue · ':item.email_status==='BOUNCED'?'E-mail rejeitado · ':item.email_status==='FAILED'?'Falha no e-mail · ':''}{dateLabel(item.created_at)}</small><div><a href={item.link} onClick={()=>void mark(item.id)}>Abrir no painel</a>{!item.read_at&&<button type="button" onClick={()=>void mark(item.id)}>Marcar como visto</button>}</div></article>):<p className="muted">Nenhum aviso ainda.</p>}</div>{allMode&&hasMore&&<button type="button" className="notification-load-more" disabled={loadingAll} onClick={()=>void loadAllPage(allItems.length)}>{loadingAll?'Carregando…':'Carregar mais avisos'}</button>}
  {message&&<p className="notification-message" role="status">{message}</p>}<PushToggle owner/><details className="admin-notification-settings"><summary>Receber por e-mail (Resend)</summary><form onSubmit={save}><label>E-mail do cabeleireiro<input type="email" required value={to} onChange={e=>setTo(e.target.value)} placeholder="eric@exemplo.com"/></label><label>Remetente verificado<input required value={from} onChange={e=>setFrom(e.target.value)} placeholder="Eric Zambonini <agenda@seudominio.com.br>"/></label><button type="submit" disabled={saving}>{saving?'Salvando…':'Salvar avisos por e-mail'}</button></form><p className="muted">{feed?.apiKeyConfigured?feed.pendingEmails?`${feed.pendingEmails} e-mail(s) aguardando envio ou correção da configuração.`:'Chave de envio configurada.':'Falta configurar a chave RESEND_API_KEY no ambiente do site.'}</p><p className="muted">{feed?.webhookConfigured?'Webhook de entrega configurado.':'Para acompanhar entregas, configure RESEND_WEBHOOK_SECRET e o webhook no Resend.'}</p>{feed?.items.find(item=>item.email_error)?.email_error&&<p className="error" role="alert">Última tentativa: {feed.items.find(item=>item.email_error)?.email_error}</p>}</details></div>}</div>;
}
