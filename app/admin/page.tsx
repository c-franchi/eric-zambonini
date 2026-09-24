import Link from 'next/link';
import { ownerOnly } from '@/lib/server';
import AdminPanel from './panel';
import GoogleLogin from '@/app/cliente/google-login';
import { getViewer, googleClientId } from '@/lib/auth';
export const dynamic='force-dynamic';
export default async function Admin(){const identity=await ownerOnly(),viewer=await getViewer();return <main className="admin-page"><header className="mini-header wrap"><Link href="/" className="brand">ERIC <span>ZAMBONINI</span></Link><Link href="/">Ver site</Link></header><div className="wrap"><p className="eyebrow">GESTÃO DA AGENDA</p><h1>Painel administrativo</h1>{identity?<AdminPanel/>:<div className="form-panel"><h2>{viewer?'Acesso administrativo não autorizado':'Entre com sua conta de administrador'}</h2><p>{viewer?`A conta ${viewer.email} não está autorizada. Entre com neifranchi@gmail.com.`:'Use neifranchi@gmail.com para acessar o painel.'}</p><GoogleLogin clientId={googleClientId()} redirectTo="/admin"/></div>}</div></main>}
