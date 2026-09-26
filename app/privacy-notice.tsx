'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
const KEY='eric-privacy-notice-v1';
export default function PrivacyNotice(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{try{setVisible(localStorage.getItem(KEY)!=='acknowledged')}catch{setVisible(true)}},[]); // eslint-disable-line react-hooks/set-state-in-effect
 async function acknowledge(){
  try{
   let visitor=localStorage.getItem('eric-privacy-visitor');
   if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('eric-privacy-visitor',visitor)}
   await fetch('/api/privacy-consent',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({visitorId:visitor,action:'notice_acknowledged',privacyVersion:'2026-09-26',termsVersion:'2026-09-26'})});
   localStorage.setItem(KEY,'acknowledged');
  }catch{}
  setVisible(false);
 }
 if(!visible)return null;
 return <aside className="privacy-notice" aria-label="Aviso de privacidade"><div><strong>Sua privacidade</strong><p>Usamos apenas armazenamento necessário para login, segurança e funcionamento da agenda. Leia a <Link href="/politica-de-privacidade">Política de Privacidade</Link> e os <Link href="/termos-de-servico">Termos de Serviço</Link>. Notificações push são opcionais e só são ativadas por você.</p></div><button type="button" onClick={()=>void acknowledge()}>Entendi</button></aside>
}
