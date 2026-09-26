'use client';
/* eslint react-hooks/set-state-in-effect: off */
import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
export default function PwaInstallPrompt(){
 const [installEvent,setInstallEvent]=useState<InstallEvent|null>(null),[show,setShow]=useState(false),[help,setHelp]=useState(false),[installed,setInstalled]=useState(false);
 useEffect(()=>{
  const standalone=window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);
  if(standalone){setInstalled(true);return}
  try{const dismissed=Number(localStorage.getItem('eric-pwa-dismissed-until')||0);if(dismissed>Date.now())return}catch{}
  const onBefore=(event:Event)=>{event.preventDefault();setInstallEvent(event as InstallEvent);setShow(true)};
  const onInstalled=()=>{setInstalled(true);setShow(false)};
  window.addEventListener('beforeinstallprompt',onBefore);window.addEventListener('appinstalled',onInstalled);
  const timer=window.setTimeout(()=>{
   if(window.matchMedia('(display-mode: standalone)').matches)return;
   setHelp(true);setShow(true);
  },4500);
  return()=>{window.clearTimeout(timer);window.removeEventListener('beforeinstallprompt',onBefore);window.removeEventListener('appinstalled',onInstalled)};
 },[]);
 function close(){setShow(false);setHelp(false);try{localStorage.setItem('eric-pwa-dismissed-until',String(Date.now()+7*86400000))}catch{}}
 async function install(){if(!installEvent){setHelp(true);return}await installEvent.prompt();const choice=await installEvent.userChoice;if(choice.outcome==='accepted'){setInstalled(true);setShow(false)}setInstallEvent(null)}
 if(!show||installed)return null;
 return <aside className="pwa-prompt" aria-label="Instalar aplicativo"><div className="pwa-prompt-icon"><Download size={21}/></div><div className="pwa-prompt-copy"><strong>Tenha a agenda no celular</strong><p>{help?'No menu do navegador, toque em “Instalar aplicativo” ou “Adicionar à tela inicial”. Se abriu por outro app, abra este endereço no Chrome.':'Instale o app para abrir direto na tela de agendamento.'}</p></div><button className="pwa-install-button" type="button" onClick={()=>void install()}>{help?'Ver instruções':'Instalar'}</button><button className="pwa-close" type="button" aria-label="Dispensar aviso" onClick={close}><X size={19}/></button></aside>
}
