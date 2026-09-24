'use client';
import { useEffect, useState } from 'react';
type Rules={minHours:number;maxDays:number;cancelHours:number};
export default function RulesPanel(){const [rules,setRules]=useState<Rules>({minHours:2,maxDays:60,cancelHours:12}),[message,setMessage]=useState('');
 useEffect(()=>{fetch('/api/admin/rules').then(r=>r.json() as Promise<Rules>).then(data=>{if(Number.isInteger(data?.minHours))setRules(data)}).catch(()=>{})},[]);
 async function save(event:React.FormEvent){event.preventDefault();const response=await fetch('/api/admin/rules',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(rules)});const data:{error?:string}=await response.json();setMessage(response.ok?'Regras salvas.':data.error||'Falha ao salvar.')}
 return <section className="form-panel"><h2>Regras da agenda</h2><form className="stack" onSubmit={save}><label>Antecedência mínima para agendar (horas)<input type="number" min={0} max={168} required value={rules.minHours} onChange={e=>setRules({...rules,minHours:Number(e.target.value)})}/></label><label>Até quantos dias no futuro<input type="number" min={1} max={365} required value={rules.maxDays} onChange={e=>setRules({...rules,maxDays:Number(e.target.value)})}/></label><label>Prazo para cancelar ou remarcar (horas antes)<input type="number" min={0} max={168} required value={rules.cancelHours} onChange={e=>setRules({...rules,cancelHours:Number(e.target.value)})}/></label><button type="submit" className="button">Salvar regras</button></form>{message&&<p role="status">{message}</p>}</section>
}
