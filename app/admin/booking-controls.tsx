'use client';
import { useEffect, useState } from 'react';
import { Pencil, Trash2, XCircle } from 'lucide-react';
import type { Service } from '@/lib/booking';
import ServicePicker from '@/app/service-picker';
import { useConfirmAction } from '@/app/confirm-action';

type ManagedService=Service&{active:number};
type Appointment={id:string;service_id:string;date:string;time:string;name:string;phone:string;payment_status:string};
export function DeleteCancelledBooking({id,paid=false,updated}:{id:string;paid?:boolean;updated:()=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const {confirm,dialog}=useConfirmAction();
 async function remove(){
  const confirmed=await confirm({title:'Excluir agendamento cancelado?',description:paid?'O agendamento e seu registro de pagamento serão removidos permanentemente. Esta ação não pode ser desfeita.':'O registro será removido permanentemente do histórico. Esta ação não pode ser desfeita.',confirmLabel:'Excluir agendamento',danger:true});
  if(!confirmed)return;
  setBusy(true);setMessage('');
  try{const response=await fetch(`/api/admin/bookings?id=${encodeURIComponent(id)}`,{method:'DELETE'});const data:{error?:string}=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível excluir.');setMessage('Agendamento excluído.');updated()}
  catch(error){setMessage(error instanceof Error?error.message:'Não foi possível excluir.')}
  finally{setBusy(false)}
 }
 return <>{dialog}<div className="admin-booking-controls"><div className="admin-row-actions"><button type="button" disabled={busy} onClick={()=>void remove()}><Trash2 size={15}/> {busy?'Excluindo…':'Excluir'}</button></div>{message&&<p className="admin-booking-feedback" role="status">{message}</p>}</div></>
}
export default function BookingControls({booking,updated}:{booking:Appointment;updated:()=>void}){
 const [open,setOpen]=useState(false),[services,setServices]=useState<ManagedService[]>([]),[service,setService]=useState(booking.service_id),[date,setDate]=useState(booking.date),[time,setTime]=useState(booking.time),[name,setName]=useState(booking.name),[phone,setPhone]=useState(booking.phone),[times,setTimes]=useState<string[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const {confirm,dialog}=useConfirmAction();
 useEffect(()=>{if(!open)return;fetch('/api/admin/services',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(Array.isArray(data))setServices(data.filter((item:ManagedService)=>item.active||item.id===booking.service_id))}).catch(()=>setMessage('Não foi possível carregar os serviços.'))},[booking.service_id,open]);
 useEffect(()=>{if(!open||!service||!date)return;let active=true;setTime('');fetch(`/api/availability?service=${encodeURIComponent(service)}&date=${encodeURIComponent(date)}&exclude=${encodeURIComponent(booking.id)}`,{cache:'no-store'}).then(r=>r.json() as Promise<{times?:string[]}>).then(data=>{if(active)setTimes(Array.isArray(data.times)?data.times:[])}).catch(()=>{if(active)setTimes([])});return()=>{active=false}},[booking.id,date,open,service]);
 async function save(event:React.FormEvent){event.preventDefault();setBusy(true);setMessage('');try{const response=await fetch('/api/admin/bookings',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:booking.id,action:'edit',service_id:service,date,time,name,phone})});const data:{error?:string}=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível salvar.');setMessage('Agendamento atualizado e cliente avisado.');setOpen(false);updated()}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível salvar.')}finally{setBusy(false)}}
 async function cancel(){const paid=booking.payment_status==='PAID';const confirmed=await confirm({title:'Cancelar agendamento?',description:paid?'Este agendamento está pago. O cancelamento libera o horário. Combine o reembolso diretamente com o cliente.':'O horário será liberado para outro cliente.',confirmLabel:'Cancelar agendamento',danger:true});if(!confirmed)return;setBusy(true);setMessage('');try{const response=await fetch('/api/admin/bookings',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:booking.id,action:'cancel'})});const data:{error?:string}=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível cancelar.');setMessage('Agendamento cancelado; o horário foi liberado.');updated()}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível cancelar.')}finally{setBusy(false)}}
 return <>{dialog}<div className="admin-booking-controls"><div className="admin-row-actions"><button type="button" disabled={busy} onClick={()=>setOpen(value=>!value)}><Pencil size={15}/> {open?'Fechar edição':'Editar'}</button><button type="button" disabled={busy} onClick={()=>void cancel()}><XCircle size={15}/> Cancelar agendamento</button></div>{open&&<form className="admin-booking-editor stack" onSubmit={save}><div className="service-picker-field"><span className="field-title">Serviço</span><ServicePicker services={services} value={service} onChange={setService} placeholder="Carregando serviços..." disabled={!services.length}/></div><div className="admin-form-two"><label>Data<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><label>Horário disponível<select required value={time} onChange={e=>setTime(e.target.value)}><option value="">{times.length?'Selecione o horário':'Nenhum horário disponível'}</option>{times.map(item=><option key={item} value={item}>{item}</option>)}</select></label></div><label>Nome do cliente<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><label>Telefone<input required value={phone} onChange={e=>setPhone(e.target.value)}/></label><button className="button" disabled={busy||!time} type="submit">Salvar alterações</button></form>}{message&&<p className="admin-booking-feedback" role="status">{message}</p>}</div></>;
}
