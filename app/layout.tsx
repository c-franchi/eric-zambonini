import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Eric Zambonini | Agendamentos',description:'Serviços de beleza masculina e feminina de Eric Zambonini.',icons:{icon:'/favicon.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
