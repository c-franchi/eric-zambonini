import { getViewer } from '@/lib/auth';
import { env } from 'cloudflare:workers';
import { isAdminEmail } from '@/lib/admin-access';
export function db() {
  if (!env.DB) throw new Error('Banco de dados indisponível');
  return env.DB;
}
export async function ownerOnly() {
  const viewer=await getViewer();
  return Boolean(viewer&&!viewer.sub.startsWith('local:')&&isAdminEmail(viewer.email));
}
export const unavailable = () => Response.json({ error: 'Banco de dados indisponível. Tente novamente.' }, { status: 503 });
