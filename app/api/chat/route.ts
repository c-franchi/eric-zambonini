import { getViewer } from '@/lib/auth';
import { db, unavailable } from '@/lib/server';
import { notificationInsert, deliverOwnerNotifications } from '@/lib/owner-notifications';
export async function GET() {
  const viewer = await getViewer(); if (!viewer) return Response.json({ error: 'Entre com Google' }, { status: 401 });
  try { return Response.json((await db().prepare('SELECT id,sender,body,created_at FROM messages WHERE user_sub=? ORDER BY created_at DESC LIMIT 100').bind(viewer.sub).all()).results.reverse()); } catch { return unavailable(); }
}
export async function POST(request: Request) {
  const viewer = await getViewer(); if (!viewer) return Response.json({ error: 'Entre com Google' }, { status: 401 });
  let data: { body?: string }; try { data = await request.json(); } catch { return Response.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!data.body?.trim() || data.body.length > 2000) return Response.json({ error: 'Digite uma mensagem de até 2.000 caracteres' }, { status: 400 });
  try { const database=db();await database.batch([database.prepare('INSERT INTO messages(id,user_sub,sender,body,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),viewer.sub,'CLIENT',data.body.trim(),new Date().toISOString()),notificationInsert(database,'MESSAGE','Nova mensagem de cliente',`${viewer.name} (${viewer.email}): ${data.body.trim()}`,`/admin/chat?sub=${encodeURIComponent(viewer.sub)}`)]);await deliverOwnerNotifications().catch(()=>{});return Response.json({ ok: true }, { status: 201 }); } catch { return unavailable(); }
}
