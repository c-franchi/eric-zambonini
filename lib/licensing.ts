import { env } from 'cloudflare:workers';
import installation from '@/lib/installation';
import { isPlan, canUse, type PlanId, type ModuleId } from './plans';
export type License={plan:PlanId;updatedAt:string|null;updatedBy:string|null};
export async function readLicense(database:D1Database|undefined=env.DB):Promise<License>{
 if(!database)throw Error('Banco indisponível');
 const row=await database.prepare("SELECT value FROM settings WHERE key='installation_license'").first<{value:string}>();
 if(!row)return {plan:isPlan(installation.defaultPlan)?installation.defaultPlan:'agenda',updatedAt:null,updatedBy:null};
 const saved=JSON.parse(row.value) as License;
 if(!isPlan(saved.plan))throw Error('Plano da instalação inválido');
 return saved;
}
export async function requireModule(module:ModuleId):Promise<Response|null>{
 try{const license=await readLicense();if(canUse(license.plan,module))return null;
 return Response.json({error:'Este recurso não está incluído no plano contratado.',code:'MODULE_NOT_INCLUDED',module},{status:403,headers:{'cache-control':'no-store'}});
 }catch{return Response.json({error:'Não foi possível validar o plano. Tente novamente.'},{status:503,headers:{'cache-control':'no-store'}})}
}
