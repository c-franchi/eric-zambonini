import { db, unavailable } from '@/lib/server';
export async function GET() {
  try {
    const result = await db().prepare('SELECT id, name, description, duration_min, price_cents FROM services WHERE active = 1 ORDER BY name').all();
    return Response.json(result.results);
  } catch { return unavailable(); }
}
