'use client';
import { useState } from 'react';
export default function PushToggle({owner=false}:{owner?:boolean}){
 const [status,setStatus]=useState(''),[consented,setConsented]=useState(false),[active,setActive]=useState(false),[busy,setBusy]=useState(false);
 async function enable(){
  try{
   setBusy(true);
   if(!consented)throw Error('Marque a opção para autorizar lembretes e avisos por push.');
   if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw Error('Este dispositivo não oferece notificações push.');
   const response=await fetch('/api/push');if(!response.ok)throw Error('Entre na conta para ativar.');const {publicKey}=await response.json() as {publicKey:string};if(!publicKey)throw Error('Push ainda não configurado.');
   const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Permissão não concedida.');
   let visitor=localStorage.getItem('eric-privacy-visitor');if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('eric-privacy-visitor',visitor)}
   const consent=await fetch('/api/privacy-consent',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({visitorId:visitor,action:'push_opt_in',privacyVersion:'2026-09-26'})});if(!consent.ok)throw Error('Não foi possível registrar sua autorização. Tente novamente.');
   const worker=await navigator.serviceWorker.ready;
   const binary=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),char=>char.charCodeAt(0));
   const subscription=await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:binary});
   const saved=await fetch('/api/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(subscription)});if(!saved.ok)throw Error('Não foi possível salvar este dispositivo.');
   setActive(true);setStatus('Notificações ativadas neste dispositivo.');
  }catch(error){setStatus(error instanceof Error?error.message:'Não foi possível ativar.');}finally{setBusy(false)}
 }
 async function changeConsent(value:boolean){
  setConsented(value);setStatus('');
  if(value||!active)return;
  setBusy(true);
  try{const registration=await navigator.serviceWorker.ready;const subscription=await registration.pushManager.getSubscription();if(subscription){await fetch('/api/push',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})});await subscription.unsubscribe()}let visitor=localStorage.getItem('eric-privacy-visitor');if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('eric-privacy-visitor',visitor)}await fetch('/api/privacy-consent',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({visitorId:visitor,action:'push_opt_out',privacyVersion:'2026-09-26'})});setActive(false);setStatus('Notificações desativadas neste dispositivo.')}catch{setStatus('Não foi possível desativar agora. Tente pelas configurações do dispositivo.')}finally{setBusy(false)}
 }
 return <div className="push-preference"><label className="push-consent"><input type="checkbox" checked={consented} disabled={busy} onChange={e=>void changeConsent(e.target.checked)}/><span>Quero receber lembretes e avisos de agendamento por notificação push. Posso revogar esta autorização.</span></label><button type="button" disabled={!consented||busy||active} onClick={()=>void enable()}>{busy?'Aguarde...':active?'Notificações ativadas':owner?'Ativar push neste dispositivo':'Ativar lembretes e avisos no celular'}</button><p role="status">{status}</p><a href="/politica-de-privacidade">Como usamos seus dados</a></div>;
}
