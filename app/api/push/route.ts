import { getViewer } from '@/lib/auth';
import { db } from '@/lib/server';
import { pushPublicKey } from '@/lib/push';
export async function GET(){const viewer=await getViewer();if(!viewer)return Response.json({error:'Entre na sua conta'},{status:401});return Response.json({publicKey:pushPublicKey()},{headers:{'cache-control':'no-store'}})}
export async function POST(request:Request){
 const viewer=await getViewer();if(!viewer)return Response.json({error:'Entre na sua conta'},{status:401});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origem inválida'},{status:403});
 let data:{endpoint?:string;keys?:{p256dh?:string;auth?:string}};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
 if(!data.endpoint||data.endpoint.length>2048||!data.endpoint.startsWith('https://')||!data.keys?.p256dh||!data.keys.auth||data.keys.p256dh.length>256||data.keys.auth.length>256)return Response.json({error:'Inscrição inválida'},{status:400});
 if(!pushPublicKey())return Response.json({error:'Push ainda não configurado'},{status:503});
 await db().prepare('INSERT INTO push_subscriptions(endpoint,user_sub,p256dh,auth,created_at) VALUES(?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_sub=excluded.user_sub,p256dh=excluded.p256dh,auth=excluded.auth').bind(data.endpoint,viewer.sub,data.keys.p256dh,data.keys.auth,new Date().toISOString()).run();
 return Response.json({ok:true});
}
export async function DELETE(request:Request){const viewer=await getViewer();if(!viewer)return Response.json({error:'Acesso negado'},{status:401});if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origem inválida'},{status:403});const data=await request.json().catch(()=>({})) as {endpoint?:string};if(data.endpoint)await db().prepare('DELETE FROM push_subscriptions WHERE endpoint=? AND user_sub=?').bind(data.endpoint,viewer.sub).run();return Response.json({ok:true})}
