import { db } from '@/lib/server';

// One-time content update. The marker prevents later administrator edits from being overwritten.
export async function ensureServiceCatalog() {
  const database=db();
  const marker=await database.prepare("SELECT value FROM settings WHERE key='service_catalog_2026_09_26'").first();
  if(marker)return;
  const additions:[string,string,string,number,number,number][]=[
    ['svc-corte-feminino','Corte feminino','womens_cut',30,3500,0],
    ['svc-sobrancelha','Sobrancelha','eyebrow',30,2000,0],
    ['svc-sobrancelha-henna','Sobrancelha henna','henna',30,3500,0],
    ['svc-progressiva','Progressiva','progressiva',180,0,1],
    ['svc-luzes-definitiva','Luzes definitiva','highlights',180,0,1],
    ['svc-alisamento','Alisamento','straightening',180,0,1],
    ['svc-botox','Botox capilar','botox',180,0,1],
    ['svc-sobrancelha-micropigmentacao','Sobrancelha micropigmentação','micropigmentation',90,0,1],
  ];
  await database.batch([
    database.prepare("UPDATE services SET name='Corte masculino',icon='scissors',duration_min=30,price_cents=3500,price_variable=0,allow_in_person_payment=1,interleaved_blocks=NULL WHERE id='a75a47aa-5aaf-4c75-9679-43795633473e'"),
    database.prepare("UPDATE services SET name='Escova',icon='brush',duration_min=60,price_cents=0,price_variable=1,allow_in_person_payment=1,interleaved_blocks=NULL WHERE id='ce65575e-00be-4cd7-aa5c-a373ce1412ad'"),
    ...additions.map(([id,name,icon,duration,price,variable])=>database.prepare('INSERT OR IGNORE INTO services(id,name,icon,description,duration_min,price_cents,price_variable,active,allow_in_person_payment,interleaved_blocks) VALUES(?,?,?,NULL,?,?,?,1,1,NULL)').bind(id,name,icon,duration,price,variable)),
    database.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('service_catalog_2026_09_26','applied')"),
  ]);
}
