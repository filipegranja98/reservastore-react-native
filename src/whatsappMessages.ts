import type { Order } from "./types";
import { contactLinks } from "./contact";
import { paymentLabels } from "./checkout";

const price = (value: string) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function orderWhatsAppMessage(order: Order, merchant: boolean): string {
  if (merchant) {
    const update: Record<string, string> = {
      recebido: "recebemos seu pedido", aceito: "seu pedido foi aceito",
      preparando: "seu pedido está em preparo", saiu_entrega: "seu pedido saiu para entrega",
      pronto_retirada: "seu pedido está pronto para retirada na loja",
      entregue: order.modalidade === "retirada" ? "seu pedido foi retirado" : "seu pedido foi entregue",
      cancelado: "seu pedido foi cancelado",
    };
    return `Olá, ${order.endereco.destinatario || "cliente"}! Aqui é da ${order.loja_nome}. Sobre o pedido #${order.id} no Reserva Store: ${update[order.status] ?? "temos uma atualização sobre seu pedido"}.`;
  }
  const a = order.endereco;
  return [
    `Olá! Fiz o pedido #${order.id} no Reserva Store para ${order.loja_nome}.`,
    `Cliente: ${a.destinatario}`,
    `Contato: ${a.telefone}`,
    "", "Itens:", ...order.itens.map(item => `${item.quantidade} × ${item.nome} — ${price(item.total)}`),
    "", order.modalidade === "retirada" ? "Retirada na loja" : `Entrega: ${a.condominio} • Bloco ${a.bloco} • Apto ${a.apartamento}`,
    ...(order.modalidade !== "retirada" && a.complemento ? [`Referência: ${a.complemento}`] : []),
    `Taxa de entrega: ${price(order.taxa_entrega)}`, `Total: ${price(order.total)}`,
    `Forma de pagamento: ${paymentLabels[order.meio_pagamento] ?? order.meio_pagamento}`,
    ...(order.meio_pagamento === "dinheiro" ? [order.precisa_troco && order.troco_para ? `Troco para ${price(order.troco_para)}` : "Sem troco"] : []),
    ...(order.observacoes ? [`Observações: ${order.observacoes}`] : []),
  ].join("\n");
}
export function orderWhatsAppLink(phone: string | undefined, message: string) {
  const base = contactLinks(phone, undefined).whatsapp;
  return base ? `${base}?text=${encodeURIComponent(message)}` : null;
}
