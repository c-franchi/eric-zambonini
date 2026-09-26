'use client';
import { useState } from 'react';
export default function PushToggle({owner=false}:{owner?:boolean}){
 const [status,setStatus]=useState('');
 async function enable(){
  try{
   if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw Error('Este dispositivo não oferece notificações push.');
   const response=await fetch('/api/push');if(!response.ok)throw Error('Entre na conta para ativar.');const {publicKey}=await response.json() as {publicKey:string};if(!publicKey)throw Error('Push ainda não configurado.');
   const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Permissão não concedida.');
   const worker=await navigator.serviceWorker.ready;
   const binary=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),char=>char.charCodeAt(0));
   const subscription=await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:binary});
   const saved=await fetch('/api/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(subscription)});if(!saved.ok)throw Error('Não foi possível salvar este dispositivo.');
   setStatus('Notificações ativadas neste dispositivo.');
  }catch(error){setStatus(error instanceof Error?error.message:'Não foi possível ativar.');}
 }
 return <div className="push-preference"><button type="button" onClick={()=>void enable()}>{owner?'Ativar push neste dispositivo':'Ativar lembretes e avisos no celular'}</button><p role="status">{status}</p></div>;
}
