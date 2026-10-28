import {getBrand} from '@/lib/site-settings';
import base from '@/config/pwa.json';
export async function GET(){const brand=await getBrand();return Response.json({...base,name:`${brand.name} — Agendamento`,short_name:brand.name.slice(0,25),description:brand.tagline},{headers:{'content-type':'application/manifest+json','cache-control':'no-store'}})}
