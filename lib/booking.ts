export type Service = { id: string; name: string; icon?: string | null; description: string | null; duration_min: number; price_cents: number; price_variable: number; allow_in_person_payment: number; interleaved_blocks: string | null };
export const durationLabel=(minutes:number)=>minutes<60?`${minutes} min`:`${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')} hs`;
export const servicePriceLabel=(service:Pick<Service,'price_cents'|'price_variable'>)=>service.price_variable?'Valor a combinar':(service.price_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export type TimeBlock = { start_min:number; duration_min:number; blocked:boolean };
export function validBlocks(blocks:unknown,duration:number):blocks is TimeBlock[] {
  if(!Array.isArray(blocks)||blocks.length<1||blocks.length>32||!Number.isInteger(duration)||duration<15||duration>480)return false;
  let offset=0;
  for(const block of blocks){
    if(!block||typeof block!=='object'||block.start_min!==offset||!Number.isInteger(block.duration_min)||block.duration_min<15||block.duration_min%15!==0||typeof block.blocked!=='boolean')return false;
    offset+=block.duration_min;
  }
  return offset===duration&&blocks[0].blocked;
}
export function parseBlocks(value:string|null|undefined,duration:number):TimeBlock[]|null {
  if(!value)return null;
  try{const blocks=JSON.parse(value);return validBlocks(blocks,duration)?blocks:null}catch{return null}
}
export function occupiedSlotsFor(time:string,duration:number,blocks:TimeBlock[]|null=null):string[] {
  if(!blocks)return slotsFor(time,duration);
  const start=Number(time.slice(0,2))*60+Number(time.slice(3));
  return blocks.filter(block=>block.blocked).flatMap(block=>slotsFor(`${String(Math.floor((start+block.start_min)/60)).padStart(2,'0')}:${String((start+block.start_min)%60).padStart(2,'0')}`,block.duration_min));
}
export const TZ = 'America/Sao_Paulo';
export function dayInSalon() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function minuteInSalon() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === 'hour')?.value) * 60 + Number(parts.find((p) => p.type === 'minute')?.value);
}
export type BookingRules = { minHours: number; maxDays: number; cancelHours: number };
export const defaultBookingRules: BookingRules = { minHours: 2, maxDays: 60, cancelHours: 12 };
export type ClosedInterval = { enabled: boolean; start: string; end: string };
export const defaultClosedInterval: ClosedInterval = { enabled: true, start: '11:30', end: '14:00' };
const bookingTimePattern = /^([01]\d|2[0-3]):(00|15|30|45)$/;
export function validClosedInterval(value: unknown): value is ClosedInterval {
  if (!value || typeof value !== 'object') return false;
  const interval = value as Partial<ClosedInterval>;
  return typeof interval.enabled === 'boolean' && typeof interval.start === 'string' && bookingTimePattern.test(interval.start) && typeof interval.end === 'string' && bookingTimePattern.test(interval.end) && interval.start < interval.end;
}
export function parseClosedInterval(value: string | undefined | null): ClosedInterval {
  if (!value) return defaultClosedInterval;
  try { const parsed: unknown = JSON.parse(value); return validClosedInterval(parsed) ? parsed : defaultClosedInterval; } catch { return defaultClosedInterval; }
}
export function parseBookingRules(value: string | undefined | null): BookingRules {
  try {
    const parsed = JSON.parse(value || '{}');
    if (Number.isInteger(parsed.minHours) && parsed.minHours >= 0 && parsed.minHours <= 168 && Number.isInteger(parsed.maxDays) && parsed.maxDays >= 1 && parsed.maxDays <= 365 && Number.isInteger(parsed.cancelHours) && parsed.cancelHours >= 0 && parsed.cancelHours <= 168) return parsed;
  } catch {}
  return defaultBookingRules;
}
export function salonTimeStamp(date: string, time: string) {
  const localAsUtc=Date.parse(`${date}T${time}:00Z`);
  if(Number.isNaN(localAsUtc))return NaN;
  const zone=new Intl.DateTimeFormat('en-US',{timeZone:TZ,timeZoneName:'shortOffset'}).formatToParts(new Date(localAsUtc)).find(part=>part.type==='timeZoneName')?.value||'';
  const match=/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(zone);
  if(!match)throw new Error('Fuso horário indisponível');
  const offset=(Number(match[2])*60+Number(match[3]||0))*60000*(match[1]==='+'?1:-1);
  return localAsUtc-offset;
}
export function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const value = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(value.getTime()) && value.toISOString().slice(0, 10) === date;
}
export function weekday(date: string) { return new Date(`${date}T12:00:00Z`).getUTCDay(); }
export function slotsFor(time: string, duration: number) {
  const start = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return Array.from({ length: Math.ceil(duration / 15) }, (_, i) => {
    const at = start + i * 15;
    return `${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`;
  });
}
export function availableTimes(date: string, duration: number, schedule: Record<string, [string, string] | null>, occupied: Set<string>, rules: BookingRules = defaultBookingRules, blocks:TimeBlock[]|null=null, closedInterval: ClosedInterval = defaultClosedInterval) {
  if (!validDate(date) || date < dayInSalon() || duration <= 0) return [];
  if ((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${dayInSalon()}T12:00:00Z`)) / 86400000 > rules.maxDays) return [];
  const range = schedule[String(weekday(date))];
  if (!range) return [];
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const start = toMin(range[0]), end = toMin(range[1]);
  const closedStart = toMin(closedInterval.start), closedEnd = toMin(closedInterval.end);
  const times: string[] = [];
  for (let min = start; min + duration <= end; min += 15) {
    if (closedInterval.enabled && min < closedEnd && min + duration > closedStart) continue;
    if (date === dayInSalon() && min <= minuteInSalon()) continue;
    const label = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
    if (salonTimeStamp(date, label) < Date.now() + rules.minHours * 3600000) continue;
    if (occupiedSlotsFor(label,duration,blocks).every((slot) => !occupied.has(slot))) times.push(label);
  }
  return times;
}
export function parseSchedule(value: string | undefined | null): Record<string, [string, string] | null> {
  if (!value) return {};
  try { return JSON.parse(value); } catch { return {}; }
}
export function validSchedule(value: unknown): value is Record<string, [string, string] | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([day, range]) => /^[0-6]$/.test(day) && (range === null ||
    (Array.isArray(range) && range.length === 2 && range.every((time) => typeof time === 'string' && /^([01]\d|2[0-3]):(00|15|30|45)$/.test(time)) && range[0] < range[1])));
}
