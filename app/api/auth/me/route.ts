import { getViewer } from '@/lib/auth';
export async function GET() { const viewer=await getViewer();return new Response(JSON.stringify(viewer?{ name:viewer.name, email:viewer.email }:null),{headers:{'content-type':'application/json','cache-control':'no-store'}}); }
