'use client';
type Booking={id:string;status:string;payment_status:string;payment_method:string;price_cents:number};
export default function FinancePanel({bookings}:{bookings:Booking[]}){
 const paid=bookings.filter(b=>b.payment_status==='PAID'&&b.status!=='CANCELLED');
 const pending=bookings.filter(b=>b.payment_status!=='PAID'&&b.status!=='CANCELLED');
 const money=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 return <section className="form-panel full"><h2>Resumo financeiro</h2><p>Recebido e aprovado: <strong>{money(paid.reduce((sum,b)=>sum+b.price_cents,0))}</strong> ({paid.length} reservas)</p><p>Em aberto: <strong>{money(pending.reduce((sum,b)=>sum+b.price_cents,0))}</strong> ({pending.length} reservas)</p><p className="muted">O resumo considera as últimas 200 reservas exibidas abaixo. Comprovantes em análise não entram como recebidos.</p></section>
}
