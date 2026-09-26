import { getViewer, googleClientId } from '@/lib/auth';
import { db } from '@/lib/server';
import AccountAccess from './account-access';
import SignOut from './sign-out';
import BookingActions from './booking-actions';
import ReceiptUpload from './receipt-upload';
import ClientChat from './chat';
import Profile from './profile';
import { expireUnpaidPix } from '@/lib/pix-expiry';
export const dynamic='force-dynamic';
type Booking={id:string;service_id:string;date:string;time:string;name:string;phone:string;service_name:string;status:string;payment_method:string;payment_status:string;price_cents:number};
export default async function ClientPage({searchParams}:{searchParams:Promise<{service?:string}>}){
  const requestedService=(await searchParams).service;
  const returnTo=requestedService&&/^[\w-]{1,100}$/.test(requestedService)?`/agendar?service=${encodeURIComponent(requestedService)}`:'/cliente';
  const viewer=await getViewer();let bookings:Booking[]=[];
  if(viewer)try{const database=db();await expireUnpaidPix(database);bookings=(await database.prepare('SELECT b.id, b.service_id, b.date, b.time, b.name, b.phone, b.status, b.payment_method, b.payment_status, b.price_cents, s.name AS service_name FROM bookings b JOIN services s ON b.service_id = s.id WHERE b.user_sub = ? ORDER BY b.date DESC, b.time DESC').bind(viewer.sub).all<Booking>()).results;}catch{}
  return <main className="booking-page"><header className="mini-header wrap"><a href="/" className="brand">ERIC <span>ZAMBONINI</span></a><a href="/">Voltar à página inicial</a></header><div className={`wrap client-content${viewer?'':' access-page'}`}><p className="eyebrow">ÁREA DO CLIENTE</p>{viewer?<><div className="client-heading"><div><h1>Olá, {viewer.name.split(' ')[0]}</h1><p>Seus horários ficam reunidos aqui.</p></div><SignOut/></div><a className="button" href={returnTo}>Agendar serviço</a><h2>Meus agendamentos</h2>{bookings.length?<div className="booking-list">{bookings.map(b=><div key={b.id}><strong>{b.date.split('-').reverse().join('/')} às {b.time}</strong><span>{b.service_name} · {b.status==='CANCELLED'?'Cancelado':b.payment_status==='AWAITING_PAYMENT'?'Aguardando Pix':b.payment_status==='REVIEW'?'Comprovante em análise':'Confirmado'} · {(b.price_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>{b.status!=='CANCELLED'&&<>{b.payment_method==='PIX'&&<ReceiptUpload id={b.id} status={b.payment_status}/>}<BookingActions id={b.id} serviceId={b.service_id}/></>}</div>)}</div>:<div className="empty">Você ainda não tem agendamentos.</div>}<Profile/><ClientChat/></>:<><h1>Seus horários, em um só lugar</h1><p>Entre para agendar e acompanhar seus atendimentos.</p><AccountAccess clientId={googleClientId()} redirectTo={returnTo}/></>}</div></main>
}
