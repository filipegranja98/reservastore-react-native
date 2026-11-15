import type { Order } from "./types";
export function preparationStarted(order: Pick<Order,"status" | "eventos">): number | null {
  if (order.status !== "preparando") return null;
  const times=(order.eventos ?? []).filter(event=>event.tipo === "status" && event.novo === "preparando").map(event=>Date.parse(event.criado_em)).filter(Number.isFinite);
  return times.length ? Math.max(...times) : null;
}
export function elapsedTime(start: number | null, now: number): string {
  if(start === null || !Number.isFinite(start) || !Number.isFinite(now)) return "Tempo não informado";
  const minutes=Math.floor(Math.max(0,now-start)/60000);
  if(minutes === 0) return "menos de 1 min";
  if(minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes/60)} h ${minutes%60} min`;
}
export function merchantNext(order: Pick<Order,"status" | "modalidade">) {
  const pickup=order.modalidade === "retirada";
  return ({recebido:{status:"aceito",label:"Aceitar pedido"},aceito:{status:"preparando",label:"Iniciar preparo"},preparando:pickup?{status:"pronto_retirada",label:"Pronto para retirada"}:{status:"saiu_entrega",label:"Saiu para entrega"},pronto_retirada:{status:"entregue",label:"Confirmar retirada"},saiu_entrega:{status:"entregue",label:"Confirmar entrega"}} as Record<string,{status:string;label:string}>)[order.status];
}
