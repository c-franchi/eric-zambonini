import { db, ownerOnly, unavailable } from '@/lib/server';
import { currentPixSettings } from '@/lib/pix';
export async function GET() {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try { return Response.json(await currentPixSettings(db()) || { key: '', name: '', city: '' }); } catch { return unavailable(); }
}
export async function PUT(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  let data: { key?: string; name?: string; city?: string };
  try { data = await request.json(); } catch { return Response.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!data.key?.trim() || data.key.length > 77 || !data.name?.trim() || data.name.length > 25 || !data.city?.trim() || data.city.length > 15) return Response.json({ error: 'Informe chave Pix, nome (até 25 caracteres) e cidade (até 15).' }, { status: 400 });
  try { await db().prepare("INSERT INTO settings(key,value) VALUES('pix',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({ key: data.key.trim(), name: data.name.trim(), city: data.city.trim() })).run(); return Response.json({ ok: true }); } catch { return unavailable(); }
}
