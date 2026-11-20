import { Droplets, Eye, Palette, Scissors, Sparkles, Waves } from 'lucide-react';

export const iconChoices = [
  { id: 'scissors', label: 'Corte · tesoura' },
  { id: 'womens_cut', label: 'Corte feminino' },
  { id: 'brush', label: 'Escova capilar' },
  { id: 'progressiva', label: 'Progressiva' },
  { id: 'highlights', label: 'Luzes' },
  { id: 'straightening', label: 'Alisamento' },
  { id: 'botox', label: 'Botox capilar' },
  { id: 'beard', label: 'Barba' },
  { id: 'color', label: 'Coloração' },
  { id: 'eyebrow', label: 'Sobrancelhas' },
  { id: 'henna', label: 'Sobrancelha henna' },
  { id: 'micropigmentation', label: 'Micropigmentação' },
  { id: 'waves', label: 'Cachos e ondas' },
  { id: 'care', label: 'Tratamento' },
  { id: 'sparkles', label: 'Beleza' },
] as const;
export type ServiceIconId = typeof iconChoices[number]['id'];
export function validServiceIcon(value: unknown): value is ServiceIconId {
  return typeof value === 'string' && iconChoices.some((choice) => choice.id === value);
}
export function serviceIconFor(icon: string | null | undefined, name: string): ServiceIconId {
  if (validServiceIcon(icon)) return icon;
  const label = name.toLocaleLowerCase('pt-BR');
  if (/micropigment/.test(label)) return 'micropigmentation';
  if (/sobrancelha.*henna/.test(label)) return 'henna';
  if (/corte.*feminino/.test(label)) return 'womens_cut';
  if (/progressiva/.test(label)) return 'progressiva';
  if (/luzes/.test(label)) return 'highlights';
  if (/alisamento/.test(label)) return 'straightening';
  if (/botox/.test(label)) return 'botox';
  if (/escova|alisamento|penteado/.test(label)) return 'brush';
  if (/barba|bigode/.test(label)) return 'beard';
  if (/sobrancelha|cílios|cilios/.test(label)) return 'eyebrow';
  if (/tintura|colora|luzes|mecha/.test(label)) return 'color';
  if (/hidrata|tratamento|reconstru/.test(label)) return 'care';
  if (/cacho|ondas/.test(label)) return 'waves';
  return 'scissors';
}
export function ServiceIcon({icon, name, size=27}:{icon?:string|null;name:string;size?:number}) {
  const props={size,'aria-hidden':true as const};
  switch(serviceIconFor(icon,name)) {
    case 'brush': return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 26 9-9m-6-5 9-9 10 10-9 9z"/><path d="m14 8 9 9M17 5l9 9m-16 1-3 3m6-2-3 3m6-2-3 3"/></svg>;
    case 'beard': return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 13V9a9 9 0 0 1 18 0v4m-18 0c-2 2-2 7 1 9 1 4 4 7 8 8 4-1 7-4 8-8 3-2 3-7 1-9"/><path d="M9 18c3 0 4-2 7 0 3-2 4 0 7 0m-11 5c2 1 6 1 8 0m-7-11h.1m6 0h.1"/></svg>;
    case 'color': return <Palette {...props}/>;
    case 'womens_cut': return <Scissors {...props}/>;
    case 'progressiva': case 'straightening': return <Waves {...props}/>;
    case 'highlights': return <Sparkles {...props}/>;
    case 'botox': return <Droplets {...props}/>;
    case 'henna': case 'micropigmentation': return <Eye {...props}/>;
    case 'eyebrow': return <Eye {...props}/>;
    case 'waves': return <Waves {...props}/>;
    case 'care': return <Droplets {...props}/>;
    case 'sparkles': return <Sparkles {...props}/>;
    default: return <Scissors {...props}/>;
  }
}
