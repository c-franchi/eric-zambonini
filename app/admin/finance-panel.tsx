'use client';
import { useEffect, useState } from 'react';
type Summary={total:number;paid_cents:number;pending_cents:number;cancelled:number;receipts_to_review:number};
const now=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date());
export default function FinancePanel(){const [month,setMonth]=useState(now),[summary,setSummary]=useState<Summary|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;fetch(`/api/admin/finance?month=${encodeURIComponent(month)}`,{cache:'no-store'}).then(r=>r.json() as Promise<Summary&{error?:string}>).then(data=>{if(!active)return;if(data.error)setError(data.error);else{setSummary(data);setError('')}}).catch(()=>{if(active)setError('Falha ao carregar o resumo.')});return()=>{active=false}},[month]);
 const money=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 return <section className="form-panel full"><h2>Financeiro</h2><label>Mês dos atendimentos<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>{summary&&<div className="finance-summary"><div><span>Recebido e aprovado</span><strong>{money(summary.paid_cents||0)}</strong></div><div><span>Em aberto</span><strong>{money(summary.pending_cents||0)}</strong></div><div><span>Agendamentos</span><strong>{summary.total||0}</strong></div><div><span>Cancelados</span><strong>{summary.cancelled||0}</strong></div><div><span>Comprovantes a analisar</span><strong>{summary.receipts_to_review||0}</strong></div></div>}<p className="muted">Valores de reservas no mês selecionado. Pix só entra em recebido depois da aprovação; pagamento presencial só depois da marcação no painel.</p>{error&&<p role="alert">{error}</p>}</section>
}
