import { db, ownerOnly, unavailable } from '@/lib/server';
import { env } from 'cloudflare:workers';
export async function GET() {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try { return Response.json((await db().prepare('SELECT * FROM portfolio ORDER BY sort_order,title').all()).results); } catch { return unavailable(); }
}
export async function POST(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try {
    const form = await request.formData(), file = form.get('file'), title = form.get('title'), category = form.get('category'), alt = form.get('alt');
    if (!(file instanceof File) || !['image/jpeg','image/png','image/webp'].includes(file.type) || !file.size || file.size > 10*1024*1024 || typeof title !== 'string' || !title.trim() || title.length > 100 || typeof category !== 'string' || !category.trim() || category.length > 60 || typeof alt !== 'string' || alt.length > 200) return Response.json({ error: 'Confira imagem (até 10 MB), título, categoria e descrição.' }, { status: 400 });
    const id = crypto.randomUUID(), key = `portfolio/${id}`;
    await env.BUCKET!.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    try { await db().prepare('INSERT INTO portfolio(id,title,category,alt_text,image_key,active,sort_order) VALUES(?,?,?,?,?,1,0)').bind(id,title.trim(),category.trim(),alt.trim()||title.trim(),key).run(); }
    catch { await env.BUCKET!.delete(key); throw Error('Falha ao salvar trabalho'); }
    return Response.json({ id }, { status: 201 });
  } catch { return unavailable(); }
}
export async function PATCH(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  let data: { id?: string; active?: boolean };
  try { data = await request.json(); } catch { return Response.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!data.id || typeof data.active !== 'boolean') return Response.json({ error: 'Dados inválidos' }, { status: 400 });
  try { await db().prepare('UPDATE portfolio SET active=? WHERE id=?').bind(Number(data.active),data.id).run(); return Response.json({ ok: true }); } catch { return unavailable(); }
}
