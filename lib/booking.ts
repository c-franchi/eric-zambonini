export type Service = { id: string; name: string; description: string | null; duration_min: number; price_cents: number };
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
export function parseBookingRules(value: string | undefined | null): BookingRules {
  try {
    const parsed = JSON.parse(value || '{}');
    if (Number.isInteger(parsed.minHours) && parsed.minHours >= 0 && parsed.minHours <= 168 && Number.isInteger(parsed.maxDays) && parsed.maxDays >= 1 && parsed.maxDays <= 365 && Number.isInteger(parsed.cancelHours) && parsed.cancelHours >= 0 && parsed.cancelHours <= 168) return parsed;
  } catch {}
  return defaultBookingRules;
}
export function salonTimeStamp(date: string, time: string) {
  return Date.parse(`${date}T${time}:00-03:00`);
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
export function availableTimes(date: string, duration: number, schedule: Record<string, [string, string] | null>, occupied: Set<string>, rules: BookingRules = defaultBookingRules) {
  if (!validDate(date) || date < dayInSalon() || duration <= 0) return [];
  if ((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${dayInSalon()}T12:00:00Z`)) / 86400000 > rules.maxDays) return [];
  const range = schedule[String(weekday(date))];
  if (!range) return [];
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const start = toMin(range[0]), end = toMin(range[1]);
  const times: string[] = [];
  for (let min = start; min + duration <= end; min += 15) {
    if (date === dayInSalon() && min <= minuteInSalon()) continue;
    const label = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
    if (salonTimeStamp(date, label) < Date.now() + rules.minHours * 3600000) continue;
    if (slotsFor(label, duration).every((slot) => !occupied.has(slot))) times.push(label);
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
