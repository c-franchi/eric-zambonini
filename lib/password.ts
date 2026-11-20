const iterations=210000;
const encoder=new TextEncoder();
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const fromHex=(value:string)=>new Uint8Array(value.match(/.{2}/g)?.map(byte=>parseInt(byte,16))||[]);
async function derive(password:string,salt:Uint8Array,count:number){
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const safeSalt=new Uint8Array(new ArrayBuffer(salt.byteLength));safeSalt.set(salt);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:safeSalt,iterations:count},key,256));
}
export async function hashPassword(password:string){
  const salt=crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256:${iterations}:${hex(salt)}:${hex(await derive(password,salt,iterations))}`;
}
export async function verifyPassword(password:string,stored:string){
  const match=/^pbkdf2-sha256:(\d+):([0-9a-f]{32}):([0-9a-f]{64})$/.exec(stored);
  if(!match)return false;
  const count=Number(match[1]);if(count<100000||count>500000)return false;
  const actual=await derive(password,fromHex(match[2]),count),expected=fromHex(match[3]);
  let difference=0;for(let i=0;i<actual.length;i++)difference|=actual[i]^expected[i];
  return difference===0;
}
