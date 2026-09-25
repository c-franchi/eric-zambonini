'use client';
import { useRef, useState } from 'react';
import Script from 'next/script';

declare global { interface Window { google?: { accounts:{ id:{ initialize:(options:{client_id:string;callback:(response:{credential:string})=>void;ux_mode:string})=>void; renderButton:(el:HTMLElement,options:Record<string,unknown>)=>void } } } } }
export default function GoogleLogin({clientId,redirectTo='/cliente'}:{clientId:string;redirectTo?:string}){
  const button=useRef<HTMLDivElement>(null),[error,setError]=useState('');
  async function authenticate(response:{credential:string}){
    setError('');
    try{
      const csrfResponse=await fetch('/api/auth/csrf',{credentials:'same-origin',cache:'no-store'});
      const csrf:{token:string}=await csrfResponse.json();
      const auth=await fetch('/api/auth/google',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({credential:response.credential,csrf:csrf.token})});
      const result:{error?:string}=await auth.json();
      if(!auth.ok)throw new Error(result.error||'Não foi possível entrar.');
      window.location.assign(redirectTo);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível entrar.');}
  }
  function ready(){if(!clientId||!window.google||!button.current)return;button.current.replaceChildren();window.google.accounts.id.initialize({client_id:clientId,callback:authenticate,ux_mode:'popup'});window.google.accounts.id.renderButton(button.current,{theme:'outline',size:'large',text:'signin_with',locale:'pt-BR',width:260});}
  if(!clientId)return <p role="status">Login com Google em configuração.</p>;
  return <div className="google-login"><Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={ready} onError={()=>setError('Não foi possível carregar o acesso do Google.')}/><div ref={button} aria-label="Entrar com Google"/>{error&&<p role="alert" className="error">{error}</p>}</div>
}
