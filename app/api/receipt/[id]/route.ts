import { getViewer } from '@/lib/auth';
import { db, ownerOnly } from '@/lib/server';
import { env } from 'cloudflare:workers';
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, viewer = await getViewer(), owner = await ownerOnly();
  if (!viewer && !owner) return new Response(null, { status: 401 });
  try {
    const row = await db().prepare('SELECT receipt_key FROM bookings WHERE id=? AND (user_sub=? OR ?=1)').bind(id, viewer?.sub || '', owner ? 1 : 0).first<{ receipt_key: string | null }>();
    if (!row?.receipt_key) return new Response(null, { status: 404 });
    const file = await env.BUCKET!.get(row.receipt_key);
    if (!file) return new Response(null, { status: 404 });
    return new Response(file.body, { headers: { 'content-type': file.httpMetadata?.contentType || 'application/octet-stream', 'content-disposition': 'inline', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
  } catch { return new Response(null, { status: 503 }); }
}
