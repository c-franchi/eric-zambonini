import { createSession, sessionCookie, verifyGoogleCredential } from '@/lib/auth';
import { db } from '@/lib/server';
import { isAdminEmail } from '@/lib/admin-access';
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error:'Origem inválida.' }, { status:403 });
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.startsWith('application/json')) return Response.json({ error:'Formato inválido.' }, { status:415 });
  let body: { credential?:string; csrf?:string; acceptedLegal?:boolean; legalVersion?:string };
  try { body = await request.json(); } catch { return Response.json({ error:'Dados inválidos.' }, { status:400 }); }
  const cookieCsrf = request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('eric_csrf='))?.slice(10);
  if (!body.csrf || !cookieCsrf || body.csrf !== cookieCsrf || typeof body.credential !== 'string' || body.credential.length > 10000) return Response.json({ error:'Verificação de segurança inválida.' }, { status:403 });
  if(body.acceptedLegal!==true||body.legalVersion!=='2026-09-26')return Response.json({error:'Aceite os Termos de Serviço e confirme que está ciente da Política de Privacidade.'},{status:400});
  try {
    const viewer = await verifyGoogleCredential(body.credential);
    const database=db();
    const existing=await database.prepare("SELECT sub FROM users WHERE lower(email)=? AND (? = 0 OR sub NOT LIKE 'local:%') ORDER BY CASE WHEN sub LIKE 'local:%' THEN 1 ELSE 0 END LIMIT 1").bind(viewer.email.toLowerCase(),Number(isAdminEmail(viewer.email))).first<{sub:string}>();
    if(!existing)await database.prepare('INSERT INTO users (sub, email, name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(sub) DO UPDATE SET email = excluded.email').bind(viewer.sub, viewer.email, viewer.name, new Date().toISOString()).run();
    const sub=existing?.sub||viewer.sub;
    await database.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(`legal_acceptance:${sub}`,JSON.stringify({termsVersion:body.legalVersion,privacyVersion:body.legalVersion,acceptedAt:new Date().toISOString(),method:'google_sign_in'})).run();
    const token = await createSession({...viewer,sub});
    return new Response(JSON.stringify({ ok:true, name:viewer.name }), { headers: { 'content-type':'application/json', 'cache-control':'no-store', 'set-cookie':`${sessionCookie}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800` } });
  } catch { return Response.json({ error:'Não foi possível validar a conta Google. Tente novamente.' }, { status:401 }); }
}
