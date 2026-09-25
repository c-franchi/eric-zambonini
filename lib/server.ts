import { getViewer } from '@/lib/auth';
import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import { isAdminEmail } from '@/lib/admin-access';
export function db() {
  if (!env.DB) throw new Error('Banco de dados indisponível');
  return env.DB;
}
export async function ownerOnly() {
  const requestHeaders = await headers();
  const siteEmail = requestHeaders.get('oai-authenticated-user-email');
  if (siteEmail && isAdminEmail(siteEmail)) return true;
  const viewer=await getViewer();
  return Boolean(viewer&&!viewer.sub.startsWith('local:')&&isAdminEmail(viewer.email));
}
export const unavailable = () => Response.json({ error: 'Banco de dados indisponível. Tente novamente.' }, { status: 503 });
