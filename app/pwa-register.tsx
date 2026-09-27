'use client';
import { useEffect } from 'react';

export default function PwaRegister(){
  useEffect(()=>{
    if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
    const url=new URL(window.location.href);
    if(url.searchParams.has('openedFromPush')){
      const previous=history.scrollRestoration;
      history.scrollRestoration='manual';
      const reset=()=>{window.scrollTo({top:0,left:0,behavior:'instant'});document.documentElement.scrollTop=0;document.body.scrollTop=0};
      reset();
      const frames=[requestAnimationFrame(reset),requestAnimationFrame(()=>requestAnimationFrame(reset))];
      const timers=[window.setTimeout(reset,120),window.setTimeout(()=>{reset();history.scrollRestoration=previous;},700)];
      url.searchParams.delete('openedFromPush');
      history.replaceState(history.state,'',`${url.pathname}${url.search}#top`);
      return()=>{frames.forEach(cancelAnimationFrame);timers.forEach(clearTimeout);history.scrollRestoration=previous};
    }
  },[]);
  return null;
}
