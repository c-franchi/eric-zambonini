import installation from '@/lib/installation';
export const adminEmails=installation.adminEmails;
export const platformAdminEmails=installation.platformAdminEmails;
export function isAdminEmail(email:string){const key=email.trim().toLowerCase();return [...adminEmails,...platformAdminEmails].some(item=>item.toLowerCase()===key)}
export function isPlatformAdminEmail(email:string){return platformAdminEmails.some(item=>item.toLowerCase()===email.trim().toLowerCase())}
