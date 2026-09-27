import { getViewer } from '@/lib/auth';
import Link from 'next/link';
import { db } from '@/lib/server';
import { ensureStoreSchema } from '@/lib/store-schema';
import SiteHeader from '@/app/site-header';
import Storefront from './storefront';

export const dynamic='force-dynamic';
type Product={id:string;name:string;description:string;price_cents:number;stock:number;allow_preorder:number;image_key:string|null};
export default async function StorePage(){
  let products:Product[]=[],signedIn=false;
  try{await ensureStoreSchema();products=(await db().prepare('SELECT id,name,description,price_cents,stock,allow_preorder,image_key FROM products WHERE active=1 ORDER BY name').all<Product>()).results}catch{}
  const viewer=await getViewer();
  if(viewer)signedIn=true;
  const publicProducts=products.map(({image_key,...product})=>({...product,image_url:image_key?`/api/products/${product.id}/image`:null}));
  return <div className="site-shell"><SiteHeader/><Storefront products={publicProducts} signedIn={signedIn} initialName={viewer?.name||''} initialEmail={viewer?.email||''}/><footer className="site-footer"><div className="wrap footer-inner"><span>Eric Zambonini · Beleza masculina e feminina</span><Link href="/">Voltar à página inicial</Link></div></footer></div>;
}
