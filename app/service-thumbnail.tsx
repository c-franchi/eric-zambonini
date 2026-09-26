import { ServiceIcon, serviceIconFor } from '@/lib/service-icons';

export default function ServiceThumbnail({icon,name}:{icon?:string|null;name:string}) {
  const kind=serviceIconFor(icon,name);
  const illustrated=kind==='scissors'||kind==='brush';
  return <span className="service-thumbnail" aria-hidden="true">{illustrated?<img src={`/images/services/${kind}.webp`} alt="" width="80" height="80" loading="lazy"/>:<ServiceIcon icon={icon} name={name}/>}</span>;
}
