import { ApiError, type ApiClient } from "./api";
import type { Product, ProductCategory, Shop } from "./types";
export class MerchantCatalog {
  constructor(
    private client: Pick<ApiClient, "request">,
    private shop: number,
    private assertCurrent: () => void = () => {},
  ) {}
  async saveItem(
    fields: { nome: string; categoria: number; preco: string; ativo: boolean },
    id?: number,
    image?: { uri: string; type: string; name: string; file?: Blob } | null,
  ) {
    const nome = fields.nome.trim(),
      preco = catalogPrice(fields.preco);
    if (
      !nome ||
      nome.length > 255 ||
      !Number.isSafeInteger(fields.categoria) ||
      fields.categoria < 1 ||
      (id !== undefined && (!Number.isSafeInteger(id) || id < 1))
    )
      throw new ApiError(400, "Informe nome e categoria válidos.");
    let body: unknown = {
      nome,
      preco,
      categoria: fields.categoria,
      ativo: fields.ativo,
      ...(image === null ? { imagem: null } : {}),
    };
    if (image) {
      const form = new FormData();
      form.append("nome", nome);
      form.append("preco", preco);
      form.append("categoria", String(fields.categoria));
      form.append("ativo", String(fields.ativo));
      form.append(
        "imagem",
        image.file ??
          ({
            uri: image.uri,
            type: image.type,
            name: image.name,
          } as unknown as Blob),
        ...(image.file ? ([image.name] as [string]) : []),
      );
      body = form;
    }
    this.assertCurrent();
    const result = await this.client.request<Product>(
      id === undefined ? "produtos/" : `produtos/${id}/`,
      id === undefined ? "POST" : "PATCH",
      body,
    );
    this.assertCurrent();
    if (result.loja !== this.shop || (id !== undefined && result.id !== id))
      throw new ApiError(0, "O item retornado não corresponde à sua loja.");
    return result;
  }
  async createItem(name: string, category: number, price: string) {
    const nome = name.trim();
    const preco = catalogPrice(price);
    if (
      !nome ||
      nome.length > 255 ||
      !Number.isSafeInteger(category) ||
      category < 1
    )
      throw new ApiError(400, "Informe nome e categoria do item.");
    this.assertCurrent();
    const result = await this.client.request<Product & { loja: number }>(
      "produtos/",
      "POST",
      { nome, categoria: category, preco },
    );
    this.assertCurrent();
    if (result.loja !== this.shop)
      throw new ApiError(0, "O item retornado não pertence à sua loja.");
    return result;
  }
  async createCategory(name: string) {
    const nome = name.trim();
    if (!nome || nome.length > 100)
      throw new ApiError(
        400,
        "Informe um nome de categoria com até 100 caracteres.",
      );
    this.assertCurrent();
    const category = await this.client.request<ProductCategory>(
      "categorias/",
      "POST",
      { nome },
    );
    this.assertCurrent();
    if (category.loja !== this.shop)
      throw new ApiError(0, "A categoria retornada não pertence à sua loja.");
    return category;
  }
  async assignCategory(product: number, category: number) {
    this.assertCurrent();
    const result = await this.client.request<Product & { loja: number }>(
      `produtos/${product}/`,
      "PATCH",
      { categoria: category },
    );
    this.assertCurrent();
    if (result.loja !== this.shop)
      throw new ApiError(0, "O produto retornado não pertence à sua loja.");
    return result;
  }
  async setPayments(methods: string[]) {
    this.assertCurrent();
    const result = await this.client.request<Shop>(
      `lojas/${this.shop}/`,
      "PATCH",
      { meios_pagamento: methods },
    );
    this.assertCurrent();
    if (result.id !== this.shop)
      throw new ApiError(0, "A loja retornada não corresponde à sua conta.");
    return result;
  }
  async setFulfillment(
    field: "permite_entrega" | "permite_retirada",
    enabled: boolean,
  ) {
    this.assertCurrent();
    const result = await this.client.request<Shop>(
      `lojas/${this.shop}/`,
      "PATCH",
      { [field]: enabled },
    );
    this.assertCurrent();
    if (result.id !== this.shop || result[field] !== enabled)
      throw new ApiError(
        0,
        "Não foi possível confirmar as modalidades da loja. Atualize o painel.",
      );
    return result;
  }
  async setOpen(aberta: boolean) {
    this.assertCurrent();
    const result = await this.client.request<Shop>(
      `lojas/${this.shop}/`,
      "PATCH",
      { aberta },
    );
    this.assertCurrent();
    if (result.id !== this.shop || result.aberta !== aberta)
      throw new ApiError(
        0,
        "Não foi possível confirmar o estado da sua loja. Atualize o painel.",
      );
    return result;
  }
  async setContact(phone: string) {
    const whatsapp = phone.trim();
    if (/[^\d\s+().-]/.test(whatsapp) || !/^\d{10,15}$/.test(whatsapp.replace(/\D/g, "")))
      throw new ApiError(400, "Informe um telefone válido com DDD (10 a 15 dígitos).");
    return this.updateProfile({ whatsapp });
  }
  async setCatalogMode(tipo_catalogo: "produtos" | "servicos") {
    return this.updateProfile({ tipo_catalogo });
  }
  private async updateProfile(fields: { whatsapp?: string; tipo_catalogo?: "produtos" | "servicos" }) {
    this.assertCurrent();
    const shop = await this.client.request<Shop>(`lojas/${this.shop}/`, "PATCH", fields);
    this.assertCurrent();
    if (shop.id !== this.shop) throw new ApiError(0, "A loja retornada não corresponde à sua conta.");
    return shop;
  }
  async setStoreType(type: number | null) {
    this.assertCurrent();
    const result = await this.client.request<Shop>(
      `lojas/${this.shop}/`,
      "PATCH",
      { tipo_loja: type },
    );
    this.assertCurrent();
    if (result.id !== this.shop)
      throw new ApiError(0, "A loja retornada não corresponde à sua conta.");
    return result;
  }
}

export function catalogPrice(value: string): string {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(normalized))
    throw new ApiError(
      400,
      "Informe um preço válido, por exemplo 150,00, sem separador de milhar.",
    );
  const [whole, decimals = ""] = normalized.split(".");
  return `${Number(whole)}.${decimals.padEnd(2, "0")}`;
}
