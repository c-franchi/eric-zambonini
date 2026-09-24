import { sessionCookie } from '@/lib/auth';
export async function POST(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origem inválida.'},{status:403});return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json','set-cookie':`${sessionCookie}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`}})}
