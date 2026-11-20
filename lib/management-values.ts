export function quantityMilli(value:unknown):number|null {
 if(typeof value!=='string'||!/^\d{1,8}([.,]\d{1,3})?$/.test(value.trim()))return null;
 const n=Math.round(Number(value.replace(',','.'))*1000);return Number.isSafeInteger(n)&&n>0&&n<=1000000000?n:null;
}
export function moneyCents(value:unknown):number|null {
 if(typeof value!=='string'||!/^\d{1,8}([.,]\d{1,2})?$/.test(value.trim()))return null;
 const n=Math.round(Number(value.replace(',','.'))*100);return Number.isSafeInteger(n)&&n>=0&&n<=1000000000?n:null;
}
export const validId=(v:unknown):v is string=>typeof v==='string'&&/^[\w:-]{1,100}$/.test(v);
export const shortText=(v:unknown,max=300):v is string=>typeof v==='string'&&v.trim().length>=3&&v.trim().length<=max;
export const validDay=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
