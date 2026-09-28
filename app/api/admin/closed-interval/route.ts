import { db, ownerOnly, unavailable } from '@/lib/server';
import { defaultClosedInterval, parseClosedInterval, validClosedInterval } from '@/lib/booking';

export async function GET() {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try {
    const row = await db().prepare("SELECT value FROM settings WHERE key='closed_interval'").first<{ value: string }>();
    return Response.json(parseClosedInterval(row?.value ?? JSON.stringify(defaultClosedInterval)), { headers: { 'cache-control': 'no-store' } });
  } catch { return unavailable(); }
}

export async function PUT(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  let value: unknown;
  try { value = await request.json(); } catch { return Response.json({ error: 'Dados inválidos.' }, { status: 400 }); }
  if (!validClosedInterval(value)) return Response.json({ error: 'Informe um intervalo válido em blocos de 15 minutos.' }, { status: 400 });
  try {
    await db().prepare("INSERT INTO settings(key,value) VALUES('closed_interval',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(value)).run();
    return Response.json({ ok: true });
  } catch { return unavailable(); }
}
