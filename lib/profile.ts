import {defaultBrand} from './brand';
export type PublicProfile={name:string;bio:string;yearsExperience:number};
export const fallbackProfile:PublicProfile={name:defaultBrand.name,bio:defaultBrand.bio,yearsExperience:defaultBrand.yearsExperience};
