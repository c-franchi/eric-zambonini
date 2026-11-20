import {readLicense} from '@/lib/licensing';
import {canOpenSection} from '@/lib/plans';
import {adminEmails,platformAdminEmails} from '@/lib/admin-access';
import BrandLogo from '@/app/site-context';
import { ownerOnly } from '@/lib/server';
import { getViewer, googleClientId } from '@/lib/auth';
import GoogleLogin from '@/app/cliente/google-login';
import AdminShell from './shell';
import { adminSections } from '@/lib/admin-nav';
import AdminPanel from './panel';
import Link from 'next/link';
import Image from 'next/image';
export default async function AdminPage({section=''}:{section?:string}){
 if(!adminSections.has(section))return <main className="admin-page"><p>Página administrativa não encontrada.</p><Link href="/admin">Voltar ao painel</Link></main>;
 const identity=await ownerOnly();const viewer=identity?null:await getViewer();
 if(!identity)return <main className="admin-page admin-access-page">
  <header className="admin-access-header"><Link href="/" className="admin-access-brand" aria-label="Página inicial"><BrandLogo/></Link><Link href="/" className="admin-access-back">Voltar ao site</Link></header>
  <section className="admin-access-card"><p className="eyebrow">ACESSO RESTRITO</p><h1>Painel de gestão</h1><p className="admin-access-intro">Acesse sua agenda, serviços e atendimentos.</p>{viewer?<p className="admin-access-warning" role="alert">A conta {viewer.email} não tem acesso à gestão. Entre com uma conta de administrador autorizada.</p>:<p className="admin-access-hint">Entre com sua conta Google de administrador para continuar.</p>}<div className="admin-access-action"><GoogleLogin clientId={googleClientId()} redirectTo="/admin/agendar"/></div><Link className="admin-access-home" href="/">← Voltar à página inicial</Link></section>
 </main>;
 const license=await readLicense();
 const allowedSections=[...adminSections].filter(slug=>canOpenSection(license.plan,slug));
 return <AdminShell section={section} allowedSections={allowedSections}>{canOpenSection(license.plan,section)?<AdminPanel section={section} administrators={[...new Set([...adminEmails,...platformAdminEmails])]}/>:<section className="form-panel"><h2>Recurso fora do seu plano</h2><p>Consulte as ferramentas disponíveis no seu plano.</p><a href="/admin/assinatura">Ver meu plano</a></section>}</AdminShell>;
}
