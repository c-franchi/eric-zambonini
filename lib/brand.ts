import defaults from '@/config/brand.json';
export type Brand={name:string;tagline:string;bio:string;yearsExperience:number;logo:string;heroLogo:string;heroImage:string;whatsapp:string;instagram:string;facebook:string;reviewUrl:string;siteUrl:string;examples:{image:string;title:string}[]};
export const defaultBrand:Brand=defaults;
const textFields=['name','tagline','bio','logo','heroLogo','heroImage','whatsapp','instagram','facebook','reviewUrl','siteUrl'] as const;
export function validBrand(value:unknown):value is Brand{
 if(!value||typeof value!=='object')return false;
 const b=value as Brand;
 if(!textFields.every(key=>typeof b[key]==='string'&&b[key].length<=(key==='bio'?1000:500))||!b.name.trim()||b.name.length>100)return false;
 if(!Number.isInteger(b.yearsExperience)||b.yearsExperience<0||b.yearsExperience>90||!/^\d{0,15}$/.test(b.whatsapp))return false;
 const safeUrl=(url:string,local=false)=>!url||(local&&/^\/(?!\/)[^\s"'<>\\]*$/.test(url))||(/^https:\/\//.test(url)&&!/[\s"'<>\\]/.test(url)&&(()=>{try{return !new URL(url).username&&!new URL(url).password}catch{return false}})());
 if(!['logo','heroLogo','heroImage'].every(k=>safeUrl(b[k as keyof Brand] as string,true)))return false;
 if(!['instagram','facebook','reviewUrl','siteUrl'].every(k=>safeUrl(b[k as keyof Brand] as string)))return false;
 return Array.isArray(b.examples)&&b.examples.length<=12&&b.examples.every(e=>e&&typeof e.image==='string'&&typeof e.title==='string'&&e.title.length<=100&&safeUrl(e.image,true));
}
export async function readBrand(database:D1Database):Promise<Brand>{
 const [row,profileRow]=await Promise.all([
 database.prepare("SELECT value FROM settings WHERE key='installation_brand'").first<{value:string}>(),
 database.prepare("SELECT value FROM settings WHERE key='barber_profile'").first<{value:string}>(),
 ]);
 const b:unknown=row?JSON.parse(row.value):defaultBrand;
 if(!validBrand(b))throw Error('Configuração visual inválida');
 if(profileRow){const p=JSON.parse(profileRow.value) as Partial<Brand>;const merged={...b,name:p.name??b.name,bio:p.bio??b.bio,yearsExperience:p.yearsExperience??b.yearsExperience};if(validBrand(merged))return merged;}
 return b;
}
export function whatsappUrl(brand:Brand){return brand.whatsapp?`https://wa.me/${brand.whatsapp}`:''}
