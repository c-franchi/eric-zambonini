'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Send, MessageCircle } from 'lucide-react';

type Contact={sub:string;name:string;email:string};
type Message={id:string;sender:string;body:string;created_at?:string};

export default function AdminChat(){
  const [contacts,setContacts]=useState<Contact[]>([]),[selected,setSelected]=useState(''),[messages,setMessages]=useState<Message[]>([]),[body,setBody]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[query,setQuery]=useState('');
  const endRef=useRef<HTMLDivElement>(null),sendingRef=useRef(false),pendingId=useRef<string|null>(null),messagesRef=useRef<Message[]>([]),loadedRef=useRef(false),scrollOnUpdate=useRef(false);
  useEffect(()=>{messagesRef.current=messages},[messages]);
  const filtered=useMemo(()=>contacts.filter(contact=>`${contact.name} ${contact.email}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))),[contacts,query]);
  useEffect(()=>{const requested=new URLSearchParams(window.location.search).get('sub')||'';fetch('/api/admin/chat').then(response=>response.json()).then(data=>{if(Array.isArray(data)){setContacts(data);if(requested&&data.some((contact:Contact)=>contact.sub===requested))setSelected(requested)}}).catch(()=>setStatus('Não foi possível carregar os clientes.'))},[]);
  useEffect(()=>{if(!selected)return;const load=()=>fetch(`/api/admin/chat?sub=${encodeURIComponent(selected)}`,{cache:'no-store'}).then(response=>response.json()).then(data=>{if(Array.isArray(data)){const previous=messagesRef.current.at(-1)?.id,newest=data.at(-1)?.id;if(loadedRef.current&&newest&&newest!==previous&&window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-300)scrollOnUpdate.current=true;loadedRef.current=true;setMessages(data)}}).catch(()=>{});const initial=window.setTimeout(()=>void load(),0);const timer=setInterval(()=>void load(),20000);return()=>{clearTimeout(initial);clearInterval(timer)}},[selected]);
  useEffect(()=>{if(!scrollOnUpdate.current)return;scrollOnUpdate.current=false;endRef.current?.scrollIntoView({behavior:'smooth'})},[messages]);
  async function send(event:React.FormEvent){
    event.preventDefault();const text=body.trim();if(!selected||!text||sendingRef.current)return;
    sendingRef.current=true;setBusy(true);setStatus('Enviando…');const id=pendingId.current||crypto.randomUUID();pendingId.current=id;
    scrollOnUpdate.current=true;setMessages(current=>[...current,{id,sender:'OWNER',body:text,created_at:new Date().toISOString()}]);
    try{
      const response=await fetch('/api/admin/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sub:selected,body:text,message_id:id})});
      if(!response.ok){const data=await response.json().catch(()=>({})) as {error?:string};throw Error(data.error||'Não foi possível enviar.')}
      setBody('');pendingId.current=null;setStatus('Mensagem enviada.');void fetch(`/api/admin/chat?sub=${encodeURIComponent(selected)}`,{cache:'no-store'}).then(result=>result.json()).then(data=>{if(Array.isArray(data))setMessages(data)}).catch(()=>{});
    }catch(error){setMessages(current=>current.filter(message=>message.id!==id));setStatus(error instanceof Error?error.message:'Não foi possível enviar.')}
    finally{sendingRef.current=false;setBusy(false)}
  }
  const active=contacts.find(contact=>contact.sub===selected);
  return <section className="form-panel full"><h2>Mensagens de clientes</h2><div className="admin-chat-layout"><aside className="admin-chat-contacts"><label className="chat-search"><Search size={18}/><input type="search" placeholder="Buscar cliente pelo nome" value={query} onChange={event=>setQuery(event.target.value)} aria-label="Buscar cliente pelo nome"/></label><div className="admin-chat-contact-list">{filtered.map(contact=><button type="button" key={contact.sub} className={selected===contact.sub?'active':''} onClick={()=>{loadedRef.current=false;messagesRef.current=[];setSelected(contact.sub);setMessages([]);setStatus('')}}><span className="chat-avatar">{contact.name.trim().charAt(0).toUpperCase()}</span><span><strong>{contact.name}</strong><small>{contact.email}</small></span></button>)}{!filtered.length&&<p className="muted">Nenhum cliente encontrado.</p>}</div></aside><div className="admin-chat-conversation">{selected?<><header className="chat-conversation-head"><span className="chat-avatar">{active?.name.trim().charAt(0).toUpperCase()}</span><div><strong>{active?.name}</strong><small>Conversa privada</small></div></header><div className="chat-messages whatsapp-chat" aria-live="polite">{messages.length?messages.map(message=><article key={message.id} className={`chat-bubble ${message.sender==='OWNER'?'outgoing':'incoming'}`}><p>{message.body}</p><time>{message.created_at?new Date(message.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''}</time></article>):<p className="chat-empty"><MessageCircle size={24}/>As mensagens desta conversa aparecerão aqui.</p>}<div ref={endRef}/></div><form className="admin-chat-compose" onSubmit={send}><textarea aria-label="Resposta" placeholder="Digite uma mensagem" required maxLength={2000} rows={2} value={body} onChange={event=>{setBody(event.target.value);pendingId.current=null}} disabled={busy}/><button className="button" type="submit" aria-label="Enviar mensagem" title={busy?'Enviando mensagem':'Enviar mensagem'} disabled={busy||!body.trim()}><Send size={19}/></button></form></>:<div className="chat-empty"><MessageCircle size={30}/><strong>Selecione uma conversa</strong><span>Escolha um cliente na lista para ver as mensagens.</span></div>}{status&&<p role="status">{status}</p>}</div></div></section>;
}
