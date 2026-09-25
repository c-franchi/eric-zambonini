import { Brush, Droplets, Eye, Paintbrush, Scissors, Sparkles, UserRound, Waves } from 'lucide-react';

export const iconChoices = [
  { id: 'scissors', label: 'Tesoura' },
  { id: 'brush', label: 'Escova' },
  { id: 'beard', label: 'Barba' },
  { id: 'color', label: 'Coloração' },
  { id: 'eyebrow', label: 'Sobrancelhas' },
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
    case 'brush': return <Brush {...props}/>;
    case 'beard': return <UserRound {...props}/>;
    case 'color': return <Paintbrush {...props}/>;
    case 'eyebrow': return <Eye {...props}/>;
    case 'waves': return <Waves {...props}/>;
    case 'care': return <Droplets {...props}/>;
    case 'sparkles': return <Sparkles {...props}/>;
    default: return <Scissors {...props}/>;
  }
}
