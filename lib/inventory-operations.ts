export type InventoryOperation = {
  request_key:string;product_id:string;kind:'PURCHASE'|'LOSS'|'COUNT';quantity:number;unit_cost_cents:number;note:string;
};
export function validInventoryOperation(value:unknown):value is InventoryOperation {
  if(!value||typeof value!=='object')return false;
  const item=value as InventoryOperation;
  return typeof item.request_key==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(item.request_key)&&typeof item.product_id==='string'&&item.product_id.length>0&&item.product_id.length<=100&&['PURCHASE','LOSS','COUNT'].includes(item.kind)&&Number.isSafeInteger(item.quantity)&&item.quantity>=(item.kind==='COUNT'?0:1)&&item.quantity<=100000&&Number.isSafeInteger(item.unit_cost_cents)&&item.unit_cost_cents>=0&&item.unit_cost_cents<=100000000&&typeof item.note==='string'&&item.note.trim().length>=3&&item.note.trim().length<=300;
}
export function operationPayload(item:InventoryOperation) {
 return JSON.stringify({product_id:item.product_id,kind:item.kind,quantity:item.quantity,unit_cost_cents:item.unit_cost_cents,note:item.note.trim()});
}
export function inventoryStatements(database:D1Database,item:InventoryOperation,actor:string,now:string) {
 const payload=operationPayload(item);
 return [
  database.prepare('INSERT OR IGNORE INTO inventory_operations(request_key,product_id,kind,quantity,unit_cost_cents,note,actor_sub,payload,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(item.request_key,item.product_id,item.kind,item.quantity,item.unit_cost_cents,item.note.trim(),actor,payload,now),
  database.prepare(`UPDATE products SET stock=CASE WHEN ?='COUNT' THEN ? WHEN ?='PURCHASE' THEN stock+? ELSE stock-? END,
    unit_cost_cents=CASE WHEN ?='PURCHASE' THEN ? ELSE unit_cost_cents END,inventory_request_key=?,updated_at=?
    WHERE id=? AND EXISTS(SELECT 1 FROM inventory_operations WHERE request_key=? AND payload=? AND applied=0)`).bind(item.kind,item.quantity,item.kind,item.quantity,item.quantity,item.kind,item.unit_cost_cents,item.request_key,now,item.product_id,item.request_key,payload),
  database.prepare('UPDATE inventory_operations SET applied=1 WHERE request_key=? AND payload=? AND applied=0').bind(item.request_key,payload),
 ];
}
export function parseMoneyCents(value:string) {
 let clean=value.trim().replace(/\s/g,'');if(clean.includes(','))clean=clean.replace(/\./g,'').replace(',','.');
 if(!/^\d+(\.\d{1,2})?$/.test(clean))return null;
 const cents=Math.round(Number(clean)*100);return Number.isSafeInteger(cents)&&cents>=0&&cents<=100000000?cents:null;
}
