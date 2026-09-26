import type { Metadata } from 'next';
import './globals.css';
import PwaRegister from './pwa-register';
export const metadata: Metadata={title:'Eric Zambonini | Agendamentos',description:'Serviços de beleza masculina e feminina de Eric Zambonini.',icons:{icon:'/favicon.png',apple:'/pwa-192.png'},manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'Eric Agenda',statusBarStyle:'black-translucent'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><PwaRegister/>{children}</body></html>}
