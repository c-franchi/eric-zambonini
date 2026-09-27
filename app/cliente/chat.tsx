'use client';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';

type Message={id:string;sender:string;body:string;created_at:string};

export default function ClientChat(){
  const [messages,setMessages]=useState<Message[]>([]),[body,setBody]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const endRef=useRef<HTMLDivElement>(null),sendingRef=useRef(false),pendingId=useRef<string|null>(null),messagesRef=useRef<Message[]>([]),loadedRef=useRef(false),scrollOnUpdate=useRef(false);
  useEffect(()=>{messagesRef.current=messages},[messages]);
  async function load(){try{const response=await fetch('/api/chat',{cache:'no-store'});const data=await response.json();if(Array.isArray(data)){const previous=messagesRef.current.at(-1)?.id,newest=data.at(-1)?.id;if(loadedRef.current&&newest&&newest!==previous&&window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-300)scrollOnUpdate.current=true;loadedRef.current=true;setMessages(data)}}catch{}}
  useEffect(()=>{const initial=window.setTimeout(()=>void load(),0);const timer=setInterval(()=>void load(),20000);return()=>{clearTimeout(initial);clearInterval(timer)}},[]);
  useEffect(()=>{if(!scrollOnUpdate.current)return;scrollOnUpdate.current=false;endRef.current?.scrollIntoView({behavior:'smooth'})},[messages]);
  async function send(event:React.FormEvent){
    event.preventDefault();
    const text=body.trim();
    if(!text||sendingRef.current)return;
    sendingRef.current=true;setBusy(true);setStatus('Enviando…');
    const id=pendingId.current||crypto.randomUUID();pendingId.current=id;
    const optimistic:Message={id,sender:'CLIENT',body:text,created_at:new Date().toISOString()};
    scrollOnUpdate.current=true;setMessages(current=>[...current,optimistic]);
    try{
      const response=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({body:text,message_id:id})});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error||'Não foi possível enviar a mensagem.')}
      setBody('');pendingId.current=null;setStatus('Mensagem enviada.');void load();
    }catch(error){setMessages(current=>current.filter(message=>message.id!==id));setStatus(error instanceof Error?error.message:'Não foi possível enviar a mensagem.');}
    finally{sendingRef.current=false;setBusy(false)}
  }
  return <section id="chat" className="form-panel client-chat-panel"><header className="chat-conversation-head"><span className="chat-avatar"><MessageCircle size={20}/></span><div><h2>Converse com o Eric</h2><small>Envie uma mensagem sobre seu atendimento</small></div></header><div className="chat-messages whatsapp-chat" aria-live="polite">{messages.length?messages.map(message=><article key={message.id} className={`chat-bubble ${message.sender==='OWNER'?'incoming':'outgoing'}`}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time></article>):<div className="chat-empty"><MessageCircle size={27}/><strong>Nenhuma mensagem por enquanto</strong><span>Quando precisar, fale com o estabelecimento por aqui.</span></div>}<div ref={endRef}/></div><form className="admin-chat-compose" onSubmit={send}><textarea aria-label="Sua mensagem" placeholder="Digite uma mensagem" value={body} onChange={event=>{setBody(event.target.value);pendingId.current=null}} maxLength={2000} required rows={2} disabled={busy}/><button className="button" type="submit" aria-label="Enviar mensagem" title={busy?'Enviando mensagem':'Enviar mensagem'} disabled={busy||!body.trim()}><Send size={19}/></button></form>{status&&<p role="status">{status}</p>}</section>;
}
