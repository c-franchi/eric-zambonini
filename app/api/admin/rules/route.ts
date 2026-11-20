import { db, ownerOnly, unavailable } from '@/lib/server';
import { parseBookingRules } from '@/lib/booking';
export async function GET() {
  if (!await ownerOnly()) return Response.json({error:'Acesso negado'},{status:403});
  try { const row = await db().prepare("SELECT value FROM settings WHERE key='booking_rules'").first<{value:string}>(); return Response.json(parseBookingRules(row?.value)); } catch { return unavailable(); }
}
export async function PUT(request:Request) {
  if (!await ownerOnly()) return Response.json({error:'Acesso negado'},{status:403});
  let rules:{minHours?:number;maxDays?:number;cancelHours?:number};
  try { rules=await request.json(); } catch { return Response.json({error:'Dados inválidos'},{status:400}); }
  if (!Number.isInteger(rules.minHours)||rules.minHours!<0||rules.minHours!>168||!Number.isInteger(rules.maxDays)||rules.maxDays!<1||rules.maxDays!>365||!Number.isInteger(rules.cancelHours)||rules.cancelHours!<0||rules.cancelHours!>168) return Response.json({error:'Confira os limites da agenda'},{status:400});
  try { await db().prepare("INSERT INTO settings(key,value) VALUES('booking_rules',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(rules)).run(); return Response.json({ok:true}); } catch { return unavailable(); }
}
