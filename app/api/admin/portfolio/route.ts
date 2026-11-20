import {requireModule} from '@/lib/licensing';
import { db, ownerOnly, unavailable } from '@/lib/server';
import { env } from 'cloudflare:workers';
export async function GET() {
 const moduleDenied=await requireModule('portfolio');if(moduleDenied)return moduleDenied;

  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try { return Response.json((await db().prepare('SELECT * FROM portfolio ORDER BY sort_order,title').all()).results); } catch { return unavailable(); }
}
export async function POST(request: Request) {
 const moduleDenied=await requireModule('portfolio');if(moduleDenied)return moduleDenied;

  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try {
    const form = await request.formData(), file = form.get('file'), title = form.get('title'), category = form.get('category'), alt = form.get('alt');
    if (!(file instanceof File) || !['image/jpeg','image/png','image/webp'].includes(file.type) || !file.size || file.size > 10*1024*1024 || typeof title !== 'string' || !title.trim() || title.length > 100 || typeof category !== 'string' || !category.trim() || category.length > 60 || typeof alt !== 'string' || alt.length > 200) return Response.json({ error: 'Confira imagem (até 10 MB), título, categoria e descrição.' }, { status: 400 });
    const id = crypto.randomUUID(), key = `portfolio/${id}`;
    await env.BUCKET!.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    try { await db().prepare('INSERT INTO portfolio(id,title,category,alt_text,image_key,active,sort_order) VALUES(?,?,?,?,?,1,0)').bind(id,title.trim(),category.trim(),alt.trim()||title.trim(),key).run(); }
    catch { await env.BUCKET!.delete(key); throw Error('Falha ao salvar trabalho'); }
    return Response.json({ id }, { status: 201 });
  } catch { return unavailable(); }
}
export async function PATCH(request: Request) {
 const moduleDenied=await requireModule('portfolio');if(moduleDenied)return moduleDenied;

  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  let data: { id?: string; active?: boolean; title?: string; category?: string; alt_text?: string; sort_order?: number };
  try { data = await request.json(); } catch { return Response.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!data.id || data.active !== undefined && typeof data.active !== 'boolean' || data.title !== undefined && (!data.title.trim() || data.title.length > 100) || data.category !== undefined && (!data.category.trim() || data.category.length > 60) || data.alt_text !== undefined && data.alt_text.length > 200 || data.sort_order !== undefined && (!Number.isInteger(data.sort_order) || Math.abs(data.sort_order) > 10000)) return Response.json({ error: 'Dados inválidos' }, { status: 400 });
  try { const database=db();const current=await database.prepare('SELECT title,category,alt_text,sort_order,active FROM portfolio WHERE id=?').bind(data.id).first<{title:string;category:string;alt_text:string;sort_order:number;active:number}>();if(!current)return Response.json({error:'Trabalho não encontrado'},{status:404});await database.prepare('UPDATE portfolio SET title=?,category=?,alt_text=?,sort_order=?,active=? WHERE id=?').bind(data.title?.trim()??current.title,data.category?.trim()??current.category,data.alt_text?.trim()||current.alt_text,data.sort_order??current.sort_order,data.active===undefined?current.active:Number(data.active),data.id).run(); return Response.json({ ok: true }); } catch { return unavailable(); }
}
export async function DELETE(request:Request){
 const moduleDenied=await requireModule('portfolio');if(moduleDenied)return moduleDenied;

 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 let data:{id?:string};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
 if(!data.id)return Response.json({error:'Trabalho inválido'},{status:400});
 try{const database=db();const item=await database.prepare('SELECT image_key FROM portfolio WHERE id=?').bind(data.id).first<{image_key:string}>();if(!item)return Response.json({error:'Trabalho não encontrado'},{status:404});await database.prepare('DELETE FROM portfolio WHERE id=?').bind(data.id).run();await env.BUCKET!.delete(item.image_key).catch(()=>{});return Response.json({ok:true})}catch{return unavailable()}
}
