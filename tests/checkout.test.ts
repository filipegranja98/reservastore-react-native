import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CheckoutFlow,
  checkoutPayload,
  matchingAreas,
  type CheckoutVault,
  type PendingCheckout,
} from "../src/checkout";
import { ApiError, type ApiClient } from "../src/api";
import { cartQuantity } from "../src/cart";
import type { CheckoutPayload, Order, Address, Cart } from "../src/types";
const payload: CheckoutPayload = {
  loja: 1,
  endereco: 2,
  area_entrega: 3,
  meio_pagamento: "pix",
  observacoes: "",
};
let sequence = 0;
function vault() {
  let value: PendingCheckout | null = null;
  return {
    read: async () => value,
    write: async (v: PendingCheckout | null) => {
      value = v;
    },
    value: () => value,
  };
}
function client(
  handler: (
    path: string,
    method?: string,
    body?: any,
  ) => unknown | Promise<unknown>,
): Pick<ApiClient, "request"> {
  return {
    request: async <T>(path: string, method?: string, body?: unknown) =>
      (await handler(path, method, body)) as T,
  };
}
function order(body: any): Order {
  return {
    id: 10,
    loja: body.loja,
    chave_checkout: body.chave_checkout,
  } as Order;
}
function flow(
  c: Pick<ApiClient, "request">,
  v: CheckoutVault,
  key = () => "00000000-0000-4000-8000-000000000001",
) {
  return new CheckoutFlow(c, v, key, `test-${++sequence}`);
}
test("address and delivery are required and money fields are never forwarded", () => {
  assert.throws(() => checkoutPayload({ ...payload, endereco: 0 }), /endereço/);
  assert.throws(
    () => checkoutPayload({ ...payload, area_entrega: 0 }),
    /endereço/,
  );
  assert.deepEqual(
    checkoutPayload({ ...payload, ...{ total: "0.01", cliente: 999 } }),
    payload,
  );
});
test("delivery matches normalized condominium but not another address", () => {
  const a = { condominio: "  Reserva   TESTE " } as Address;
  const areas = [
    {
      id: 1,
      condominio: "reserva teste",
      taxa: "2.00",
      prazo_estimado_minutos: null,
    },
    { id: 2, condominio: "Outro", taxa: "0.00", prazo_estimado_minutos: null },
  ];
  assert.deepEqual(matchingAreas(a, areas), [areas[0]]);
  assert.deepEqual(matchingAreas(undefined, areas), []);
});
test("preview only calls preview and checks returned address/shop", async () => {
  let seen: any;
  const f = flow(
    client((path, _m, body) => {
      seen = { path, body };
      return { ...body, endereco: { id: body.endereco } };
    }),
    vault(),
  );
  await f.preview(payload);
  assert.equal(seen.path, "pedidos/previa/");
  assert.deepEqual(seen.body, payload);
  const wrong = flow(
    client(() => ({ ...payload, endereco: { id: 999 } })),
    vault(),
  );
  await assert.rejects(wrong.preview(payload), /não corresponde/);
});
test("double confirmation shares one POST and persists key before sending", async () => {
  const v = vault();
  let posts = 0;
  let keys = 0;
  const f = flow(
    client(async (_p, _m, body) => {
      posts++;
      assert.equal(v.value()?.key, body.chave_checkout);
      await new Promise((r) => setTimeout(r, 5));
      return order(body);
    }),
    v,
    () => {
      keys++;
      return "key-a";
    },
  );
  const [a, b] = await Promise.all([f.confirm(payload), f.confirm(payload)]);
  assert.equal(a.id, b.id);
  assert.equal(posts, 1);
  assert.equal(keys, 1);
  assert.equal(v.value(), null);
});
test("lost response survives a new flow and reuses the original key", async () => {
  const v = vault();
  const keys: string[] = [];
  let lost = true;
  const c = client((_p, _m, body) => {
    keys.push(body.chave_checkout);
    if (lost) {
      lost = false;
      throw new ApiError(0, "network");
    }
    return order(body);
  });
  await assert.rejects(flow(c, v, () => "original").confirm(payload));
  assert.equal(v.value()?.key, "original");
  const result = await flow(c, v, () => {
    throw Error("Must not generate another key");
  }).confirm(payload);
  assert.equal(result.id, 10);
  assert.deepEqual(keys, ["original", "original"]);
  assert.equal(v.value(), null);
});
test("unverified attempt cannot silently change address", async () => {
  const v = vault();
  await v.write({ key: "old", payload });
  let posts = 0;
  const f = flow(
    client(() => {
      posts++;
    }),
    v,
  );
  await assert.rejects(
    f.confirm({ ...payload, endereco: 9 }),
    /tentativa anterior/,
  );
  assert.equal(posts, 0);
});
test("storage failure blocks POST; validation clears attempt; network failure keeps it", async () => {
  let posts = 0;
  await assert.rejects(
    flow(
      client(() => {
        posts++;
      }),
      {
        read: async () => null,
        write: async () => {
          throw Error("storage");
        },
      },
    ).confirm(payload),
  );
  assert.equal(posts, 0);
  for (const status of [400, 404, 0, 500, 401]) {
    const v = vault();
    await assert.rejects(
      flow(
        client(() => {
          throw new ApiError(status, "failure");
        }),
        v,
      ).confirm(payload),
    );
    assert.equal(!!v.value(), ![400, 404].includes(status));
  }
});
test("confirmed order is preserved if clearing saved attempt fails", async () => {
  const v = vault();
  const broken = {
    read: v.read,
    write: async (value: PendingCheckout | null) => {
      if (!value) throw Error("storage");
      await v.write(value);
    },
  };
  const result = await flow(
    client((_p, _m, body) => order(body)),
    broken,
  ).confirm(payload);
  assert.equal(result.id, 10);
  assert.ok(v.value());
});
test("session change before POST prevents sending under another account", async () => {
  let active = true;
  let posts = 0;
  const v = vault();
  const f = new CheckoutFlow(
    client(() => {
      posts++;
    }),
    {
      read: v.read,
      write: async (value) => {
        await v.write(value);
        active = false;
      },
    },
    () => "key",
    `guard-${++sequence}`,
    () => {
      if (!active) throw Error("session changed");
    },
  );
  await assert.rejects(f.confirm(payload), /session changed/);
  assert.equal(posts, 0);
});
test("floating cart counter sums quantities of only the supplied cart", () => {
  const a = { loja: 1, itens: [{ quantidade: 2 }, { quantidade: 3 }] } as Cart;
  const b = { loja: 2, itens: [{ quantidade: 9 }] } as Cart;
  assert.equal(cartQuantity(a), 5);
  assert.equal(cartQuantity(b), 9);
  assert.equal(cartQuantity(null), 0);
  assert.equal(cartQuantity({ ...a, itens: [] }), 0);
});

test("pickup payload omits delivery identifiers while preserving the fulfillment mode", () => {
  assert.deepEqual(checkoutPayload({...payload,modalidade:"retirada"}),{loja:1,modalidade:"retirada",meio_pagamento:"pix",observacoes:""});
  assert.throws(() => checkoutPayload({...payload,endereco:undefined,area_entrega:undefined}));
});
