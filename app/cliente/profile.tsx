'use client';
import { useEffect, useState } from 'react';
export default function Profile(){const [name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{fetch('/api/cliente/profile').then(r=>r.json() as Promise<{name?:string;email?:string;phone?:string}>).then(data=>{if(data.name){setName(data.name);setEmail(data.email||'');setPhone(data.phone||'')}}).catch(()=>{})},[]);
 async function save(event:React.FormEvent){event.preventDefault();const response=await fetch('/api/cliente/profile',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({name,phone})});const data:{error?:string}=await response.json();setMessage(response.ok?'Perfil atualizado.':data.error||'Falha ao atualizar.')}
 return <section className="form-panel"><h2>Meus dados</h2><form className="stack" onSubmit={save}><label>Nome<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><label>E-mail Google<input readOnly value={email}/></label><label>Telefone<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label><button className="button" type="submit">Salvar dados</button></form>{message&&<p role="status">{message}</p>}</section>
}
