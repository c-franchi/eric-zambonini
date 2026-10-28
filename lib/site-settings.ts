import { env } from 'cloudflare:workers';
import { readBrand } from './brand';
export async function getBrand(){if(!env.DB)throw Error('Banco indisponível');return readBrand(env.DB)}
