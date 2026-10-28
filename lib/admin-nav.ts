export const adminItems=[
 {slug:'agendar',label:'Agendar cliente'},
 {slug:'dashboard',label:'Dashboard'},
 {slug:'agenda',label:'Agenda'},
 {slug:'chat',label:'Chat'},
 {slug:'servicos',label:'Serviços'},
 {slug:'portfolio',label:'Portfólio'},
 {slug:'financeiro',label:'Financeiro'},
 {slug:'configuracoes',label:'Configurações'},
 {slug:'perfil',label:'Meu perfil'},
 {slug:'usuarios',label:'Administradores'},
 {slug:'loja',label:'Loja e produtos'},
 {slug:'estoque',label:'Estoque'},
] as const;
export const adminSections=new Set<string>(adminItems.map(item=>item.slug));
export const sectionTitle=(slug:string)=>adminItems.find(item=>item.slug===slug)?.label||'Agendar cliente';
