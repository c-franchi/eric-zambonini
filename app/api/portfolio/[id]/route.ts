import { db } from '@/lib/server';
import { env } from 'cloudflare:workers';
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const row = await db().prepare('SELECT image_key FROM portfolio WHERE id=? AND active=1').bind(id).first<{ image_key: string }>(); if (!row) return new Response(null,{status:404}); const file = await env.BUCKET!.get(row.image_key); if (!file) return new Response(null,{status:404}); return new Response(file.body,{headers:{'content-type':file.httpMetadata?.contentType||'image/jpeg','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'}}); } catch { return new Response(null,{status:503}); }
}
