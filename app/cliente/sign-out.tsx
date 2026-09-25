'use client';
export default function SignOut(){return <button className="button outline" type="button" onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});window.location.assign('/')}}>Sair</button>}
