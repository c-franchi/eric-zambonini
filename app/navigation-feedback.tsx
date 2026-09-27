'use client';
import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

export default function NavigationFeedback(){
  const [status,setStatus]=useState('');
  useEffect(()=>{
    let timer:number|undefined;
    let clearTimer:number|undefined;
    const clear=()=>{
      if(timer)window.clearTimeout(timer);
      if(clearTimer)window.clearTimeout(clearTimer);
      document.documentElement.removeAttribute('data-navigation-loading');
      setStatus('');
    };
    const onClick=(event:MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const target=event.target;
      if(!(target instanceof Element))return;
      const anchor=target.closest<HTMLAnchorElement>('a[href]');
      if(!anchor||anchor.hasAttribute('download')||anchor.target&&anchor.target!=='_self')return;
      const href=anchor.getAttribute('href');
      if(!href||href.startsWith('#')||href.startsWith('mailto:')||href.startsWith('tel:'))return;
      let destination:URL;
      try{destination=new URL(anchor.href,window.location.href)}catch{return}
      if(destination.origin!==window.location.origin)return;
      if(destination.pathname===window.location.pathname&&destination.search===window.location.search&&destination.hash)return;
      if(destination.href===window.location.href)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      clear();
      document.documentElement.dataset.navigationLoading='true';
      setStatus('Abrindo página…');
      window.requestAnimationFrame(()=>window.location.assign(destination.href));
      timer=window.setTimeout(()=>{
        document.documentElement.removeAttribute('data-navigation-loading');
        setStatus('A página está demorando. Toque no link novamente.');
        clearTimer=window.setTimeout(()=>setStatus(''),5000);
      },10000);
    };
    document.addEventListener('click',onClick,true);
    window.addEventListener('pageshow',clear);
    return()=>{document.removeEventListener('click',onClick,true);window.removeEventListener('pageshow',clear);if(timer)window.clearTimeout(timer);if(clearTimer)window.clearTimeout(clearTimer)};
  },[]);
  if(!status)return null;
  return <div className="navigation-feedback" role="status" aria-live="polite"><LoaderCircle size={17} aria-hidden="true" className={status.startsWith('Abrindo')?'navigation-spinner':''}/><span>{status}</span></div>;
}
