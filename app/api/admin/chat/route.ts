import { db, ownerOnly, unavailable } from '@/lib/server';
export async function GET(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  const sub = new URL(request.url).searchParams.get('sub');
  try { return Response.json(sub ? (await db().prepare('SELECT id,sender,body,created_at FROM messages WHERE user_sub=? ORDER BY created_at DESC LIMIT 100').bind(sub).all()).results.reverse() : (await db().prepare('SELECT u.sub,u.name,u.email,MAX(m.created_at) AS latest FROM messages m JOIN users u ON u.sub=m.user_sub GROUP BY u.sub ORDER BY latest DESC LIMIT 100').all()).results); } catch { return unavailable(); }
}
export async function POST(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  let data: { sub?: string; body?: string }; try { data = await request.json(); } catch { return Response.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!data.sub || !data.body?.trim() || data.body.length > 2000) return Response.json({ error: 'Mensagem inválida' }, { status: 400 });
  try { await db().prepare('INSERT INTO messages(id,user_sub,sender,body,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),data.sub,'OWNER',data.body.trim(),new Date().toISOString()).run(); return Response.json({ ok: true }, { status: 201 }); } catch { return unavailable(); }
}
