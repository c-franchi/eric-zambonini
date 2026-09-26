import { ownerOnly } from '@/lib/server';
import { getViewer, googleClientId } from '@/lib/auth';
import GoogleLogin from '@/app/cliente/google-login';
import AdminShell from './shell';
import { adminSections } from '@/lib/admin-nav';
import AdminPanel from './panel';
export default async function AdminPage({section=''}:{section?:string}){
 if(!adminSections.has(section))return <main className="admin-page"><p>Página administrativa não encontrada.</p><a href="/admin">Voltar ao painel</a></main>;
 const identity=await ownerOnly();const viewer=identity?null:await getViewer();
 if(!identity)return <main className="admin-page admin-access-page wrap"><header className="mini-header"><a className="brand" href="/">ERIC <span>ZAMBONINI</span></a><a href="/">Voltar ao site</a></header><section className="admin-access-card"><div className="admin-access-mark" aria-hidden="true">EZ</div><p className="eyebrow">ACESSO RESTRITO</p><h1>Painel de gestão</h1><p className="admin-access-intro">Acesse sua agenda, serviços e atendimentos.</p>{viewer?<p className="admin-access-warning" role="alert">A conta {viewer.email} não tem acesso à gestão. Entre com uma conta de administrador autorizada.</p>:<p className="admin-access-hint">Entre com sua conta Google de administrador para continuar.</p>}<div className="admin-access-action"><GoogleLogin clientId={googleClientId()} redirectTo="/admin"/></div><a className="admin-access-home" href="/">← Voltar à página inicial</a></section></main>;
 return <AdminShell section={section}><AdminPanel section={section}/></AdminShell>;
}
