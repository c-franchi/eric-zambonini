'use client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { durationLabel, servicePriceLabel, type Service } from '@/lib/booking';

export default function ServicePicker({services,value,onChange,placeholder='Selecione um serviço',disabled=false}:{services:Service[];value:string;onChange:(value:string)=>void;placeholder?:string;disabled?:boolean}){
  return <Select value={value||undefined} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger className="service-picker-trigger"><SelectValue placeholder={placeholder}/></SelectTrigger>
    <SelectContent className="service-picker-content" position="popper" align="start">
      {services.map(service=><SelectItem className="service-picker-item" key={service.id} value={service.id}>
        <span className="service-picker-copy"><strong>{service.name}</strong><small>{servicePriceLabel(service)} · {durationLabel(service.duration_min)}</small></span>
      </SelectItem>)}
    </SelectContent>
  </Select>
}
