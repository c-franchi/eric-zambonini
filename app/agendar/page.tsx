import Link from 'next/link';
import BookingForm from './booking-form';
import { googleClientId } from '@/lib/auth';
export default async function BookPage({searchParams}:{searchParams:Promise<{service?:string;date?:string;time?:string}>}) {
  const requested=await searchParams;
  return <main className="booking-page"><header className="mini-header wrap"><Link href="/" className="brand">ERIC <span>ZAMBONINI</span></Link><Link href="/">Voltar ao site</Link></header><div className="wrap booking-layout"><div><p className="eyebrow">AGENDAMENTO</p><h1>Reserve seu horário</h1><p>Escolha o serviço, o dia e um horário disponível.</p></div><BookingForm requestedService={requested.service||''} requestedDate={requested.date||''} requestedTime={requested.time||''} googleId={googleClientId()}/></div></main>;
}
