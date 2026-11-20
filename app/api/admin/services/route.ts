import { db, ownerOnly, unavailable } from '@/lib/server';
import { validServiceIcon } from '@/lib/service-icons';
import { ensureServiceCatalog } from '@/lib/service-catalog';
export async function GET() {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try { await ensureServiceCatalog();return Response.json((await db().prepare('SELECT * FROM services ORDER BY name').all()).results); } catch { return unavailable(); }
}
export async function POST(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  let data: { name?: string; icon?: string; description?: string; duration_min?: number; price_cents?: number; price_variable?: boolean; allow_in_person_payment?: boolean; interleaved_blocks?:unknown };
  try { data = await request.json(); } catch { return Response.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!data.name?.trim() || data.name.length > 100 || data.icon!==undefined&&!validServiceIcon(data.icon) || !Number.isInteger(data.duration_min) || data.duration_min! < 15 || data.duration_min! > 480 || data.duration_min! % 15 !== 0 || !Number.isInteger(data.price_cents) || data.price_cents! < 0 || typeof data.price_variable!=='boolean' || data.allow_in_person_payment!==undefined && typeof data.allow_in_person_payment!=='boolean' || data.interleaved_blocks!==undefined&&data.interleaved_blocks!==null) return Response.json({ error: 'Revise os dados do serviço.' }, { status: 400 });
  try {
    const id = crypto.randomUUID();
    await db().prepare('INSERT INTO services (id, name, icon, description, duration_min, price_cents, price_variable, active, allow_in_person_payment) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)').bind(id, data.name.trim(), data.icon??null, data.description?.trim().slice(0, 500) || null, data.duration_min, data.price_variable?0:data.price_cents,Number(data.price_variable),Number(data.price_variable?true:data.allow_in_person_payment??true)).run();
    return Response.json({ id }, { status: 201 });
  } catch { return unavailable(); }
}
