import { ApiError, type ApiClient } from "./api";
import type {
  Address,
  AddressInput,
  CheckoutPayload,
  CheckoutPreview,
  DeliveryArea,
  Order,
} from "./types";
export const availablePayments = ["pix", "dinheiro", "credito", "debito"] as const;
export const paymentLabels: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  cartao_na_entrega: "Cartão na entrega",
  transferencia: "Transferência",
};
export const normalizeCondo = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replace(/\s+/g, " ");
export const matchingAreas = (
  address: Address | undefined,
  areas: DeliveryArea[],
) =>
  address
    ? areas.filter(
        (area) =>
          normalizeCondo(area.condominio) ===
          normalizeCondo(address.condominio),
      )
    : [];
export function parseCashAmount(value: string): string {
  const text=value.trim().replace(",", ".");
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(text)) throw new ApiError(400,"Informe um valor válido para troco, por exemplo 100,00, sem separador de milhar.");
  const [whole,cents=""]=text.split(".");
  return `${Number(whole)}.${cents.padEnd(2,"0")}`;
}
export function checkoutPayload(value: CheckoutPayload): CheckoutPayload {
  if (
    ![value.loja, ...(value.modalidade === "retirada" ? [] : [value.endereco, value.area_entrega])].every(
      (id) => typeof id === "number" && Number.isInteger(id) && id > 0,
    )
  )
    throw new ApiError(
      400,
      "Selecione um endereço e uma área de entrega antes de revisar o pedido.",
    );
  if (value.modalidade !== undefined && !["entrega", "retirada"].includes(value.modalidade)) throw new ApiError(400, "Escolha entrega ou retirada.");
  if (!(availablePayments as readonly string[]).includes(value.meio_pagamento))
    throw new ApiError(400, "Selecione o meio de pagamento aceito pela loja.");
  if (value.observacoes.length > 1000)
    throw new ApiError(400, "Use até 1000 caracteres nas observações.");
  if (value.meio_pagamento !== "dinheiro" && (value.precisa_troco || value.troco_para != null)) throw new ApiError(400,"Troco é permitido somente para dinheiro.");
  if (value.precisa_troco && !value.troco_para) throw new ApiError(400,"Informe para qual valor precisa de troco.");
  if (!value.precisa_troco && value.troco_para != null) throw new ApiError(400,"Confirme se precisa de troco.");
  return {
    ...(value.meio_pagamento === "dinheiro" && value.precisa_troco !== undefined ? {precisa_troco:value.precisa_troco,troco_para:value.precisa_troco ? parseCashAmount(value.troco_para!) : null} : {}),
    loja: value.loja,
    ...(value.modalidade === "retirada" ? {modalidade: "retirada" as const} : {endereco:value.endereco, area_entrega:value.area_entrega, ...(value.modalidade ? {modalidade:value.modalidade} : {})}),
    meio_pagamento: value.meio_pagamento,
    observacoes: value.observacoes,
  };
}
export interface PendingCheckout {
  key: string;
  payload: CheckoutPayload;
}
export interface CheckoutVault {
  read(): Promise<PendingCheckout | null>;
  write(value: PendingCheckout | null): Promise<void>;
}
const running = new Map<string, { body: string; task: Promise<Order> }>();
export class CheckoutFlow {
  constructor(
    private client: Pick<ApiClient, "request">,
    private vault: CheckoutVault,
    private keyFactory: () => string,
    private scope: string,
    private assertCurrent: () => void = () => {},
  ) {}
  async pending() {
    this.assertCurrent();
    const value = await this.vault.read();
    this.assertCurrent();
    return value;
  }
  async address(data: AddressInput, id?: number) {
    if (id !== undefined && (!Number.isSafeInteger(id) || id < 1)) throw new ApiError(400, "Endereço inválido.");
    this.assertCurrent();
    const result = await this.client.request<Address>(
      id === undefined ? "enderecos/" : `enderecos/${id}/`,
      id === undefined ? "POST" : "PATCH",
      {condominio:data.condominio,bloco:data.bloco,apartamento:data.apartamento,destinatario:data.destinatario,telefone:data.telefone,complemento:data.complemento},
    );
    this.assertCurrent();
    if (id !== undefined && result.id !== id) throw new ApiError(0, "O endereço retornado não corresponde à edição.");
    return result;
  }
  async preview(value: CheckoutPayload) {
    const payload = checkoutPayload(value);
    this.assertCurrent();
    const result = await this.client.request<CheckoutPreview>(
      "pedidos/previa/",
      "POST",
      payload,
    );
    this.assertCurrent();
    if (
      result.loja !== payload.loja ||
      (result.modalidade ?? "entrega") !== (payload.modalidade ?? "entrega") ||
      (result.endereco?.id ?? undefined) !== payload.endereco ||
      (result.area_entrega ?? undefined) !== payload.area_entrega ||
      (result.precisa_troco ?? false) !== (payload.precisa_troco ?? false) ||
      (result.troco_para ?? null) !== (payload.troco_para ?? null) ||
      result.meio_pagamento !== payload.meio_pagamento
    )
      throw new ApiError(
        0,
        "A revisão retornada não corresponde à sua seleção. Revise novamente.",
      );
    return result;
  }
  confirm(value: CheckoutPayload): Promise<Order> {
    const payload = checkoutPayload(value);
    const body = JSON.stringify(payload);
    const existing = running.get(this.scope);
    if (existing)
      return existing.body === body
        ? existing.task
        : Promise.reject(
            new ApiError(0, "Há um envio em andamento. Aguarde a confirmação."),
          );
    const task = this.send(payload).finally(() => {
      if (running.get(this.scope)?.task === task) running.delete(this.scope);
    });
    running.set(this.scope, { body, task });
    return task;
  }
  private async send(payload: CheckoutPayload) {
    this.assertCurrent();
    let pending = await this.pending();
    if (pending && JSON.stringify(pending.payload) !== JSON.stringify(payload))
      throw new ApiError(
        0,
        "Existe uma tentativa anterior ainda não verificada. Verifique seu envio antes de alterar o pedido.",
      );
    if (!pending) {
      pending = { key: this.keyFactory(), payload };
      // Persist before POST: an app restart must reuse the same idempotency key.
      await this.vault.write(pending);
    }
    this.assertCurrent();
    let order: Order;
    try {
      order = await this.client.request<Order>("pedidos/", "POST", {
        ...pending.payload,
        chave_checkout: pending.key,
      });
    } catch (error) {
      // A definitive validation/not-found response did not create an order.
      // Network, 5xx and authentication failures retain the original attempt.
      if (error instanceof ApiError && [400, 404].includes(error.status)) {
        this.assertCurrent();
        await this.vault.write(null);
      }
      throw error;
    }
    this.assertCurrent();
    if (order.loja !== payload.loja || order.chave_checkout !== pending.key || (order.modalidade ?? "entrega") !== (payload.modalidade ?? "entrega"))
      throw new ApiError(
        0,
        "Não foi possível confirmar os dados do pedido. Verifique o envio novamente.",
      );
    try {
      await this.vault.write(null);
    } catch {
      /* Order is confirmed; a retained attempt can only replay this order. */
    }
    return order;
  }
}
