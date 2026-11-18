export interface Promotion {
 id:number;loja:number;titulo:string;descricao:string;imagem:string|null;validade:string;ativa:boolean;
 produto:number|null;produto_nome:string;preco_anterior:string|null;preco_promocional:string|null;
}
export function promotionDate(value:string):string {
 const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
 if(!match)throw Error('Escolha a data de validade da promoção.');
 const [,day,month,year]=match;const date=new Date(`${year}-${month}-${day}T12:00:00Z`);
 if(!Number.isFinite(date.getTime())||date.getUTCDate()!==Number(day)||date.getUTCMonth()+1!==Number(month))throw Error('Escolha uma data de validade válida.');
 return `${year}-${month}-${day}`;
}
export function promotionExpiry(value:string):string {return value.split('-').reverse().join('/');}
