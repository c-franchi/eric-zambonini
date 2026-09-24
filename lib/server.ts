import { getViewer } from '@/lib/auth';
import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
export function db() {
  if (!env.DB) throw new Error('Banco de dados indisponível');
  return env.DB;
}
export async function ownerOnly() {
  const requestHeaders = await headers();
  if (requestHeaders.get('oai-authenticated-user-email')?.toLowerCase() === 'neifranchi@gmail.com') return true;
  return (await getViewer())?.email.toLowerCase() === 'neifranchi@gmail.com';
}
export const unavailable = () => Response.json({ error: 'Banco de dados indisponível. Tente novamente.' }, { status: 503 });
