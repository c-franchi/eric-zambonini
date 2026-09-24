'use client';
import { useEffect, useState } from 'react';
type Message={id:string;sender:string;body:string;created_at:string};
export default function ClientChat(){const [messages,setMessages]=useState<Message[]>([]),[body,setBody]=useState(''),[status,setStatus]=useState('');
  async function load(){const response=await fetch('/api/chat');const data=await response.json();if(Array.isArray(data))setMessages(data)}
  useEffect(()=>{void load();const timer=setInterval(()=>void load(),20000);return()=>clearInterval(timer)},[]);
  async function send(event:React.FormEvent){event.preventDefault();const response=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({body})});if(response.ok){setBody('');setStatus('');void load()}else setStatus('Não foi possível enviar a mensagem.')}
  return <section className="form-panel"><h2>Mensagens</h2><div className="chat-messages" aria-live="polite">{messages.map(m=><p key={m.id}><strong>{m.sender==='OWNER'?'Estabelecimento':'Você'}:</strong> {m.body}</p>)}</div><form className="stack" onSubmit={send}><label>Sua mensagem<textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={2000} required rows={3}/></label><button className="button" type="submit">Enviar mensagem</button></form>{status&&<p role="alert">{status}</p>}</section>;
}
