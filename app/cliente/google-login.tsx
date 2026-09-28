'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';

declare global { interface Window { google?: { accounts:{ id:{ initialize:(options:{client_id:string;callback:(response:{credential:string})=>void;ux_mode:string})=>void; renderButton:(el:HTMLElement,options:Record<string,unknown>)=>void } } } } }
export default function GoogleLogin({clientId,redirectTo='/cliente',termsAccepted}:{clientId:string;redirectTo?:string;termsAccepted?:boolean}){
  const button=useRef<HTMLDivElement>(null),rendered=useRef(false),[error,setError]=useState(''),[internalAccepted,setInternalAccepted]=useState(false),[googleReady,setGoogleReady]=useState(false);
  const accepted=termsAccepted??internalAccepted;
  const redirect=useRef(redirectTo);
  useEffect(()=>{redirect.current=redirectTo},[redirectTo]);
  const authenticate=useCallback(async(response:{credential:string})=>{
    setError('');
    try{
      const csrfResponse=await fetch('/api/auth/csrf',{credentials:'same-origin',cache:'no-store'});
      const csrf:{token:string}=await csrfResponse.json();
      const auth=await fetch('/api/auth/google',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({credential:response.credential,csrf:csrf.token,acceptedLegal:true,legalVersion:'2026-09-26'})});
      const result:{error?:string;isAdmin?:boolean}=await auth.json();
      if(!auth.ok)throw new Error(result.error||'Não foi possível entrar.');
      window.location.assign(result.isAdmin?'/admin/agendar':redirect.current);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível entrar.');}
  },[]);
  const ready=useCallback(()=>{if(!clientId||!window.google||!button.current||!accepted||rendered.current)return;button.current.replaceChildren();window.google.accounts.id.initialize({client_id:clientId,callback:authenticate,ux_mode:'popup'});window.google.accounts.id.renderButton(button.current,{theme:'outline',size:'large',text:'continue_with',locale:'pt-BR',width:300});rendered.current=true;setGoogleReady(true)},[accepted,authenticate,clientId]);
  useEffect(()=>{if(!accepted){rendered.current=false;return}if(window.google){ready();return}let checks=0;const timer=window.setInterval(()=>{checks+=1;if(window.google){window.clearInterval(timer);ready()}else if(checks>=30){window.clearInterval(timer);setError('O acesso Google demorou para carregar. Atualize a página e tente novamente.')}},200);return()=>window.clearInterval(timer)},[accepted,clientId,ready]);
  if(!clientId)return <p role="status">Login com Google em configuração.</p>;
  return <div className="google-login">{termsAccepted===undefined&&<label className="legal-acceptance"><input type="checkbox" checked={internalAccepted} onChange={e=>setInternalAccepted(e.target.checked)}/><span>Li e aceito os <Link href="/termos-de-servico" target="_blank">Termos de Serviço</Link> e estou ciente da <Link href="/politica-de-privacidade" target="_blank">Política de Privacidade</Link>.</span></label>}{accepted?<><Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={ready} onError={()=>setError('Não foi possível carregar o acesso do Google.')}/>{!googleReady&&<p className="google-loading" role="status">Carregando acesso com Google…</p>}<div ref={button} aria-label="Continuar com Google"/></>:<><p className="google-consent-hint" role="status">Aceite os termos para liberar o acesso com Google.</p><button className="google-consent-button" type="button" disabled><span className="google-consent-mark" aria-hidden="true">G</span>Continuar com Google</button></>}{error&&<p role="alert" className="error">{error}</p>}</div>;
}
