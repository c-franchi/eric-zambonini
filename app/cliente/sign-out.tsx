'use client';
import { unsubscribePush } from '@/app/unsubscribe-push';
export default function SignOut(){return <button className="button outline" type="button" onClick={async()=>{await unsubscribePush();await fetch('/api/auth/logout',{method:'POST'});window.location.assign('/')}}>Sair</button>}
