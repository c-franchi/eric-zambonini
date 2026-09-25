import { db, ownerOnly, unavailable } from '@/lib/server';
import { validServiceIcon } from '@/lib/service-icons';
export async function GET() {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try { return Response.json((await db().prepare('SELECT * FROM services ORDER BY name').all()).results); } catch { return unavailable(); }
}
export async function POST(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  let data: { name?: string; icon?: string; description?: string; duration_min?: number; price_cents?: number; allow_in_person_payment?: boolean };
  try { data = await request.json(); } catch { return Response.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!data.name?.trim() || data.name.length > 100 || data.icon!==undefined&&!validServiceIcon(data.icon) || !Number.isInteger(data.duration_min) || data.duration_min! < 15 || data.duration_min! > 480 || data.duration_min! % 15 !== 0 || !Number.isInteger(data.price_cents) || data.price_cents! < 0 || data.allow_in_person_payment!==undefined && typeof data.allow_in_person_payment!=='boolean') return Response.json({ error: 'Revise os dados do serviço.' }, { status: 400 });
  try {
    const id = crypto.randomUUID();
    await db().prepare('INSERT INTO services (id, name, icon, description, duration_min, price_cents, active, allow_in_person_payment) VALUES (?, ?, ?, ?, ?, ?, 1, ?)').bind(id, data.name.trim(), data.icon??null, data.description?.trim().slice(0, 500) || null, data.duration_min, data.price_cents,Number(data.allow_in_person_payment??true)).run();
    return Response.json({ id }, { status: 201 });
  } catch { return unavailable(); }
}
