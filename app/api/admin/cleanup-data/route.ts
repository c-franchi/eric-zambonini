import { env } from 'cloudflare:workers';

const retainedEmails = ['neifranchi@gmail.com', 'eric.cabelereiro@gmail.com'];

function authorized(request: Request) {
  const expected = (env as unknown as Record<string, string | undefined>).DATA_CLEANUP_TOKEN;
  const received = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || expected.length < 32 || received.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index++) mismatch |= expected.charCodeAt(index) ^ received.charCodeAt(index);
  return mismatch === 0;
}

async function counts() {
  const database = env.DB;
  const [users, messages, linkedBookings, linkedOrders, linkedSales] = await Promise.all([
    database.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN lower(email) IN (?,?) THEN 1 ELSE 0 END) AS retained, SUM(CASE WHEN lower(email) NOT IN (?,?) AND sub IN (SELECT user_sub FROM product_orders) THEN 1 ELSE 0 END) AS order_tombstones FROM users").bind(...retainedEmails, ...retainedEmails).first<Record<string, number>>(),
    database.prepare('SELECT COUNT(*) AS total FROM messages').first<{ total: number }>(),
    database.prepare("SELECT COUNT(*) AS total FROM bookings WHERE user_sub IN (SELECT sub FROM users WHERE lower(email) NOT IN (?,?))").bind(...retainedEmails).first<{ total: number }>(),
    database.prepare("SELECT COUNT(*) AS total FROM product_orders WHERE user_sub IN (SELECT sub FROM users WHERE lower(email) NOT IN (?,?))").bind(...retainedEmails).first<{ total: number }>(),
    database.prepare("SELECT COUNT(*) AS total FROM product_sales WHERE user_sub IN (SELECT sub FROM users WHERE lower(email) NOT IN (?,?))").bind(...retainedEmails).first<{ total: number }>(),
  ]);
  return { users: users?.total ?? 0, retainedAccounts: users?.retained ?? 0, minimalOrderReferences: users?.order_tombstones ?? 0, chatMessages: messages?.total ?? 0, bookingsToDetach: linkedBookings?.total ?? 0, productOrdersToKeep: linkedOrders?.total ?? 0, salesToDetach: linkedSales?.total ?? 0 };
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try { return Response.json(await counts(), { headers: { 'cache-control': 'no-store' } }); }
  catch { return Response.json({ error: 'Não foi possível conferir os registros.' }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  let body: { confirmation?: string };
  try { body = await request.json(); } catch { return Response.json({ error: 'Confirmação inválida' }, { status: 400 }); }
  if (body.confirmation !== 'APAGAR PERFIS E CHATS') return Response.json({ error: 'Confirmação inválida' }, { status: 400 });
  try {
    const database = env.DB;
    const before = await counts();
    await database.batch([
      database.prepare('DELETE FROM messages'),
      database.prepare("DELETE FROM push_deliveries WHERE endpoint IN (SELECT endpoint FROM push_subscriptions WHERE user_sub IN (SELECT sub FROM users WHERE lower(email) NOT IN (?,?)))").bind(...retainedEmails),
      database.prepare("DELETE FROM push_subscriptions WHERE user_sub IN (SELECT sub FROM users WHERE lower(email) NOT IN (?,?))").bind(...retainedEmails),
      database.prepare("UPDATE bookings SET user_sub = NULL WHERE user_sub IN (SELECT sub FROM users WHERE lower(email) NOT IN (?,?))").bind(...retainedEmails),
      database.prepare("UPDATE product_sales SET user_sub = NULL WHERE user_sub IN (SELECT sub FROM users WHERE lower(email) NOT IN (?,?))").bind(...retainedEmails),
      database.prepare("DELETE FROM settings WHERE key LIKE 'legal_acceptance:%' AND key NOT IN (SELECT 'legal_acceptance:' || sub FROM users WHERE lower(email) IN (?,?))").bind(...retainedEmails),
      database.prepare('DELETE FROM auth_attempts WHERE lower(email) NOT IN (?,?)').bind(...retainedEmails),
      database.prepare("UPDATE users SET email = 'removed+' || lower(hex(randomblob(16))) || '@invalid.local', password_hash = NULL, name = 'Conta removida', phone = NULL WHERE lower(email) NOT IN (?,?) AND sub IN (SELECT user_sub FROM product_orders)").bind(...retainedEmails),
      database.prepare("DELETE FROM users WHERE lower(email) NOT IN (?,?) AND sub NOT IN (SELECT user_sub FROM product_orders)").bind(...retainedEmails),
    ]);
    return Response.json({ ok: true, before, after: await counts() }, { headers: { 'cache-control': 'no-store' } });
  } catch { return Response.json({ error: 'A limpeza foi interrompida. Confira o banco antes de repetir.' }, { status: 503 }); }
}
