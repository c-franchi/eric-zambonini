'use client';
import { useEffect } from 'react';
export default function PwaRegister(){useEffect(()=>{if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});const standalone=window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);if(standalone&&window.location.pathname==='/')window.location.replace('/agendar')},[]);return null}
