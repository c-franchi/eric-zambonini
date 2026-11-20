import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,existsSync,symlinkSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
const root=resolve(import.meta.dirname,'..'),temp=mkdtempSync(join(tmpdir(),'agendai-template-')),out=join(temp,'client');
const config={installationId:'profissional-demo',name:'Profissional Demonstração',adminEmail:'cliente@example.com',platformAdminEmail:'operador@example.com',plan:'agenda',siteUrl:'https://cliente.example.com'};
const file=join(temp,'client.json');writeFileSync(file,JSON.stringify(config));
function run(args,cwd=root){const r=spawnSync(process.execPath,args,{cwd,encoding:'utf8'});if(r.status!==0)throw Error((r.stdout||'')+(r.stderr||''));return r.stdout}
run(['scripts/create-client-template.mjs','--config',file,'--out',out]);
const hosting=JSON.parse(readFileSync(join(out,'.openai/hosting.json')));
assert.equal(hosting.project_id,undefined);
for(const dir of ['.git','.wrangler','.sites-runtime','dist','node_modules'])assert.equal(existsSync(join(out,dir)),false);
const install=JSON.parse(readFileSync(join(out,'config/installation.json')));
assert.equal(install.defaultPlan,'agenda');assert.equal(install.legacyServiceCatalog,false);assert.equal(install.legacyPixMigration,null);
assert.deepEqual(install.adminEmails,[config.adminEmail]);assert.deepEqual(install.platformAdminEmails,[config.platformAdminEmail]);
const brand=JSON.parse(readFileSync(join(out,'config/brand.json')));
assert.equal(brand.logo,'');assert.equal(brand.whatsapp,'');assert.deepEqual(brand.examples,[]);
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(join(dir,d.name)):[join(dir,d.name)])}
for(const path of walk(out)){
 assert.ok(!/\.(?:sqlite|db|tar|gz)$/.test(path),'No database or release archives');
 if(/\.(?:ts|tsx|js|mjs|json|html|css|md)$/.test(path)){
  const text=readFileSync(path,'utf8');
  for(const privateMarker of ['neif'+'ranchi@gmail.com','eric.cabe'+'leireiro@gmail.com','eric'+'zambonini.com.br','5516'+'997762019','appgprj_'+'6ab5448095c081918bffeb22d7da67ad'])assert.equal(text.includes(privateMarker),false,'Original installation reference in '+path);
 }
}
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
for(const migration of readdirSync(join(out,'drizzle')).filter(n=>n.endsWith('.sql')).sort())db.exec(readFileSync(join(out,'drizzle',migration),'utf8'));
const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
assert.ok(tables.length>=15);
for(const {name} of tables)assert.equal(db.prepare(`SELECT count(*) n FROM "${name}"`).get().n,0,'No copied records: '+name);
// Dependencies are linked solely during local validation; never part of the export.
symlinkSync(join(root,'node_modules'),join(out,'node_modules'),'dir');
try{run([join(root,'node_modules/typescript/bin/tsc'),'--noEmit','--incremental','false'],out);run(['scripts/test-admin-navigation.mjs'],out);run(['scripts/test-plans.mjs'],out)}finally{unlinkSync(join(out,'node_modules'))}
console.log(`PASS: clean client template, ${tables.length} empty tables, no original access/hosting/data, and independent TypeScript + plan/navigation tests. Output: ${out}`);
