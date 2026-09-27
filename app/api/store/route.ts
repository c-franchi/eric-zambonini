import { db } from '@/lib/server';
import { ensureStoreSchema } from '@/lib/store-schema';

export async function GET() {
  try {
    await ensureStoreSchema();
    const items = (await db().prepare('SELECT id,name,description,price_cents,stock,allow_preorder,image_key,updated_at FROM products WHERE active=1 ORDER BY name').all<{id:string;name:string;description:string;price_cents:number;stock:number;allow_preorder:number;image_key:string|null;updated_at:string}>()).results;
    const catalog=await Promise.all(items.map(async({image_key,...item})=>{const rows=(await db().prepare('SELECT image_key FROM product_images WHERE product_id=? ORDER BY sort_order').bind(item.id).all()).results;const images=rows.length?rows.map((_,index)=>`/api/products/${item.id}/image?index=${index}&v=${encodeURIComponent(item.updated_at)}`):image_key?[`/api/products/${item.id}/image?v=${encodeURIComponent(item.updated_at)}`]:[];return {...item,image_urls:images,image_url:images[0]||null}}));
    return Response.json(catalog,{headers:{'cache-control':'no-store'}});
  } catch { return Response.json({error:'Loja temporariamente indisponível.'},{status:503}); }
}
