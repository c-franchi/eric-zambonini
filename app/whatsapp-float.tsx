'use client';
import {MessageCircle} from 'lucide-react';
import {useSite} from './site-context';
export default function WhatsAppFloat(){const {brand}=useSite();return brand.whatsapp?<a className="floating-whatsapp" href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp do estabelecimento"><MessageCircle size={26}/></a>:null}
