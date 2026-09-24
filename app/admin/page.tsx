import Link from 'next/link';
import { ownerOnly } from '@/lib/server';
import AdminPanel from './panel';
export const dynamic='force-dynamic';
export default async function Admin(){const identity=await ownerOnly();return <main className="admin-page"><header className="mini-header wrap"><Link href="/" className="brand">ERIC <span>ZAMBONINI</span></Link><Link href="/">Ver site</Link></header><div className="wrap"><p className="eyebrow">GESTÃO DA AGENDA</p><h1>Painel administrativo</h1>{identity?<AdminPanel/>:<div className="empty">Entre no ambiente privado para gerenciar a agenda.</div>}</div></main>}
