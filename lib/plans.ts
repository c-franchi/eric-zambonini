export const moduleLabels = {agenda:'Agenda e clientes',chat:'Conversas',portfolio:'Portfólio',financeiro:'Gestão financeira',loja:'Loja e vendas',estoque:'Estoque de produtos',insumos:'Insumos e custos por serviço'} as const;
export type ModuleId = keyof typeof moduleLabels;
export const planIds = ['agenda','gestao','premium'] as const;
export type PlanId = typeof planIds[number];
export const plans: Record<PlanId,{name:string;modules:readonly ModuleId[]}> = {
 agenda:{name:'Agenda',modules:['agenda','chat','portfolio']},
 gestao:{name:'Gestão e Vendas',modules:['agenda','chat','portfolio','financeiro','loja','estoque']},
 premium:{name:'Premium',modules:['agenda','chat','portfolio','financeiro','loja','estoque','insumos']},
};
export function isPlan(value:unknown):value is PlanId{return planIds.includes(value as PlanId)}
export const sectionModules:Record<string,ModuleId>={agendar:'agenda',dashboard:'agenda',agenda:'agenda',servicos:'agenda',chat:'chat',portfolio:'portfolio',financeiro:'financeiro',loja:'loja',estoque:'estoque',insumos:'insumos'};
export function canUse(plan:PlanId,module:ModuleId){return plans[plan].modules.includes(module)}
export function canOpenSection(plan:PlanId,section:string){return !sectionModules[section]||canUse(plan,sectionModules[section])}
export function apiModule(path:string):ModuleId|null{
 if(/^\/api\/admin\/supplies(?:\/|$)/.test(path))return 'insumos';
 if(/^\/api\/admin\/inventory(?:\/|$)/.test(path))return 'estoque';
 if(/^\/api\/admin\/finance(?:\/|$)/.test(path))return 'financeiro';
 if(/^\/api\/(?:admin\/store|store|products|cliente\/orders)(?:\/|$)/.test(path))return 'loja';
 if(/^\/api\/(?:admin\/chat|chat)(?:\/|$)/.test(path))return 'chat';
 if(/^\/api\/(?:admin\/portfolio|portfolio)(?:\/|$)/.test(path))return 'portfolio';
 return null;
}
