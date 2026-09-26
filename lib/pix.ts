function field(id: string, value: string) { return id + String(value.length).padStart(2, '0') + value; }
export type PixSettings = {key:string;name:string;city:string};
export async function currentPixSettings(database: D1Database): Promise<PixSettings|null> {
  const row=await database.prepare("SELECT value FROM settings WHERE key='pix'").first<{value:string}>();
  if(!row)return null;
  const saved=JSON.parse(row.value) as PixSettings;
  // Atualiza somente a configuração de testes anterior, preservando alterações posteriores do administrador.
  if(saved.key==='16 99776-2019'&&saved.name==='Eric zambonini') {
    const updated={key:'+5516997762016',name:'Eric Henrique Zambonini',city:saved.city||'Araraquara'};
    const result=await database.prepare("UPDATE settings SET value=? WHERE key='pix' AND value=?").bind(JSON.stringify(updated),row.value).run();
    if(result.meta.changes)return updated;
    const latest=await database.prepare("SELECT value FROM settings WHERE key='pix'").first<{value:string}>();
    return latest?JSON.parse(latest.value) as PixSettings:null;
  }
  return saved;
}
function crc(input: string) {
  let value = 0xffff;
  for (const char of input) {
    value ^= char.charCodeAt(0) << 8;
    for (let i = 0; i < 8; i++) value = value & 0x8000 ? (value << 1) ^ 0x1021 : value << 1;
  }
  return (value & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}
export function pixPayload(key: string, name: string, city: string, cents: number, bookingId: string) {
  const txid = bookingId.replace(/-/g, '').slice(0, 25);
  const data = field('00', '01') + field('26', field('00', 'BR.GOV.BCB.PIX') + field('01', key)) + field('52', '0000') + field('53', '986') + field('54', (cents / 100).toFixed(2)) + field('58', 'BR') + field('59', name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25)) + field('60', city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15)) + field('62', field('05', txid)) + '6304';
  return data + crc(data);
}
