'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ShoppingBag } from 'lucide-react';

type Product={id:string;name:string;description:string;price_cents:number;stock:number;allow_preorder:number;image_url:string|null};
type Booking={id:string;date:string;time:string;service_name:string};
type Order={id:string;status:string;payment_status:string;total_cents:number;date:string;time:string;service_name:string;items:{product_name:string;unit_price_cents:number;quantity:number;is_preorder:number}[]};
const money=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export default function Storefront({products,bookings,signedIn}:{products:Product[];bookings:Booking[];signedIn:boolean}){
  const [catalog,setCatalog]=useState(products),[cart,setCart]=useState<Record<string,number>>({}),[bookingId,setBookingId]=useState(''),[orders,setOrders]=useState<Order[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const requestId=useRef<string|null>(null),sending=useRef(false);
  const cartItems=useMemo(()=>catalog.filter(product=>cart[product.id]>0),[cart,catalog]);
  const total=cartItems.reduce((sum,product)=>sum+product.price_cents*cart[product.id],0);
  const loadOrders=useCallback(async()=>{if(!signedIn)return;try{const response=await fetch('/api/cliente/orders',{cache:'no-store'});const data=await response.json();if(response.ok&&Array.isArray(data))setOrders(data)}catch{}},[signedIn]);
  useEffect(()=>{const timer=window.setTimeout(()=>void loadOrders(),0);return()=>clearTimeout(timer)},[loadOrders]);
  function add(product:Product){setCart(current=>({...current,[product.id]:Math.min((current[product.id]||0)+1,product.stock>0?product.stock:20)}));requestId.current=null;setMessage(`${product.name} adicionado à sacola.`)}
  function changeQuantity(id:string,quantity:number){setCart(current=>({...current,[id]:quantity>0?quantity:0}));requestId.current=null}
  async function placeOrder(event:React.FormEvent){
    event.preventDefault();if(sending.current)return;
    if(!signedIn){setMessage('Entre na sua conta para concluir o pedido.');return}
    if(!bookingId){setMessage('Selecione o agendamento em que vai retirar os produtos.');return}
    if(!cartItems.length){setMessage('Adicione pelo menos um produto à sacola.');return}
    sending.current=true;setBusy(true);setMessage('Registrando sua encomenda…');
    const id=requestId.current||crypto.randomUUID();requestId.current=id;
    try{
      const response=await fetch('/api/cliente/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({booking_id:bookingId,request_id:id,items:cartItems.map(product=>({product_id:product.id,quantity:cart[product.id]}))})});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível concluir o pedido.');
      setCart({});requestId.current=null;setMessage('Pedido registrado. O pagamento será feito no dia do agendamento.');await Promise.all([loadOrders(),fetch('/api/store',{cache:'no-store'}).then(result=>result.json()).then(items=>{if(Array.isArray(items))setCatalog(items)}).catch(()=>{})]);
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível concluir o pedido.')}
    finally{sending.current=false;setBusy(false)}
  }
  const orderStatus=(status:string)=>({PENDING:'Aguardando confirmação',CONFIRMED:'Confirmada',READY:'Separada para retirada',DELIVERED:'Entregue',CANCELLED:'Cancelada'}[status]||status);
  return <main className="store-page">
    <section className="store-hero wrap"><p className="eyebrow">CUIDADO TAMBÉM EM CASA</p><h1>Loja</h1><p>Produtos selecionados para complementar seu atendimento. Faça o pedido e retire no dia do seu horário.</p></section>
    <div className="wrap store-layout"><section className="store-catalog"><div className="section-head"><p className="eyebrow">PRODUTOS</p><h2>Escolha seus itens</h2></div>{catalog.length?<div className="store-product-grid">{catalog.map(product=><article className="store-product-card" key={product.id}>{product.image_url?<img src={product.image_url} alt={product.name} loading="lazy"/>:<div className="store-product-image-empty"><ShoppingBag size={34}/></div>}<div className="store-product-copy"><h3>{product.name}</h3>{product.description&&<p>{product.description}</p>}<strong>{money(product.price_cents)}</strong><span className={`store-stock ${product.stock===0?'preorder':''}`}>{product.stock>0?`${product.stock} em estoque`:product.allow_preorder?'Encomenda para seu agendamento':'Esgotado'}</span><button className="button" type="button" disabled={product.stock===0&&!product.allow_preorder} onClick={()=>add(product)}>Adicionar <ArrowRight size={17}/></button></div></article>)}</div>:<div className="empty store-empty">Os produtos estarão disponíveis em breve.</div>}</section>
      <aside className="store-checkout form-panel"><p className="eyebrow">SEU PEDIDO</p><h2>Sacola</h2>{cartItems.length?<ul className="store-cart-items">{cartItems.map(product=><li key={product.id}><div><strong>{product.name}</strong><span>{money(product.price_cents)} cada</span></div><input aria-label={`Quantidade de ${product.name}`} type="number" min="0" max={product.stock>0?product.stock:20} value={cart[product.id]} onChange={event=>changeQuantity(product.id,Number(event.target.value))}/></li>)}</ul>:<p className="muted">Adicione produtos para montar seu pedido.</p>}<p className="store-total"><span>Total</span><strong>{money(total)}</strong></p>{signedIn?<form className="stack" onSubmit={placeOrder}><label>Agendamento para retirada<select required value={bookingId} onChange={event=>setBookingId(event.target.value)}><option value="">Selecione seu horário</option>{bookings.map(booking=><option key={booking.id} value={booking.id}>{booking.date.split('-').reverse().join('/')} às {booking.time} · {booking.service_name}</option>)}</select></label>{!bookings.length&&<p className="muted">Você precisa ter um agendamento futuro confirmado para fazer uma encomenda. <a href="/agendar">Agendar horário</a></p>}<p className="store-payment-note">Pagamento no dia do agendamento, no atendimento. Itens sem estoque serão encomendados para a data escolhida.</p><button className="button" type="submit" disabled={busy||!cartItems.length||!bookings.length}>{busy?'Enviando pedido…':'Confirmar pedido'}</button></form>:<div className="stack"><p>Entre na sua conta para selecionar um agendamento e fazer o pedido.</p><a className="button" href="/cliente">Entrar na área do cliente</a></div>}{message&&<p role="status" className="store-status">{message}</p>}</aside>
    </div>
    {signedIn&&<section className="wrap store-orders"><div className="section-head"><p className="eyebrow">ÁREA DO CLIENTE</p><h2>Meus pedidos</h2></div>{orders.length?<div className="store-order-list">{orders.map(order=><article className="store-order-card" key={order.id}><header><strong>{orderStatus(order.status)}</strong><strong>{money(order.total_cents)}</strong></header><p className="muted">Retirada em {order.date.split('-').reverse().join('/')} às {order.time} · {order.service_name}</p><ul>{order.items.map((item,index)=><li key={`${order.id}-${index}`}>{item.quantity}× {item.product_name}{item.is_preorder?' · Encomenda':''} — {money(item.unit_price_cents*item.quantity)}</li>)}</ul><small>{order.payment_status==='PAID'?'Pago':'Pagamento no dia do atendimento'}</small></article>)}</div>:<p className="muted">Seus pedidos aparecerão aqui.</p>}</section>}
  </main>;
}
