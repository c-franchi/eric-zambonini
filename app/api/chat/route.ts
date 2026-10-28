import {requireModule} from '@/lib/licensing';
import { waitUntil } from 'cloudflare:workers';
import { getViewer } from '@/lib/auth';
import { db, unavailable } from '@/lib/server';
import { notificationInsert, deliverOwnerNotifications } from '@/lib/owner-notifications';
export async function GET() {
 const moduleDenied=await requireModule('chat');if(moduleDenied)return moduleDenied;

  const viewer = await getViewer(); if (!viewer) return Response.json({ error: 'Entre com Google' }, { status: 401 });
  try { return Response.json((await db().prepare('SELECT id,sender,body,created_at FROM messages WHERE user_sub=? ORDER BY created_at DESC LIMIT 100').bind(viewer.sub).all()).results.reverse()); } catch { return unavailable(); }
}
export async function POST(request: Request) {
 const moduleDenied=await requireModule('chat');if(moduleDenied)return moduleDenied;

  const viewer = await getViewer(); if (!viewer) return Response.json({ error: 'Entre com Google' }, { status: 401 });
  let data: { body?: string; message_id?: string }; try { data = await request.json(); } catch { return Response.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!data.body?.trim() || data.body.length > 2000) return Response.json({ error: 'Digite uma mensagem de até 2.000 caracteres' }, { status: 400 });
  if (data.message_id && !/^[\da-f-]{36}$/i.test(data.message_id)) return Response.json({ error: 'Identificador de mensagem inválido' }, { status: 400 });
  try {
    const database=db(),id=data.message_id||crypto.randomUUID(),body=data.body.trim();
    const inserted=await database.prepare('INSERT OR IGNORE INTO messages(id,user_sub,sender,body,created_at) VALUES(?,?,?,?,?)').bind(id,viewer.sub,'CLIENT',body,new Date().toISOString()).run();
    if (!inserted.meta.changes) return Response.json({ ok: true, duplicate: true });
    waitUntil((async()=>{await notificationInsert(database,'MESSAGE','Nova mensagem de cliente',`${viewer.name} (${viewer.email}): ${body}`,`/admin/chat?sub=${encodeURIComponent(viewer.sub)}`).run();await deliverOwnerNotifications()})().catch(()=>{}));
    return Response.json({ ok: true, id }, { status: 201 });
  } catch { return unavailable(); }
}
