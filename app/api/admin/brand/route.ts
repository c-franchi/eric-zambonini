import {db,ownerOnly} from '@/lib/server';
import {readBrand,validBrand} from '@/lib/brand';
export async function GET(){if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});try{return Response.json(await readBrand(db()),{headers:{'cache-control':'no-store'}})}catch{return Response.json({error:'Não foi possível consultar a apresentação.'},{status:503})}}
export async function PUT(request:Request){
 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
 const data:unknown=await request.json().catch(()=>null);
 if(!validBrand(data))return Response.json({error:'Revise os campos. Use links HTTPS ou caminhos de imagens do próprio site.'},{status:400});
 // Explicit allowlist: this endpoint can never write plan, access roles or Pix.
 const {name,tagline,bio,yearsExperience,logo,heroLogo,heroImage,whatsapp,instagram,facebook,reviewUrl,siteUrl,examples}=data;
 const brand={name:name.trim(),tagline,bio,yearsExperience,logo,heroLogo,heroImage,whatsapp,instagram,facebook,reviewUrl,siteUrl,examples};
 try{await db().batch([
  db().prepare("INSERT INTO settings(key,value) VALUES('installation_brand',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(brand)),
  db().prepare("INSERT INTO settings(key,value) VALUES('barber_profile',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({name:brand.name,bio,yearsExperience})),
 ]);return Response.json({ok:true})}catch{return Response.json({error:'Não foi possível salvar.'},{status:503})}
}
