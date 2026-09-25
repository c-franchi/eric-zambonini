import { db } from '@/lib/server';
import { createSession, sessionCookie } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/password';

type Input={action?:string;name?:string;email?:string;password?:string;csrf?:string};
const fail=(error:string,status=400)=>Response.json({error},{status,headers:{'cache-control':'no-store'}});
export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return fail('Origem inválida.',403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return fail('Formato inválido.',415);
  let input:Input;try{input=await request.json()}catch{return fail('Dados inválidos.')}
  const cookieCsrf=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('eric_csrf='))?.slice(10);
  if(!input.csrf||!cookieCsrf||input.csrf!==cookieCsrf)return fail('Verificação de segurança inválida.',403);
  const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof input.password!=='string'||input.password.length>128)return fail('Confira e-mail e senha.');
  const database=db();
  if(input.action==='register'){
    const name=typeof input.name==='string'?input.name.trim():'';
    if(name.length<2||name.length>100||input.password.length<10)return fail('Informe nome e uma senha de pelo menos 10 caracteres.');
    try{
      const hash=await hashPassword(input.password);
      const result=await database.prepare('INSERT INTO users(sub,email,name,password_hash,created_at) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM users WHERE lower(email)=?)').bind(`local:${crypto.randomUUID()}`,email,name,hash,new Date().toISOString(),email).run();
      if(!result.meta.changes)return fail('Este e-mail já está cadastrado. Entre com sua conta existente.',409);
      return Response.json({ok:true},{status:201,headers:{'cache-control':'no-store'}});
    }catch{return fail('Não foi possível criar a conta agora.',503)}
  }
  if(input.action!=='login')return fail('Ação inválida.');
  try{
    const now=Date.now();
    const attempts=await database.prepare('SELECT failures,window_started FROM auth_attempts WHERE email=?').bind(email).first<{failures:number;window_started:number}>();
    if(attempts&&now-attempts.window_started<15*60*1000&&attempts.failures>=5)return fail('Muitas tentativas. Tente novamente em 15 minutos.',429);
    const user=await database.prepare('SELECT sub,email,name,password_hash FROM users WHERE lower(email)=? AND password_hash IS NOT NULL LIMIT 1').bind(email).first<{sub:string;email:string;name:string;password_hash:string}>();
    if(!user||!await verifyPassword(input.password,user.password_hash)){
      await database.prepare('INSERT INTO auth_attempts(email,failures,window_started) VALUES(?,1,?) ON CONFLICT(email) DO UPDATE SET failures=CASE WHEN ?-window_started>=900000 THEN 1 ELSE failures+1 END,window_started=CASE WHEN ?-window_started>=900000 THEN ? ELSE window_started END').bind(email,now,now,now,now).run();
      return fail('E-mail ou senha incorretos.',401);
    }
    await database.prepare('DELETE FROM auth_attempts WHERE email=?').bind(email).run();
    const token=await createSession({sub:user.sub,email:user.email,name:user.name});
    return Response.json({ok:true},{headers:{'cache-control':'no-store','set-cookie':`${sessionCookie}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`}});
  }catch{return fail('Não foi possível entrar agora.',503)}
}
