import {SiteProvider} from './site-context';
import {getBrand} from '@/lib/site-settings';
import {readLicense} from '@/lib/licensing';
import {plans} from '@/lib/plans';
import type { Metadata } from 'next';
import './globals.css';
import PwaRegister from './pwa-register';
import PrivacyNotice from './privacy-notice';
import PwaInstallPrompt from './pwa-install-prompt';
import WhatsAppFloat from './whatsapp-float';
import NavigationFeedback from './navigation-feedback';
export const dynamic='force-dynamic';
export async function generateMetadata():Promise<Metadata>{const brand=await getBrand();return {title:`${brand.name} | Agendamentos`,description:brand.tagline,icons:{icon:'/favicon.png',apple:[{url:'/apple-touch-icon.png',sizes:'180x180',type:'image/png'}]},manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:brand.name,statusBarStyle:'black-translucent'}}}
export default async function RootLayout({children}:{children:React.ReactNode}){
 const brand=await getBrand(),license=await readLicense();
 return <html lang="pt-BR"><body id="top"><SiteProvider brand={brand} modules={plans[license.plan].modules}><PwaRegister/><NavigationFeedback/>{children}<WhatsAppFloat/><PrivacyNotice/><PwaInstallPrompt/></SiteProvider></body></html>
}
