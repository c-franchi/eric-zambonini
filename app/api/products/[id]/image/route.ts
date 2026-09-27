import { env } from 'cloudflare:workers';
import { db } from '@/lib/server';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params;
    const row=await db().prepare('SELECT image_key FROM products WHERE id=? AND active=1').bind(id).first<{image_key:string|null}>();
    if(!row?.image_key)return new Response('Imagem não encontrada',{status:404});
    const bucket=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;
    if(!bucket)return new Response('Armazenamento indisponível',{status:503});
    const object=await bucket.get(row.image_key);
    if(!object)return new Response('Imagem não encontrada',{status:404});
    return new Response(object.body,{headers:{'content-type':object.httpMetadata?.contentType||'application/octet-stream','cache-control':'public, max-age=3600','etag':object.httpEtag}});
  } catch { return new Response('Imagem temporariamente indisponível',{status:503}); }
}
