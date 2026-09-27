import { env } from 'cloudflare:workers';
import { db } from '@/lib/server';
import { ensureStoreSchema } from '@/lib/store-schema';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params;
    await ensureStoreSchema();
    const index=Math.max(0,Math.min(7,Number(new URL(_request.url).searchParams.get('index'))||0));
    const row=await db().prepare('SELECT image_key FROM product_images WHERE product_id=? ORDER BY sort_order LIMIT 1 OFFSET ?').bind(id,index).first<{image_key:string}>();
    const product=await db().prepare('SELECT image_key FROM products WHERE id=? AND active=1').bind(id).first<{image_key:string|null}>();
    const imageKey=row?.image_key||(index===0?product?.image_key:null);
    if(!imageKey)return new Response('Imagem não encontrada',{status:404});
    const bucket=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;
    if(!bucket)return new Response('Armazenamento indisponível',{status:503});
    const object=await bucket.get(imageKey);
    if(!object)return new Response('Imagem não encontrada',{status:404});
    return new Response(object.body,{headers:{'content-type':object.httpMetadata?.contentType||'application/octet-stream','cache-control':'no-store','etag':object.httpEtag,'x-content-type-options':'nosniff'}});
  } catch { return new Response('Imagem temporariamente indisponível',{status:503}); }
}
