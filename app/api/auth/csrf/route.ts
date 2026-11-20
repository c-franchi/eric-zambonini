import installation from '@/lib/installation';
export async function GET() {
  const token = crypto.randomUUID();
  return new Response(JSON.stringify({ token }), { headers: { 'content-type':'application/json', 'cache-control':'no-store', 'set-cookie':`${installation.cookieNamespace}_csrf=${token}; Path=/; SameSite=Strict; Secure; Max-Age=600` } });
}
