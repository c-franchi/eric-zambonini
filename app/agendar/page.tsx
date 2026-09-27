import BookingForm from './booking-form';
import { googleClientId } from '@/lib/auth';
import { db } from '@/lib/server';
import { ensureServiceCatalog } from '@/lib/service-catalog';
import type { Service } from '@/lib/booking';
export default async function BookPage({searchParams}:{searchParams:Promise<{service?:string;date?:string;time?:string}>}) {
  const requested=await searchParams;
  let services:Service[]=[];
  try{await ensureServiceCatalog();services=(await db().prepare('SELECT id, name, icon, description, duration_min, price_cents, price_variable, allow_in_person_payment FROM services WHERE active = 1 ORDER BY name').all<Service>()).results}catch{}
  return <main className="booking-page"><header className="mini-header wrap client-topbar"><a href="/" className="client-brand" aria-label="Eric Zambonini — página inicial"><img src="/images/eric-zambonini-horizontal-v2.png" alt="Eric Zambonini — Beleza masculina e feminina" width="1420" height="180"/></a><nav aria-label="Navegação do agendamento"><a href="/">Página inicial</a><a href="/cliente">Área do cliente</a></nav></header><div className="wrap booking-layout"><div><p className="eyebrow">AGENDAMENTO</p><h1>Reserve seu horário</h1><p>Escolha o serviço, o dia e um horário disponível.</p></div><BookingForm initialServices={services} requestedService={requested.service||''} requestedDate={requested.date||''} requestedTime={requested.time||''} googleId={googleClientId()}/></div></main>;
}
