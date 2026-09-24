import { ownerOnly } from '@/lib/server';
import { getViewer, googleClientId } from '@/lib/auth';
import GoogleLogin from '@/app/cliente/google-login';
import AdminShell from './shell';
import { adminSections } from '@/lib/admin-nav';
import AdminPanel from './panel';
export default async function AdminPage({section=''}:{section?:string}){
 if(!adminSections.has(section))return <main className="admin-page"><p>Página administrativa não encontrada.</p><a href="/admin">Voltar ao painel</a></main>;
 const identity=await ownerOnly();const viewer=identity?null:await getViewer();
 if(!identity)return <main className="admin-page wrap"><header className="mini-header"><a className="brand" href="/">ERIC <span>ZAMBONINI</span></a><a href="/">Ver site</a></header><div className="form-panel"><h1>Área de gestão</h1><h2>{viewer?'Acesso administrativo não autorizado':'Entre com sua conta de administrador'}</h2><p>{viewer?`A conta ${viewer.email} não está autorizada. Entre com neifranchi@gmail.com.`:'Use neifranchi@gmail.com para acessar o painel.'}</p><GoogleLogin clientId={googleClientId()} redirectTo="/admin"/></div></main>;
 return <AdminShell section={section}><AdminPanel section={section}/></AdminShell>;
}
