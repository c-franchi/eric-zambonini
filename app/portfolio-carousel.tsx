'use client';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
type Item={id:string;title:string;alt_text:string};
export default function PortfolioCarousel({items}:{items:Item[]}){
  const track=useRef<HTMLDivElement>(null);
  function move(direction:number){track.current?.scrollBy({left:direction*track.current.clientWidth*.8,behavior:'smooth'})}
  return <div className="portfolio-carousel"><div className="portfolio-controls"><button type="button" aria-label="Ver trabalhos anteriores" onClick={()=>move(-1)}><ChevronLeft size={23}/></button><button type="button" aria-label="Ver próximos trabalhos" onClick={()=>move(1)}><ChevronRight size={23}/></button></div><div className="portfolio-track" ref={track} tabIndex={0} aria-label="Fotos dos serviços realizados">{items.map(item=><figure key={item.id}><img src={`/api/portfolio/${item.id}`} alt={item.alt_text} loading="lazy"/><figcaption>{item.title}</figcaption></figure>)}</div></div>;
}
