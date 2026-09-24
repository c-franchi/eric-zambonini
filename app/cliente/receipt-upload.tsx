'use client';
import { useState } from 'react';
export default function ReceiptUpload({ id, status }: { id: string; status: string }) {
  const [file, setFile] = useState<File | null>(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [code, setCode] = useState('');
  async function showPix() {
    try { const response = await fetch(`/api/cliente/pix?id=${encodeURIComponent(id)}`); const data: { code?: string; error?: string } = await response.json(); if (!response.ok) throw Error(data.error || 'Pix indisponível'); setCode(data.code || ''); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Pix indisponível'); }
  }
  async function send() {
    if (!file) return;
    setBusy(true); const form = new FormData(); form.set('booking', id); form.set('file', file);
    try { const response = await fetch('/api/cliente/receipt', { method: 'POST', body: form }); const data: { error?: string } = await response.json(); if (!response.ok) throw Error(data.error || 'Falha ao enviar'); window.location.reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao enviar'); }
    finally { setBusy(false); }
  }
  return <div className="stack"><p>Pix: {status === 'PAID' ? 'pagamento aprovado' : status === 'REVIEW' ? 'comprovante em análise' : status === 'REJECTED' ? 'comprovante recusado; confira o pagamento e reenvie' : 'aguardando comprovante'}</p>{status !== 'PAID' && <><button type="button" onClick={() => void showPix()}>Mostrar Pix copia e cola</button>{code && <><textarea readOnly aria-label="Pix copia e cola" value={code} rows={4} /><button type="button" onClick={() => void navigator.clipboard.writeText(code)}>Copiar código Pix</button><p>Confira o recebedor e o valor no seu banco antes de pagar.</p></>}<label>Comprovante<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></label><button type="button" disabled={!file || busy} onClick={() => void send()}>Enviar comprovante</button></>}{message && <p role="alert">{message}</p>}</div>;
}
