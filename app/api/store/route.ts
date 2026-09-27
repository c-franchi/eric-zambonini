import { db } from '@/lib/server';
import { ensureStoreSchema } from '@/lib/store-schema';

export async function GET() {
  try {
    await ensureStoreSchema();
    const items = (await db().prepare('SELECT id,name,description,price_cents,stock,allow_preorder,image_key FROM products WHERE active=1 ORDER BY name').all<{id:string;name:string;description:string;price_cents:number;stock:number;allow_preorder:number;image_key:string|null}>()).results;
    return Response.json(items.map(({image_key,...item})=>({...item,image_url:image_key?`/api/products/${item.id}/image`:null})),{headers:{'cache-control':'no-store'}});
  } catch { return Response.json({error:'Loja temporariamente indisponível.'},{status:503}); }
}
