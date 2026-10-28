import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const root=resolve(import.meta.dirname,'..'),native=createRequire(import.meta.url);
const sql=new DatabaseSync(':memory:');
sql.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
let viewer=null;
const database={prepare(query){let values=[];return {bind(...args){values=args;return this},async first(){return sql.prepare(query).get(...values)||null},async run(){return {meta:{changes:Number(sql.prepare(query).run(...values).changes)}}}}},async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};
const cache=new Map();
function load(file){
 const path=resolve(root,file);if(cache.has(path))return cache.get(path).exports;
 const module={exports:{}};cache.set(path,module);
 const source=readFileSync(path,'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const req=id=>{
 if(id==='cloudflare:workers')return {env:{DB:database}};
 if(id==='@/lib/auth')return {getViewer:async()=>viewer};
 if(id==='@/lib/server')return {db:()=>database,ownerOnly:async()=>Boolean(viewer&&!viewer.sub.startsWith('local:')&&load('lib/admin-access.ts').isAdminEmail(viewer.email))};
 if(id.startsWith('@/')||id.startsWith('.')){let local=id.startsWith('@/')?resolve(root,id.slice(2)):resolve(dirname(path),id);if(local.endsWith('.json'))return JSON.parse(readFileSync(local,'utf8'));if(!local.endsWith('.ts')&&!local.endsWith('.tsx'))local+=existsSync(local+'.ts')?'.ts':'.tsx';return load(local)}
 return native(id);
 };
 new Function('require','module','exports',js)(req,module,module.exports);return module.exports;
}
const {canUse,canOpenSection,apiModule,plans}=load('lib/plans.ts');
assert.equal(canUse('agenda','estoque'),false);assert.equal(canUse('agenda','loja'),false);assert.equal(canUse('agenda','financeiro'),false);
for(const plan of ['gestao','premium'])for(const m of ['loja','estoque','financeiro'])assert.equal(canUse(plan,m),true);
assert.deepEqual(plans.premium.modules,plans.gestao.modules);
assert.equal(canOpenSection('agenda','assinatura'),true);assert.equal(canOpenSection('agenda','estoque'),false);
const installation=JSON.parse(readFileSync(resolve(root,'config/installation.json'),'utf8'));
const operatorEmail=installation.platformAdminEmails[0];
const clientEmail=installation.adminEmails.find(e=>!installation.platformAdminEmails.includes(e))||'client@test.example';
const license=load('lib/licensing.ts'),route=load('app/api/admin/license/route.ts');
assert.equal((await license.readLicense()).plan,installation.defaultPlan,'Installation keeps its configured default');
const request=plan=>new Request('https://test.example/api/admin/license',{method:'PUT',headers:{origin:'https://test.example','content-type':'application/json'},body:JSON.stringify({plan,note:'Contrato de teste confirmado'})});
assert.equal((await route.PUT(request('agenda'))).status,403,'Anonymous cannot manage plans');
viewer={sub:'google-eric',email:clientEmail,name:'Cliente'};
assert.equal((await route.GET()).status,200);assert.equal((await(await route.GET()).json()).canManage,false);
assert.equal((await route.PUT(request('agenda'))).status,403,'Client administrator cannot self-upgrade');
viewer={sub:'local:test',email:operatorEmail};assert.equal((await route.PUT(request('agenda'))).status,403,'Local accounts cannot manage plans');
viewer={sub:'google-operator',email:operatorEmail,name:'Operador'};
assert.equal((await route.PUT(new Request('https://test.example/api/admin/license',{method:'PUT',headers:{origin:'https://evil.example'},body:JSON.stringify({plan:'agenda',note:'teste'})}))).status,403);
assert.equal((await route.PUT(request('unknown'))).status,400);
assert.equal((await route.PUT(request('agenda'))).status,200);
assert.equal((await license.requireModule('estoque')).status,403);assert.equal(await license.requireModule('agenda'),null);
assert.equal((await route.PUT(request('gestao'))).status,200);assert.equal(await license.requireModule('estoque'),null);
assert.equal(sql.prepare("SELECT count(*) n FROM settings WHERE key LIKE 'license_audit:%'").get().n,2);
sql.prepare("UPDATE settings SET value=? WHERE key='installation_license'").run('{"plan":"invalid"}');
assert.equal((await license.requireModule('loja')).status,503,'Invalid licensing fails closed');
// Verify every HTTP handler in a restricted route enforces its module before business logic.
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(resolve(dir,d.name)):[resolve(dir,d.name)])}
let protectedHandlers=0;
for(const file of walk(resolve(root,'app/api')).filter(f=>f.endsWith('/route.ts'))){
 const path='/api/'+file.slice(resolve(root,'app/api').length+1).replace('/route.ts','');const module=apiModule(path);if(!module)continue;
 const source=readFileSync(file,'utf8');const handlers=[...source.matchAll(/export async function (GET|POST|PATCH|PUT|DELETE)\([^\n]*?\)\s*\{([^]*?)(?=export async function|$)/g)];
 for(const h of handlers){assert.match(h[2].trimStart(),new RegExp(`^const moduleDenied=await requireModule\\('${module}'\\);if\\(moduleDenied\\)return moduleDenied;`),path+' '+h[1]);protectedHandlers++}
}
assert.ok(protectedHandlers>=17);
const {validBrand,defaultBrand}=load('lib/brand.ts');
assert.equal(validBrand(defaultBrand),true);
assert.equal(validBrand({...defaultBrand,logo:'javascript:alert(1)'}),false);
assert.equal(validBrand({...defaultBrand,instagram:'https://a.example/" onmouseover="bad'}),false);
assert.equal(validBrand({...defaultBrand,logo:'//evil.example/image'}),false);
console.log(`PASS: plan permissions, administrator roles, origin protection, audit, fail-closed licensing, ${protectedHandlers} API handlers and brand validation.`);

// Render the real authenticated shell, not only individual menu icons.
const {createElement}=native('react'),{renderToStaticMarkup}=native('react-dom/server');
const Shell=load('app/admin/shell.tsx').default;
const {SiteProvider}=load('app/site-context.tsx');
const {adminItems}=load('lib/admin-nav.ts');
for(const plan of ['agenda','gestao','premium']){
 const allowed=adminItems.filter(i=>canOpenSection(plan,i.slug)).map(i=>i.slug);
 const html=renderToStaticMarkup(createElement(SiteProvider,{brand:defaultBrand,modules:plans[plan].modules},createElement(Shell,{section:'agendar',allowedSections:allowed},'Painel de teste')));
 assert.match(html,/Painel de teste/);
 assert.equal(html.includes('href="/admin/estoque"'),plan!=='agenda');
 assert.equal(html.includes('href="/admin/loja"'),plan!=='agenda');
 assert.match(html,/href="\/admin\/assinatura"/);
}
console.log('PASS: authenticated admin shell renders with the actual components for all three plans.');

// Business identity updates cannot grant plans or change access roles.
const brandRoute=load('app/api/admin/brand/route.ts');
viewer={sub:'google-client',email:clientEmail};
const update=new Request('https://test.example/api/admin/brand',{method:'PUT',headers:{origin:'https://test.example','content-type':'application/json'},body:JSON.stringify({...defaultBrand,name:'Negócio de teste',plan:'premium',platformAdminEmails:[clientEmail]})});
assert.equal((await brandRoute.PUT(update)).status,200);
const saved=JSON.parse(sql.prepare("SELECT value FROM settings WHERE key='installation_brand'").get().value);
assert.equal(saved.name,'Negócio de teste');assert.equal(saved.plan,undefined);assert.equal(saved.platformAdminEmails,undefined);
assert.equal((await route.PUT(request('premium'))).status,403);
console.log('PASS: client can personalize the site without changing its plan or administrator roles.');
