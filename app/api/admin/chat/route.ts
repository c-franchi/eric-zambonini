import {requireModule} from '@/lib/licensing';
import { waitUntil } from 'cloudflare:workers';
import { db, ownerOnly, unavailable } from '@/lib/server';
import { sendPush } from '@/lib/push';
export async function GET(request: Request) {
 const moduleDenied=await requireModule('chat');if(moduleDenied)return moduleDenied;

  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  const sub = new URL(request.url).searchParams.get('sub');
  try { return Response.json(sub ? (await db().prepare('SELECT id,sender,body,created_at FROM messages WHERE user_sub=? ORDER BY created_at DESC LIMIT 100').bind(sub).all()).results.reverse() : (await db().prepare('SELECT u.sub,u.name,u.email,MAX(m.created_at) AS latest FROM users u LEFT JOIN messages m ON m.user_sub=u.sub WHERE EXISTS(SELECT 1 FROM bookings b WHERE b.user_sub=u.sub) OR m.id IS NOT NULL GROUP BY u.sub ORDER BY latest DESC, u.name LIMIT 500').all()).results); } catch { return unavailable(); }
}
export async function POST(request: Request) {
 const moduleDenied=await requireModule('chat');if(moduleDenied)return moduleDenied;

  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  let data: { sub?: string; body?: string; message_id?: string }; try { data = await request.json(); } catch { return Response.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!data.sub || !data.body?.trim() || data.body.length > 2000) return Response.json({ error: 'Mensagem inválida' }, { status: 400 });
  if (data.message_id && !/^[\da-f-]{36}$/i.test(data.message_id)) return Response.json({ error: 'Identificador de mensagem inválido' }, { status: 400 });
  try { const database=db(),id=data.message_id||crypto.randomUUID(),body=data.body.trim();const inserted=await database.prepare('INSERT OR IGNORE INTO messages(id,user_sub,sender,body,created_at) VALUES(?,?,?,?,?)').bind(id,data.sub,'OWNER',body,new Date().toISOString()).run();if(!inserted.meta.changes)return Response.json({ok:true,duplicate:true});waitUntil(sendPush(data.sub,id,'Mensagem do profissional',body,'/cliente').catch(()=>{}));return Response.json({ ok: true, id }, { status: 201 }); } catch { return unavailable(); }
}
