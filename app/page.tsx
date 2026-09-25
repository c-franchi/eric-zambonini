import Link from 'next/link';
import { ArrowRight, Award, CalendarDays, Clock3, Menu, Scissors, UsersRound } from 'lucide-react';
import { db } from '@/lib/server';
import type { Service } from '@/lib/booking';
import { fallbackProfile } from '@/lib/profile';

export const dynamic = 'force-dynamic';
const works = [
  ['corte2.webp', 'Corte masculino clássico'], ['corte3.webp', 'Corte texturizado'],
  ['corte4.webp', 'Alisamento e finalização'], ['corte5.webp', 'Design de sobrancelhas'],
  ['corte6.webp', 'Degradê moderno'], ['corte7.webp', 'Corte social'],
];
export default async function Home() {
  let services: Service[] = [];
  let portfolio: {id:string;title:string;alt_text:string}[]=[];
  let profile=fallbackProfile;
  try { services = (await db().prepare('SELECT id, name, description, duration_min, price_cents FROM services WHERE active = 1 ORDER BY name').all<Service>()).results; } catch {}
  try { portfolio=(await db().prepare('SELECT id,title,alt_text FROM portfolio WHERE active=1 ORDER BY sort_order,title LIMIT 30').all<{id:string;title:string;alt_text:string}>()).results; } catch {}
  try { const row=await db().prepare("SELECT value FROM settings WHERE key='barber_profile'").first<{value:string}>();if(row) profile=JSON.parse(row.value); } catch {}
  return <div className="site-shell">
    <header className="topbar"><div className="wrap nav"><Link className="brand" href="/"><span className="brand-mark">EZ</span><span className="brand-word">ERIC <span>ZAMBONINI</span><small>BELEZA MASCULINA E FEMININA</small></span></Link><nav aria-label="Navegação principal"><a href="#servicos">Serviços</a><a href="#trabalhos">Trabalhos</a><a href="#sobre">Sobre</a><Link href="/cliente">Área do cliente</Link><Link className="pill" href="/agendar">Agendar horário</Link></nav><details className="mobile-menu"><summary aria-label="Abrir menu"><Menu size={25}/></summary><div><a href="#servicos">Serviços</a><a href="#trabalhos">Trabalhos</a><a href="#sobre">Sobre</a><Link href="/cliente">Área do cliente</Link><Link href="/agendar">Agendar horário</Link></div></details></div></header>
    <main>
      <section className="hero"><div className="hero-photo" /><div className="hero-shade" /><div className="wrap hero-content"><p className="eyebrow">SEU ESTILO, EM BOAS MÃOS</p><div className="hero-monogram" aria-hidden="true">EZ</div><h1>Eric Zambonini</h1><p className="hero-subtitle">BELEZA MASCULINA E FEMININA</p><div className="hero-highlights"><span><Award/> Mais de {profile.yearsExperience} anos de experiência</span><span><UsersRound/> Beleza masculina e feminina</span><span><CalendarDays/> Escolha seu horário pela agenda</span></div><div className="hero-actions"><Link className="button" href="/agendar"><CalendarDays size={21}/> Agendar horário <ArrowRight size={19}/></Link><a className="button secondary" href="#servicos">Ver serviços</a></div></div></section>
      <section className="section wrap" id="servicos"><div className="section-head"><p className="eyebrow">ESCOLHA O SEU CUIDADO</p><h2>Serviços</h2><p>Confira os valores e reserve o melhor horário.</p></div>{services.length ? <div className="service-grid">{services.map(s => <article className="service-card" key={s.id}><div className="service-icon"><Scissors size={27}/></div><div className="service-details"><h3>{s.name}</h3>{s.description && <p>{s.description}</p>}<div className="service-meta"><span><Clock3 size={17}/> {s.duration_min} min</span><strong>{(s.price_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div></div><Link className="service-link" href={`/agendar?service=${encodeURIComponent(s.id)}`} aria-label={`Agendar ${s.name}`}><ArrowRight size={22}/></Link></article>)}</div> : <div className="empty">Os serviços e horários estão sendo preparados. Volte em breve.</div>}</section>
      <section className="works section" id="trabalhos"><div className="wrap"><div className="section-head"><p className="eyebrow">PORTFÓLIO</p><h2>Trabalhos realizados</h2></div><div className="work-grid">{(portfolio.length?portfolio.map(item=>[String(item.id),item.title,item.alt_text]):works.map(([image,title])=>[image,title,title])).map(([image,title,alt])=><figure key={image}><img src={portfolio.length?`/api/portfolio/${image}`:`/images/${image}`} alt={alt} loading="lazy"/><figcaption>{title}</figcaption></figure>)}</div></div></section>
      <section className="section wrap about" id="sobre"><div className="years"><strong>{profile.yearsExperience}+</strong><span>anos de experiência profissional</span></div><div><p className="eyebrow">SOBRE O PROFISSIONAL</p><h2>Experiência que acompanha o seu estilo</h2><p>{profile.bio}</p><a className="button outline" href="https://g.page/r/CWECIhz8246XECE/review" target="_blank" rel="noreferrer">Avaliar no Google</a></div></section>
    </main><footer className="footer"><div className="wrap footer-inner"><div><strong>Eric Zambonini</strong><p>Beleza masculina e feminina.</p></div><div><a href="https://www.instagram.com/zamboninieric/" target="_blank" rel="noreferrer">Instagram</a><a href="/admin">Área de gestão</a></div></div></footer>
  </div>;
}
