'use client';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
type Message={id:string;sender:string;body:string;created_at:string};
export default function ClientChat(){const [messages,setMessages]=useState<Message[]>([]),[body,setBody]=useState(''),[status,setStatus]=useState('');const endRef=useRef<HTMLDivElement>(null);
  async function load(){const response=await fetch('/api/chat');const data=await response.json();if(Array.isArray(data))setMessages(data)}
  useEffect(()=>{void load();const timer=setInterval(()=>void load(),20000);return()=>clearInterval(timer)},[]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages]);
  async function send(event:React.FormEvent){event.preventDefault();const response=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({body})});if(response.ok){setBody('');setStatus('');void load()}else setStatus('Não foi possível enviar a mensagem.')}
  return <section className="form-panel client-chat-panel"><header className="chat-conversation-head"><span className="chat-avatar"><MessageCircle size={20}/></span><div><h2>Converse com o Eric</h2><small>Envie uma mensagem sobre seu atendimento</small></div></header><div className="chat-messages whatsapp-chat" aria-live="polite">{messages.length?messages.map(m=><article key={m.id} className={`chat-bubble ${m.sender==='OWNER'?'incoming':'outgoing'}`}><p>{m.body}</p><time>{new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time></article>):<div className="chat-empty"><MessageCircle size={27}/><strong>Nenhuma mensagem por enquanto</strong><span>Quando precisar, fale com o estabelecimento por aqui.</span></div>}<div ref={endRef}/></div><form className="admin-chat-compose" onSubmit={send}><textarea aria-label="Sua mensagem" placeholder="Digite uma mensagem" value={body} onChange={e=>setBody(e.target.value)} maxLength={2000} required rows={2}/><button className="button" type="submit" aria-label="Enviar mensagem"><Send size={19}/></button></form>{status&&<p role="alert">{status}</p>}</section>;
}
