'use client';
import {createContext,useContext} from 'react';
import {defaultBrand,type Brand} from '@/lib/brand';
import type {ModuleId} from '@/lib/plans';
const Context=createContext<{brand:Brand;modules:readonly ModuleId[]}>({brand:defaultBrand,modules:['agenda','chat','portfolio']});
export function SiteProvider({brand,modules,children}:{brand:Brand;modules:readonly ModuleId[];children:React.ReactNode}){return <Context.Provider value={{brand,modules}}>{children}</Context.Provider>}
export const useSite=()=>useContext(Context);
export default function BrandLogo({hero=false}:{hero?:boolean}){const {brand}=useSite();const src=hero?brand.heroLogo:brand.logo;return src?<img src={src} alt={`${brand.name} — ${brand.tagline}`} width={hero?1714:1420} height={hero?918:180}/>:<span className="brand-word">{brand.name}<small>{brand.tagline}</small></span>}
