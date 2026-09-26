'use client';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';

type Booking={id:string;date:string;time:string;name:string;phone:string;email:string|null;user_sub:string|null;status:string;service_name:string;price_cents:number;payment_method:string;payment_status:string};
const salonToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const weekdays=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const money=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dateLabel=(date:string)=>new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
export default function BookingCalendar({revision}:{revision:number}){
 const today=salonToday();
 const [month,setMonth]=useState(today.slice(0,7));
 const [selected,setSelected]=useState(today);
 const [bookings,setBookings]=useState<Booking[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [year,number]=month.split('-').map(Number);
 const first=new Date(Date.UTC(year,number-1,1)).getUTCDay();
 const count=new Date(Date.UTC(year,number,0)).getUTCDate();
 const title=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,number-1,1)));
 const byDate=new Map<string,Booking[]>();
 for(const booking of bookings){const day=byDate.get(booking.date)||[];day.push(booking);byDate.set(booking.date,day)}
 useEffect(()=>{let active=true;fetch(`/api/admin/bookings?month=${month}`,{cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error('Não foi possível carregar o calendário.');return response.json() as Promise<Booking[]>}).then(data=>{if(active){setBookings(data);setError('')}}).catch(()=>{if(active)setError('Não foi possível carregar o calendário.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[month,revision]);
 function move(delta:number){const value=new Date(Date.UTC(year,number-1+delta,1)).toISOString().slice(0,7);setMonth(value);setSelected(`${value}-01`);setLoading(true)}
 const dayBookings=(byDate.get(selected)||[]).filter(item=>item.status!=='CANCELLED');
 return <section className="form-panel full admin-calendar-panel">
  <div className="admin-calendar-heading"><h2>Calendário de agendamentos</h2><div><button type="button" onClick={()=>move(-1)} aria-label="Mês anterior"><ChevronLeft size={20}/></button><strong aria-live="polite">{title}</strong><button type="button" onClick={()=>move(1)} aria-label="Próximo mês"><ChevronRight size={20}/></button></div></div>
  {error&&<p role="alert" className="error">{error}</p>}
  <div className="admin-calendar-grid" aria-label="Agendamentos por dia">{weekdays.map(day=><span className="admin-calendar-weekday" key={day}>{day}</span>)}{Array.from({length:first},(_,i)=><span key={`blank-${i}`} aria-hidden="true"/>)}{Array.from({length:count},(_,i)=>{const date=`${month}-${String(i+1).padStart(2,'0')}`;const total=(byDate.get(date)||[]).filter(item=>item.status!=='CANCELLED').length;return <button key={date} type="button" className={selected===date?'selected':''} aria-pressed={selected===date} aria-label={`${dateLabel(date)}: ${total} cliente${total===1?'':'s'} agendado${total===1?'':'s'}`} onClick={()=>setSelected(date)}><span>{i+1}</span>{total>0&&<strong>{total} cliente{total===1?'':'s'}</strong>}</button>})}</div>
  <div className="admin-calendar-day"><h3>{dateLabel(selected)}</h3>{loading?<p className="muted" role="status">Carregando agendamentos...</p>:dayBookings.length?<div className="admin-calendar-bookings">{dayBookings.map(booking=><details key={booking.id}><summary><strong>{booking.time}</strong><span>{booking.name} · {booking.service_name}</span></summary><div><p><strong>Telefone:</strong> {booking.phone}</p>{booking.email&&<p><strong>E-mail:</strong> {booking.email}</p>}<p><strong>Valor:</strong> {money(booking.price_cents)} · <strong>Pagamento:</strong> {booking.payment_method==='PIX'?`Pix (${booking.payment_status})`:booking.payment_status==='PAID'?'Pago no atendimento':'Pendente no atendimento'}</p>{booking.user_sub&&<a className="admin-calendar-chat" href={`/admin/chat?sub=${encodeURIComponent(booking.user_sub)}`}><MessageCircle size={17}/> Abrir chat com cliente</a>}</div></details>)}</div>:<p className="muted">Nenhum agendamento neste dia.</p>}</div>
 </section>;
}
