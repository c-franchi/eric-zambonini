'use client';
import { useState } from 'react';
import Link from 'next/link';
import GoogleLogin from './google-login';

export default function AccountAccess({clientId,redirectTo='/cliente',compact=false}:{clientId:string;redirectTo?:string;compact?:boolean}){
  const [mode,setMode]=useState<'login'|'register'>('login');
  const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[acceptedLegal,setAcceptedLegal]=useState(false);
  async function submit(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try{
      const csrfResponse=await fetch('/api/auth/csrf',{cache:'no-store',credentials:'same-origin'});
      if(!csrfResponse.ok)throw Error('Não foi possível iniciar o acesso.');
      const csrf:{token:string}=await csrfResponse.json();
      if(!acceptedLegal)throw Error('Leia e aceite os Termos de Serviço e confirme que está ciente da Política de Privacidade.');
      const response=await fetch('/api/auth/password',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:mode,name,email,password,csrf:csrf.token,acceptedLegal:true,legalVersion:'2026-09-26'})});
      const result:{error?:string}=await response.json();
      if(!response.ok)throw Error(result.error||'Não foi possível continuar.');
      if(mode==='register'){setMode('login');setPassword('');setNotice('Conta criada. Entre com seu e-mail e senha.')}else window.location.assign(redirectTo);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível continuar.')}finally{setBusy(false)}
  }
  return <div className={`account-access${compact?' compact':''}`}>
    <div className="account-tabs" role="tablist" aria-label="Acesso à conta"><button type="button" role="tab" aria-selected={mode==='login'} onClick={()=>{setMode('login');setError('');setNotice('')}}>Entrar</button><button type="button" role="tab" aria-selected={mode==='register'} onClick={()=>{setMode('register');setError('');setNotice('')}}>Criar conta</button></div>
    <form onSubmit={submit} className="account-fields"><h2>{mode==='login'?'Acesse sua agenda':'Crie sua conta'}</h2>{mode==='register'&&<label>Nome completo<input autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome"/></label>}<label>E-mail<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label><label>Senha<input type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='register'?10:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='register'?'Mínimo de 10 caracteres':'Sua senha'}/></label><label className="legal-acceptance"><input type="checkbox" required checked={acceptedLegal} onChange={e=>setAcceptedLegal(e.target.checked)}/><span>Li e aceito os <Link href="/termos-de-servico" target="_blank">Termos de Serviço</Link> e estou ciente da <Link href="/politica-de-privacidade" target="_blank">Política de Privacidade</Link>.</span></label>{notice&&<p role="status" className="account-notice">{notice}</p>}{error&&<p role="alert" className="error">{error}</p>}<button type="submit" className="button" disabled={busy}>{busy?'Aguarde...':mode==='login'?'Entrar na conta':'Criar conta'}</button></form>
    <div className="account-divider"><span>ou continue com</span></div><GoogleLogin clientId={clientId} redirectTo={redirectTo} termsAccepted={acceptedLegal}/><a className="account-home" href="/">Voltar à página inicial</a>
  </div>;
}
