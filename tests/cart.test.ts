import assert from "node:assert/strict";
import { test } from "node:test";
import { CartApi } from "../src/cart";
import { ApiError } from "../src/api";
import type { ApiClient } from "../src/api";
import type { Cart } from "../src/types";
function client(
  handler: (
    path: string,
    method?: string,
    body?: unknown,
  ) => unknown | Promise<unknown>,
): Pick<ApiClient, "request"> {
  return {
    request: async <T>(path: string, method?: string, body?: unknown) =>
      (await handler(path, method, body)) as T,
  };
}
const cart: Cart = {
  loja: 7,
  itens: [
    {
      id: 12,
      produto: 3,
      nome: "Synthetic",
      preco_unitario: "2.00",
      quantidade: 2,
      total: "4.00",
    },
  ],
  subtotal: "4.00",
};
test("add reads current server quantity, writes only to selected shop and reloads server subtotal", async () => {
  const calls: string[] = [];
  let value = structuredClone(cart);
  const service = new CartApi(
    client((path, method, body) => {
      calls.push(`${method ?? "GET"} ${path}`);
      if (method === "POST") {
        assert.deepEqual(body, { produto: 3, quantidade: 3 });
        value.itens[0].quantidade = 3;
        value.subtotal = "6.00";
      }
      return structuredClone(value);
    }),
  );
  const result = await service.add(7, 3);
  assert.equal(result.subtotal, "6.00");
  assert.deepEqual(calls, [
    "GET carrinhos/7/",
    "POST carrinhos/7/itens/",
    "GET carrinhos/7/",
  ]);
});
test("quantity adjustment reads fresh quantity and uses item scoped to its shop", async () => {
  const service = new CartApi(
    client((path, method, body) => {
      if (method === "PATCH") {
        assert.equal(path, "carrinhos/7/itens/12/");
        assert.deepEqual(body, { quantidade: 1 });
      }
      return cart;
    }),
  );
  await service.adjust(7, 12, -1);
});
test("remove accepts empty 204 response then reads the selected cart", async () => {
  const calls: string[] = [];
  const service = new CartApi(
    client((path, method) => {
      calls.push(`${method ?? "GET"} ${path}`);
      return method === "DELETE"
        ? undefined
        : { loja: 7, itens: [], subtotal: "0.00" };
    }),
  );
  assert.equal((await service.remove(7, 12)).itens.length, 0);
  assert.deepEqual(calls, ["DELETE carrinhos/7/itens/12/", "GET carrinhos/7/"]);
});
test("limits and deleted items never submit an invalid mutation", async () => {
  let writes = 0;
  const service = new CartApi(
    client((_path, method) => {
      if (method) writes++;
      return { ...cart, itens: [{ ...cart.itens[0], quantidade: 99 }] };
    }),
  );
  await assert.rejects(service.add(7, 3), /99/);
  await assert.rejects(service.adjust(7, 999, 1), /mais no carrinho/);
  assert.equal(writes, 0);
  const minimum = new CartApi(
    client(() => ({ ...cart, itens: [{ ...cart.itens[0], quantidade: 1 }] })),
  );
  await assert.rejects(minimum.adjust(7, 12, -1), /Remover/);
});
test("session change after GET stops a write under a different account", async () => {
  let allowed = true;
  let writes = 0;
  const service = new CartApi(
    client((_path, method) => {
      if (method) writes++;
      allowed = false;
      return cart;
    }),
    () => {
      if (!allowed) throw Error("session changed");
    },
  );
  await assert.rejects(service.add(7, 3), /session changed/);
  assert.equal(writes, 0);
});
test("offline, unauthorized and mismatched-shop responses do not produce blind writes", async () => {
  let writes = 0;
  const broken = new CartApi(
    client((_path, method) => {
      if (method) writes++;
      throw new ApiError(0, "offline");
    }),
  );
  await assert.rejects(broken.add(7, 3), /offline/);
  assert.equal(writes, 0);
  const guest = new CartApi(
    client(() => {
      throw new ApiError(401, "Entre na sua conta");
    }),
  );
  await assert.rejects(guest.get(7), (e: ApiError) => e.status === 401);
  const wrong = new CartApi(client(() => ({ ...cart, loja: 8 })));
  await assert.rejects(wrong.get(7), /não pertence/);
});
