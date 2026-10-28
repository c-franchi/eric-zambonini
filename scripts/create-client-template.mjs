import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync,lstatSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const arg=name=>{const i=args.indexOf(name);return i<0?null:args[i+1]};
const output=arg('--out'),input=arg('--config');
if(!output||!input)throw Error('Uso: node scripts/create-client-template.mjs --config /caminho/cliente.json --out /caminho/novo-projeto');
const c=JSON.parse(readFileSync(resolve(input),'utf8'));
const email=v=>typeof v==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
if(!/^[a-z][a-z0-9-]{2,49}$/.test(c.installationId)||typeof c.name!=='string'||!c.name.trim()||c.name.length>100||!email(c.adminEmail)||!email(c.platformAdminEmail)||!['agenda','gestao','premium'].includes(c.plan))throw Error('Configuração incompleta: installationId, name, adminEmail, platformAdminEmail e plan.');
if((c.tagline!==undefined&&(typeof c.tagline!=='string'||c.tagline.length>500))||(c.bio!==undefined&&(typeof c.bio!=='string'||c.bio.length>1000))||(c.whatsapp!==undefined&&(typeof c.whatsapp!=='string'||!/^\d{0,15}$/.test(c.whatsapp))))throw Error('Revise descrição, apresentação e WhatsApp.');
if(typeof c.siteUrl!=='string'||!/^https:\/\//.test(c.siteUrl)||new URL(c.siteUrl).pathname!=='/'||new URL(c.siteUrl).username||new URL(c.siteUrl).password)throw Error('Informe siteUrl HTTPS, sem credenciais ou caminho.');
const out=resolve(output);
if(out===root||out.startsWith(root+'/')||existsSync(out))throw Error('O destino deve ser uma pasta nova fora da instalação atual.');
const dirs=['app','build','components','db','drizzle','hooks','lib','scripts','vendor','template-assets'];
const files=['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','vite.config.ts','drizzle.config.ts','eslint.config.mjs','components.json','cloudflare-env.d.ts','.gitignore'];
mkdirSync(out,{recursive:true});
const copy=(src,dst)=>cpSync(src,dst,{recursive:true,filter:source=>!lstatSync(source).isSymbolicLink()});
for(const d of dirs)copy(join(root,d),join(out,d));
for(const f of files)if(existsSync(join(root,f)))copy(join(root,f),join(out,f));
if(existsSync(join(root,'.npmrc'))){const safe=readFileSync(join(root,'.npmrc'),'utf8').split('\n').filter(line=>/^(?:node-linker|shamefully-hoist|auto-install-peers|strict-peer-dependencies|manage-package-manager-versions|package-manager-strict)\s*=/.test(line));if(safe.length)writeFileSync(join(out,'.npmrc'),safe.join('\n')+'\n');}
mkdirSync(join(out,'public/images'),{recursive:true});
copy(join(root,'public/images/services'),join(out,'public/images/services'));
for(const f of ['sw.js','offline.html'])copy(join(root,'public',f),join(out,'public',f));
for(const f of readdirSync(join(root,'template-assets')))copy(join(root,'template-assets',f),join(out,'public',f));
// Preserve legacy local-storage names on the original installation only.
for(const rel of ['public/sw.js','app/admin/notification-center.tsx','app/pwa-install-prompt.tsx','app/privacy-notice.tsx']){
 const path=join(out,rel);writeFileSync(path,readFileSync(path,'utf8').replaceAll('eric-',c.installationId+'-'));
}
writeFileSync(join(out,'lib/service-catalog.ts'),'// New installations start with no services.\nexport async function ensureServiceCatalog() {}\n');
mkdirSync(join(out,'config'));
const brand={name:c.name.trim(),tagline:c.tagline||'Atendimento com hora marcada',bio:c.bio||'Conheça nossos serviços e reserve seu horário.',yearsExperience:0,logo:'',heroLogo:'',heroImage:'',whatsapp:c.whatsapp||'',instagram:'',facebook:'',reviewUrl:'',siteUrl:new URL(c.siteUrl).origin,examples:[]};
writeFileSync(join(out,'config/brand.json'),JSON.stringify(brand,null,2)+'\n');
writeFileSync(join(out,'config/installation.json'),JSON.stringify({installationId:c.installationId,templateVersion:1,defaultPlan:c.plan,adminEmails:[c.adminEmail.toLowerCase()],platformAdminEmails:[c.platformAdminEmail.toLowerCase()],legacyServiceCatalog:false,legacyPixMigration:null,cookieNamespace:c.installationId.replaceAll('-','_')},null,2)+'\n');
copy(join(root,'config/pwa.json'),join(out,'config/pwa.json'));
mkdirSync(join(out,'.openai'));
// Deliberately no project ID, Git remote, environment, database or uploaded data.
writeFileSync(join(out,'.openai/hosting.json'),JSON.stringify({d1:'DB',r2:'BUCKET'},null,2)+'\n');
writeFileSync(join(out,'README.md'),`# ${brand.name}\n\nInstalação independente AgendaAÍ, template v1.\n\nAntes de publicar:\n- Registrar como NOVO projeto Sites e persistir seu novo project_id. Nunca reutilizar o ID de outro cliente.\n- Criar banco D1 e bucket R2 próprios; aplicar todas as migrações drizzle na ordem. Não importar banco, arquivos ou configurações de outro profissional.\n- Gerar SESSION_SECRET próprio (mínimo 32 caracteres), configurar GOOGLE_CLIENT_ID e autorizar o novo domínio no Google.\n- Configurar Pix no painel e, se contratados, e-mail, push e lembretes com credenciais próprias.\n- Configurar imagens, identidade e informações do profissional.\n- Validar login, permissões do plano, agenda e módulos antes da publicação.\n\nLiberação manual: administrador AgendaAÍ em /admin/assinatura. O cliente não pode alterar o próprio plano. Não há cobrança automática.\n`);
writeFileSync(join(out,'template-export.json'),JSON.stringify({templateVersion:1,installationId:c.installationId,createdAt:new Date().toISOString(),containsCustomerData:false,requiresNewHosting:true},null,2)+'\n');
console.log(JSON.stringify({checkout_path:out,installationId:c.installationId,plan:c.plan,requiresNewHosting:true}));
