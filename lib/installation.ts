import config from '@/config/installation.json';
import type {PlanId} from './plans';
export type Installation={installationId:string;templateVersion:number;defaultPlan:PlanId;adminEmails:string[];platformAdminEmails:string[];legacyServiceCatalog:boolean;cookieNamespace:string;legacyPixMigration:{key:string;name:string;replacement:{key:string;name:string;city:string}}|null};
export default config as Installation;
