'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type PixData={code:string;amount:number;key:string;name:string;expiresAt:string|null};
export default function ReceiptUpload({ id, status, immediate=false, expiresAt=null }: { id: string; status: string; immediate?:boolean;expiresAt?:string|null }) {
  const [file, setFile] = useState<File | null>(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [pix, setPix] = useState<PixData|null>(null), [qr,setQr]=useState(''),[visible,setVisible]=useState(immediate||status==='AWAITING_PAYMENT'),[submitted,setSubmitted]=useState(false),[remaining,setRemaining]=useState<number|null>(null),[expired,setExpired]=useState(false);
  useEffect(()=>{if(!visible||status==='PAID')return;let active=true;fetch(`/api/cliente/pix?id=${encodeURIComponent(id)}`).then(async response=>{const data:PixData&{error?:string}=await response.json();if(!response.ok)throw Error(response.status===404?'RESERVA_EXPIRADA':data.error||'Pix indisponível');return data}).then(async data=>{const image=await QRCode.toDataURL(data.code,{width:240,margin:2,errorCorrectionLevel:'M'});if(active){setPix(data);setQr(image);setMessage('')}}).catch(error=>{if(active){if(error instanceof Error&&error.message==='RESERVA_EXPIRADA')setExpired(true);else setMessage(error instanceof Error?error.message:'Pix indisponível')}});return()=>{active=false}},[id,status,visible]);
  const deadline=pix?.expiresAt||expiresAt;
  useEffect(()=>{if(!deadline||submitted||expired)return;const tick=()=>{const seconds=Math.max(0,Math.ceil((Date.parse(deadline)-Date.now())/1000));setRemaining(seconds);if(seconds===0){setExpired(true);void fetch(`/api/cliente/pix?id=${encodeURIComponent(id)}`).catch(()=>{});}};const timer=window.setInterval(tick,1000);tick();return()=>window.clearInterval(timer)},[deadline,id,submitted,expired]);
  async function copy(value:string){try{await navigator.clipboard.writeText(value);setMessage('Copiado.')}catch{setMessage('Não foi possível copiar. Selecione o texto para copiar.')}}
  async function send() {
    if (!file) return;
    setBusy(true);setMessage(''); const form = new FormData(); form.set('booking', id); form.set('file', file);
    try { const response = await fetch('/api/cliente/receipt', { method: 'POST', body: form }); const data: { error?: string } = await response.json(); if (!response.ok) throw Error(data.error || 'Falha ao enviar'); setMessage('Comprovante enviado para análise.');setSubmitted(true);setFile(null);if(!immediate)window.location.reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao enviar'); }
    finally { setBusy(false); }
  }
  return <div className="stack receipt-payment">
    <p>Pix: {expired?'prazo encerrado':submitted||status==='REVIEW'?'comprovante em análise':status==='PAID'?'pagamento aprovado':status==='REJECTED'?'comprovante recusado; confira o pagamento e reenvie':'aguardando pagamento e comprovante'}</p>
    {deadline&&!submitted&&!expired&&<p className="pix-deadline" role="status"><strong>Pague via Pix e envie o comprovante em até 15 minutos.</strong> Sem o comprovante, o horário será liberado. {remaining!==null&&<span>Tempo restante: {String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</span>}</p>}
    {expired&&<p className="pix-deadline" role="alert">O prazo terminou e este horário foi liberado. <a href="/agendar">Faça um novo agendamento.</a></p>}
    {status!=='PAID'&&!expired&&<>
      <button type="button" onClick={()=>setVisible(value=>!value)}>{visible?'Ocultar dados Pix':'Ver QR code e dados Pix'}</button>
      {visible&&<>
        {!pix&&!message&&<p role="status">Gerando QR code...</p>}
        {pix&&<div className="pix-data">
          {qr&&<img src={qr} alt="QR code Pix deste agendamento" width="240" height="240"/>}
          <strong>{(pix.amount/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong>
          <span>Recebedor: {pix.name}</span><span>Chave Pix: {pix.key}</span>
          <button type="button" onClick={()=>void copy(pix.key)}>Copiar chave Pix</button>
          <label>Pix copia e cola<textarea readOnly value={pix.code} rows={4} onFocus={e=>e.target.select()}/></label>
          <button type="button" onClick={()=>void copy(pix.code)}>Copiar código Pix</button>
          <p className="muted">Confira o recebedor e o valor no aplicativo do banco antes de pagar.</p>
        </div>}
      </>}
      {!submitted&&<>
        <label>Comprovante<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
        <button type="button" disabled={!file||busy} onClick={()=>void send()}>Enviar comprovante</button>
      </>}
    </>}
    {message&&<p role="status">{message}</p>}
  </div>;
}
