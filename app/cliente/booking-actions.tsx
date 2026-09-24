'use client';
import { useState } from 'react';
export default function BookingActions({id}:{id:string}){
  const [open,setOpen]=useState(false),[date,setDate]=useState(''),[time,setTime]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function act(action:'cancel'|'reschedule'){
    if(action==='cancel'&&!window.confirm('Cancelar este agendamento?'))return;
    setBusy(true);setMessage('');try{const r=await fetch('/api/cliente/bookings',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,action,date,time})});const d:{error?:string}=await r.json();if(!r.ok)throw Error(d.error||'Falha ao atualizar');window.location.reload()}catch(e){setMessage(e instanceof Error?e.message:'Falha ao atualizar')}finally{setBusy(false)}
  }
  return <div className="booking-actions"><button disabled={busy} type="button" onClick={()=>setOpen(!open)}>Remarcar</button><button disabled={busy} type="button" onClick={()=>void act('cancel')}>Cancelar</button>{open&&<div className="stack"><label>Nova data<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Novo horário (consulte a disponibilidade antes de confirmar)<input type="time" step="900" value={time} onChange={e=>setTime(e.target.value)}/></label><button disabled={!date||!time||busy} type="button" onClick={()=>void act('reschedule')}>Confirmar remarcação</button></div>}{message&&<p role="alert">{message}</p>}</div>;
}
