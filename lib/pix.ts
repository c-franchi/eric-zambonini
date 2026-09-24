function field(id: string, value: string) { return id + String(value.length).padStart(2, '0') + value; }
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
