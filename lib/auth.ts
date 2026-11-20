import installation from '@/lib/installation';
import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';

const cookieName = `${installation.cookieNamespace}_session`;
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export type Viewer = { sub: string; email: string; name: string };
const runtime = () => env as unknown as Record<string, string | undefined>;
const signingKey = () => {
  const secret = runtime().SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('Segredo da sessão indisponível');
  return new TextEncoder().encode(secret);
};
export function googleClientId() { return runtime().GOOGLE_CLIENT_ID || ''; }
export async function verifyGoogleCredential(token: string): Promise<Viewer> {
  const id = googleClientId();
  if (!id) throw new Error('Google não configurado');
  const { payload } = await jwtVerify(token, googleKeys, { audience: id, issuer: ['https://accounts.google.com', 'accounts.google.com'], algorithms: ['RS256'] });
  if (!payload.sub || payload.email_verified !== true || typeof payload.email !== 'string') throw new Error('Conta Google sem e-mail verificado');
  return { sub: payload.sub, email: payload.email, name: typeof payload.name === 'string' ? payload.name : payload.email.split('@')[0] };
}
export async function createSession(viewer: Viewer) {
  return new SignJWT({ email: viewer.email, name: viewer.name }).setProtectedHeader({ alg: 'HS256' }).setSubject(viewer.sub).setIssuedAt().setExpirationTime('7d').sign(signingKey());
}
export async function getViewer(): Promise<Viewer | null> {
  const requestHeaders = await headers();
  const token = requestHeaders.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ['HS256'] });
    if (!payload.sub || typeof payload.email !== 'string' || typeof payload.name !== 'string') return null;
    if(!env.DB)return null;
    const account = await env.DB.prepare('SELECT email FROM users WHERE sub = ?').bind(payload.sub).first<{ email: string }>();
    if (!account || account.email.trim().toLowerCase() !== payload.email.trim().toLowerCase()) return null;
    return { sub: payload.sub, email: payload.email, name: payload.name };
  } catch { return null; }
}
export const sessionCookie = cookieName;
