import Link from 'next/link';
import { getViewer, googleClientId } from '@/lib/auth';
import { db } from '@/lib/server';
import GoogleLogin from './google-login';
import SignOut from './sign-out';
import BookingActions from './booking-actions';
import ReceiptUpload from './receipt-upload';
import ClientChat from './chat';
export const dynamic='force-dynamic';
type Booking={id:string;date:string;time:string;name:string;phone:string;service_name:string;status:string;payment_method:string;payment_status:string;price_cents:number};
export default async function ClientPage(){
  const viewer=await getViewer();let bookings:Booking[]=[];
  if(viewer)try{bookings=(await db().prepare('SELECT b.id, b.date, b.time, b.name, b.phone, b.status, b.payment_method, b.payment_status, b.price_cents, s.name AS service_name FROM bookings b JOIN services s ON b.service_id = s.id WHERE b.user_sub = ? ORDER BY b.date DESC, b.time DESC').bind(viewer.sub).all<Booking>()).results;}catch{}
  return <main className="booking-page"><header className="mini-header wrap"><Link href="/" className="brand">ERIC <span>ZAMBONINI</span></Link><Link href="/">Voltar ao site</Link></header><div className="wrap client-content"><p className="eyebrow">ÁREA DO CLIENTE</p>{viewer?<><div className="client-heading"><div><h1>Olá, {viewer.name.split(' ')[0]}</h1><p>Seus horários ficam reunidos aqui.</p></div><SignOut/></div><Link className="button" href="/agendar">Agendar serviço</Link><h2>Meus agendamentos</h2>{bookings.length?<div className="booking-list">{bookings.map(b=><div key={b.id}><strong>{b.date.split('-').reverse().join('/')} às {b.time}</strong><span>{b.service_name} · {b.status==='CONFIRMED'?'Confirmado':b.status==='CANCELLED'?'Cancelado':b.status} · {(b.price_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>{b.status!=='CANCELLED'&&<>{b.payment_method==='PIX'&&<ReceiptUpload id={b.id} status={b.payment_status}/>}<BookingActions id={b.id}/></>}</div>)}</div>:<div className="empty">Você ainda não tem agendamentos.</div>}<ClientChat/></>:<><h1>Entre para ver seus horários</h1><p>Use sua conta Google para acessar o painel e agendar.</p><GoogleLogin clientId={googleClientId()}/></>}</div></main>
}
