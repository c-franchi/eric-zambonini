import AdminPage from '../admin-page';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{section:string}>}){return <AdminPage section={(await params).section}/>}
