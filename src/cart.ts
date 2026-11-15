import { ApiError, type ApiClient } from "./api";
import type { Cart } from "./types";
type Client = Pick<ApiClient, "request">;
export class CartApi {
  constructor(
    private client: Client,
    private assertCurrent: () => void = () => {},
  ) {}
  async get(shop: number): Promise<Cart> {
    this.assertCurrent();
    const cart = await this.client.request<Cart>(`carrinhos/${shop}/`);
    this.assertCurrent();
    if (cart.loja !== shop)
      throw new ApiError(0, "O carrinho retornado não pertence a esta loja.");
    return cart;
  }
  async add(shop: number, product: number): Promise<Cart> {
    const current = await this.get(shop);
    const quantity =
      (current.itens.find((item) => item.produto === product)?.quantidade ??
        0) + 1;
    if (quantity > 99)
      throw new ApiError(400, "O limite é de 99 unidades por produto.");
    this.assertCurrent();
    await this.client.request<Cart>(`carrinhos/${shop}/itens/`, "POST", {
      produto: product,
      quantidade: quantity,
    });
    return this.get(shop);
  }
  async adjust(shop: number, itemId: number, delta: -1 | 1): Promise<Cart> {
    const current = await this.get(shop);
    const item = current.itens.find((value) => value.id === itemId);
    if (!item)
      throw new ApiError(
        404,
        "Este item não está mais no carrinho. Atualize a lista.",
      );
    const quantity = item.quantidade + delta;
    if (quantity < 1 || quantity > 99)
      throw new ApiError(
        400,
        "A quantidade deve ficar entre 1 e 99. Para retirar o produto, toque em Remover.",
      );
    this.assertCurrent();
    await this.client.request<Cart>(
      `carrinhos/${shop}/itens/${itemId}/`,
      "PATCH",
      { quantidade: quantity },
    );
    return this.get(shop);
  }
  async remove(shop: number, item: number): Promise<Cart> {
    this.assertCurrent();
    await this.client.request(`carrinhos/${shop}/itens/${item}/`, "DELETE");
    return this.get(shop);
  }
}

export const cartQuantity = (cart: Cart | null): number =>
  cart?.itens.reduce((sum, item) => sum + item.quantidade, 0) ?? 0;
