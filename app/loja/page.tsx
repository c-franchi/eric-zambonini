import { getViewer } from '@/lib/auth';
import Link from 'next/link';
import { db } from '@/lib/server';
import { ensureStoreSchema } from '@/lib/store-schema';
import SiteHeader from '@/app/site-header';
import Storefront from './storefront';

export const dynamic='force-dynamic';
type Product={id:string;name:string;description:string;price_cents:number;stock:number;allow_preorder:number;image_key:string|null;updated_at:string};
export default async function StorePage(){
  let products:Product[]=[],signedIn=false;
  try{await ensureStoreSchema();products=(await db().prepare('SELECT id,name,description,price_cents,stock,allow_preorder,image_key,updated_at FROM products WHERE active=1 ORDER BY name').all<Product>()).results}catch{}
  const viewer=await getViewer();
  if(viewer)signedIn=true;
  const publicProducts=await Promise.all(products.map(async({image_key,...product})=>{const rows=(await db().prepare('SELECT image_key FROM product_images WHERE product_id=? ORDER BY sort_order').bind(product.id).all<{image_key:string}>()).results;const images=rows.length?rows.map((_,index)=>`/api/products/${product.id}/image?index=${index}&v=${encodeURIComponent(product.updated_at)}`):image_key?[`/api/products/${product.id}/image?v=${encodeURIComponent(product.updated_at)}`]:[];return {...product,image_urls:images,image_url:images[0]||null}}));
  return <div className="site-shell"><SiteHeader/><Storefront products={publicProducts} signedIn={signedIn} initialName={viewer?.name||''} initialEmail={viewer?.email||''}/><footer className="site-footer"><div className="wrap footer-inner"><span>Eric Zambonini · Beleza masculina e feminina</span><Link href="/">Voltar à página inicial</Link><a className="footer-credit" href="https://fllifranchi.com" target="_blank" rel="noreferrer">Desenvolvido por <strong>F.LLI FRANCHI</strong></a></div></footer></div>;
}
