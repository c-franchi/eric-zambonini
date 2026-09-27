'use client';
import { useId, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Clock3 } from 'lucide-react';
import { durationLabel, servicePriceLabel, type Service } from '@/lib/booking';
import ServiceThumbnail from '@/app/service-thumbnail';

export default function ServicePicker({services,value,onChange,placeholder='Selecione um serviço',disabled=false}:{services:Service[];value:string;onChange:(value:string)=>void;placeholder?:string;disabled?:boolean}){
  const [open,setOpen]=useState(false);
  const listId=useId();
  const selected=services.find(service=>service.id===value);
  return <div className="service-picker">
    <button type="button" className="service-picker-trigger" aria-expanded={open} aria-controls={listId} disabled={disabled} onClick={()=>setOpen(current=>!current)}>
      {selected?<><ServiceThumbnail icon={selected.icon} name={selected.name}/><span className="service-picker-selected-copy"><strong>{selected.name}</strong><small>{servicePriceLabel(selected)} · {durationLabel(selected.duration_min)}</small></span></>:<span>{placeholder}</span>}
      <ChevronDown className={open?'service-picker-chevron open':''} size={20}/>
    </button>
    {open&&<div className="service-picker-list" id={listId} role="group" aria-label="Serviços disponíveis">
      {services.map(service=><button type="button" aria-pressed={value===service.id} className={`service-picker-option${value===service.id?' selected':''}`} key={service.id} onClick={()=>{onChange(service.id);setOpen(false)}}>
        <ServiceThumbnail icon={service.icon} name={service.name}/>
        <span className="booking-service-info"><strong>{service.name}</strong><span className="booking-service-meta"><Clock3 size={16}/>{durationLabel(service.duration_min)}<b>{servicePriceLabel(service)}</b></span></span>
        {value===service.id?<Check className="service-picker-option-check" size={19}/>:<ChevronRight className="service-picker-option-check" size={19}/>}
      </button>)}
    </div>}
  </div>
}
