import BrandLogo from './site-context';
import {getBrand} from '@/lib/site-settings';
import {readLicense} from '@/lib/licensing';
import {canUse} from '@/lib/plans';
import { ArrowRight, Award, CalendarDays, Clock3, ShoppingBag, UsersRound } from 'lucide-react';
import { db } from '@/lib/server';
import { durationLabel, servicePriceLabel, type Service } from '@/lib/booking';
import { fallbackProfile } from '@/lib/profile';
import ServiceThumbnail from './service-thumbnail';
import PortfolioCarousel from './portfolio-carousel';
import SiteHeader from './site-header';
import { ensureServiceCatalog } from '@/lib/service-catalog';
import { ensureStoreSchema } from '@/lib/store-schema';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export default async function Home() {
  const brand=await getBrand(),license=await readLicense();
  const works=brand.examples;
  const hasStore=canUse(license.plan,'loja');
  let services: Service[] = [];
  let portfolio: {id:string;title:string;alt_text:string}[]=[];
  let products: {id:string;name:string;description:string;price_cents:number;stock:number;allow_preorder:number;image_key:string|null;updated_at:string}[]=[];
  let profile={name:brand.name,bio:brand.bio,yearsExperience:brand.yearsExperience};
  try { await ensureServiceCatalog();services = (await db().prepare('SELECT id, name, icon, description, duration_min, price_cents, price_variable FROM services WHERE active = 1 ORDER BY name').all<Service>()).results; } catch {}
  try { portfolio=(await db().prepare('SELECT id,title,alt_text FROM portfolio WHERE active=1 ORDER BY sort_order,title LIMIT 30').all<{id:string;title:string;alt_text:string}>()).results; } catch {}
  try { if(hasStore){await ensureStoreSchema();products=(await db().prepare('SELECT id,name,description,price_cents,stock,allow_preorder,image_key,updated_at FROM products WHERE active=1 ORDER BY created_at DESC LIMIT 4').all<{id:string;name:string;description:string;price_cents:number;stock:number;allow_preorder:number;image_key:string|null;updated_at:string}>()).results;} } catch {}
  try { const row=await db().prepare("SELECT value FROM settings WHERE key='barber_profile'").first<{value:string}>();if(row) profile=JSON.parse(row.value); } catch {}
  return <div className="site-shell">
    <SiteHeader/>
    <main>
      <section className="hero"><div className="hero-photo" style={{backgroundImage:brand.heroImage?`url("${brand.heroImage}")`:'none'}}/><div className="hero-shade" /><div className="wrap hero-content"><p className="eyebrow">SEU ESTILO, EM BOAS MÃOS</p><h1 className="hero-logo"><BrandLogo hero/></h1><div className="hero-highlights"><span><Award/> Mais de {profile.yearsExperience} anos de experiência</span><span><UsersRound/> {brand.tagline}</span><span><CalendarDays/> Escolha seu horário pela agenda</span></div><div className="hero-actions"><a className="button" href="/agendar"><CalendarDays size={21}/> Agendar horário <ArrowRight size={19}/></a><a className="button secondary" href="#servicos">Ver serviços</a></div></div></section>
      <section className="section wrap" id="servicos"><div className="section-head"><p className="eyebrow">ESCOLHA O SEU CUIDADO</p><h2>Serviços</h2><p>Confira os valores e reserve o melhor horário.</p></div>{services.length ? <div className="service-grid">{services.map(s => <a className="service-card" key={s.id} href={`/agendar?service=${encodeURIComponent(s.id)}`} aria-label={`Agendar ${s.name}`}><ServiceThumbnail icon={s.icon} name={s.name}/><div className="service-details"><h3>{s.name}</h3>{s.description && <p>{s.description}</p>}<div className="service-meta"><span><Clock3 size={17}/> {durationLabel(s.duration_min)}</span><strong>{servicePriceLabel(s)}</strong></div></div><span className="service-link" aria-hidden="true"><ArrowRight size={22}/></span></a>)}</div> : <div className="empty">Os serviços e horários estão sendo preparados. Volte em breve.</div>}</section>
      {hasStore&&<section className="section works home-products" id="produtos"><div className="wrap"><div className="section-head"><p className="eyebrow">LOJA DO PROFISSIONAL</p><h2>Produtos para cuidar do seu estilo</h2><p>Compre sem precisar agendar um serviço e retire presencialmente no salão.</p></div>{products.length?<div className="home-product-grid">{products.map(product=><a className="home-product-card" key={product.id} href="/loja">{product.image_key?<img src={`/api/products/${product.id}/image?v=${encodeURIComponent(product.updated_at)}`} alt={product.name} loading="lazy"/>:<span className="home-product-placeholder"><ShoppingBag size={30}/></span>}<span className="home-product-copy"><strong>{product.name}</strong><span>{(product.price_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span><small>{product.stock>0?'Disponível para retirada':product.allow_preorder?'Encomenda disponível':'Consulte disponibilidade'}</small></span><ArrowRight size={20}/></a>)}</div>:<div className="home-store-empty"><ShoppingBag size={21}/><span>Em breve, produtos selecionados para você.</span></div>}<a className="button home-store-cta" href="/loja">Ver todos os produtos <ArrowRight size={18}/></a></div></section>}
      {works.length>0&&<section className="works section" id="exemplos"><div className="wrap"><div className="section-head"><p className="eyebrow">INSPIRE-SE</p><h2>Exemplos de serviços</h2><p>Conheça estilos e possibilidades para o seu próximo atendimento.</p></div><div className="work-grid">{works.map(({image,title})=><figure key={image}><img src={image} alt={`Exemplo de ${title.toLowerCase()}`} loading="lazy"/><figcaption>{title}</figcaption></figure>)}</div></div></section>}
      <section className="section wrap" id="trabalhos"><div className="section-head"><p className="eyebrow">PORTFÓLIO</p><h2>Serviços realizados</h2></div>{portfolio.length?<PortfolioCarousel items={portfolio}/>:<p className="muted">Fotos dos atendimentos realizados serão publicadas aqui em breve.</p>}</section>
      <section className="section wrap about" id="sobre"><div className="years"><strong>{profile.yearsExperience}+</strong><span>anos de experiência profissional</span></div><div><p className="eyebrow">SOBRE O PROFISSIONAL</p><h2>Experiência que acompanha o seu estilo</h2><p>{profile.bio}</p>{brand.reviewUrl&&<a className="button outline" href={brand.reviewUrl} target="_blank" rel="noreferrer">Avaliar no Google</a>}</div></section>
    </main><footer className="footer"><div className="wrap footer-inner"><div><strong>{brand.name}</strong><p>{brand.tagline}</p></div><div className="footer-links">{brand.instagram&&<a href={brand.instagram} target="_blank" rel="noreferrer">Instagram</a>}{brand.facebook&&<a href={brand.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><span className="social-facebook-mark" aria-hidden="true">f</span> Facebook</a>}{brand.whatsapp&&<a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}<a href="/politica-de-privacidade">Política de Privacidade</a><a href="/termos-de-servico">Termos de Serviço</a><Link href="/admin/agendar">Área de gestão</Link></div><a className="footer-credit" href="https://fllifranchi.com" target="_blank" rel="noreferrer">Desenvolvido por <strong>F.LLI FRANCHI</strong></a></div></footer>
  </div>;
}
