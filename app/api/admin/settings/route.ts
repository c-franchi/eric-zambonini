import { db, ownerOnly, unavailable } from '@/lib/server';
import { parseSchedule, validSchedule } from '@/lib/booking';
export async function GET() {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try { const row = await db().prepare("SELECT value FROM settings WHERE key = 'schedule'").first<{ value: string }>(); return Response.json(parseSchedule(row?.value)); } catch { return unavailable(); }
}
export async function PUT(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  let schedule: unknown;
  try { schedule = await request.json(); } catch { return Response.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!validSchedule(schedule)) return Response.json({ error: 'Horários inválidos.' }, { status: 400 });
  try { await db().prepare("INSERT INTO settings (key, value) VALUES ('schedule', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(schedule)).run(); return Response.json({ ok: true }); } catch { return unavailable(); }
}
