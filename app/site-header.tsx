'use client';
import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';

export default function SiteHeader(){
  const [scrolled,setScrolled]=useState(false);
  useEffect(()=>{const update=()=>setScrolled(window.scrollY>24);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update)},[]);
  return <header className={`topbar${scrolled?' is-scrolled':''}`}><div className="wrap nav"><a className="brand nav-logo" href="/" aria-label="Eric Zambonini — início"><img src="/images/eric-zambonini-horizontal-v2.png" alt="Eric Zambonini — Beleza masculina e feminina" width="1420" height="180" /></a><nav aria-label="Navegação principal"><a href="#servicos">Serviços</a><a href="#exemplos">Exemplos</a><a href="#sobre">Sobre</a><a href="/cliente">Área do cliente</a><a className="pill" href="/agendar">Agendar horário</a></nav><details className="mobile-menu"><summary aria-label="Abrir menu"><Menu size={25}/></summary><div><a href="#servicos">Serviços</a><a href="#exemplos">Exemplos</a><a href="#sobre">Sobre</a><a href="/cliente">Área do cliente</a><a href="/agendar">Agendar horário</a></div></details></div></header>;
}
