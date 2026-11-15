import {readFileSync} from "node:fs";
import { MerchantCatalog } from "../src/merchant";
import { shopTheme } from "../src/theme";
import { CheckoutFlow, type PendingCheckout } from "../src/checkout";
import { CartApi } from "../src/cart";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ApiClient, ApiError } from "../src/api";
import type {
  Account,
  DeliveryArea,
  Page,
  Product,
  Shop,
  Tokens,
} from "../src/types";
async function main() {
  const base = process.argv[2];
  assert.match(base, /^http:\/\/127\.0\.0\.1:\d+\/api\/$/);
  let saved: Tokens | null = null;
  const vault = {
    read: async () => saved,
    write: async (value: Tokens | null) => {
      saved = value;
    },
  };
  const client = new ApiClient(base, vault);
  const username = `synthetic-${randomUUID().slice(0, 8)}`;
  const password = randomUUID();
  await client.register({
    username,
    password,
    first_name: "Synthetic client",
    email: "synthetic@example.test",
    telefone: "00000000",
  });
  await client.login(username, password);
  const account = await client.request<Account>("conta/");
  assert.equal(account.papel, "cliente");
  assert.equal(account.username, username);
  const first = await client.publicRequest<Page<Shop>>(
    "catalogo/lojas/?page=1&page_size=1",
  );
  assert.equal(first.count, 2);
  assert.equal(first.results.length, 1);
  assert.ok(first.next);
  const second = await client.publicRequest<Page<Shop>>(
    "catalogo/lojas/?page=2&page_size=1",
  );
  assert.notEqual(first.results[0].id, second.results[0].id);
  assert.equal(second.next, null);
  const shop = await client.publicRequest<Shop>(
    `catalogo/lojas/${first.results[0].id}/`,
  );
  assert.equal(shop.nome, first.results[0].nome);
  assert.equal(shop.cor_primaria, "#243B7A");
  assert.equal(shopTheme(shop).primary, "#243B7A");
  assert.equal(shopTheme(second.results[0]).primary, "#880022");
  const products = await client.publicRequest<Page<Product>>(
    `catalogo/lojas/${shop.id}/produtos/?page=1&page_size=20`,
  );
  assert.equal(products.results[0].preco, "12.50");
  const areas = await client.publicRequest<Page<DeliveryArea>>(
    `catalogo/lojas/${shop.id}/areas-entrega/?page=1&page_size=20`,
  );
  assert.equal(areas.results[0].prazo_estimado_minutos, null);
  assert.equal(areas.results[0].taxa, "2.00");
  const carts = new CartApi(client);
  assert.equal((await carts.get(shop.id)).itens.length, 0);
  await carts.add(shop.id, products.results[0].id);
  let current = await carts.add(shop.id, products.results[0].id);
  assert.equal(current.itens[0].quantidade, 2);
  assert.equal(current.subtotal, "25.00");
  const otherShop = second.results[0];
  const otherProducts = await client.publicRequest<Page<Product>>(
    `catalogo/lojas/${otherShop.id}/produtos/?page=1&page_size=20`,
  );
  const otherCart = await carts.add(otherShop.id, otherProducts.results[0].id);
  assert.equal(otherCart.itens.length, 1);
  assert.equal((await carts.get(shop.id)).itens[0].quantidade, 2);
  current = await carts.adjust(shop.id, current.itens[0].id, 1);
  assert.equal(current.itens[0].quantidade, 3);
  current = await carts.adjust(shop.id, current.itens[0].id, -1);
  assert.equal(current.itens[0].quantidade, 2);
  // Another customer has independent carts and cannot remove the first customer's item.
  const secondClient = new ApiClient(base, {
    read: async () => null,
    write: async () => {},
  });
  const secondUsername = `synthetic-${randomUUID().slice(0, 8)}`;
  await secondClient.register({
    username: secondUsername,
    password,
    first_name: "Synthetic other",
    email: "other@example.test",
    telefone: "00000000",
  });
  await secondClient.login(secondUsername, password);
  const secondCarts = new CartApi(secondClient);
  assert.equal((await secondCarts.get(shop.id)).itens.length, 0);
  await assert.rejects(
    secondCarts.remove(shop.id, current.itens[0].id),
    (error: ApiError) => error.status === 404,
  );
  await secondCarts.add(shop.id, products.results[0].id);
  assert.equal((await carts.get(shop.id)).itens[0].quantidade, 2);
  await assert.rejects(
    client.request(`carrinhos/${shop.id}/itens/`, "POST", {
      produto: otherProducts.results[0].id,
      quantidade: 1,
    }),
    (error: ApiError) => error.status === 404,
  );
  assert.equal((await carts.get(shop.id)).itens.length, 1);
  await assert.rejects(
    client.request(
      `carrinhos/${shop.id}/itens/${current.itens[0].id}/`,
      "PATCH",
      { quantidade: 100 },
    ),
    (error: ApiError) => error.status === 400,
  );
  await carts.remove(shop.id, current.itens[0].id);
  assert.equal((await carts.get(shop.id)).itens.length, 0);
  assert.equal((await carts.get(otherShop.id)).itens[0].quantidade, 1);
  assert.equal((await secondCarts.get(shop.id)).itens[0].quantidade, 1);
  // Mandatory address, real preview, idempotent checkout and isolated order history.
  let attempt: PendingCheckout | null = null;
  const checkout = new CheckoutFlow(
    client,
    {
      read: async () => attempt,
      write: async (value) => {
        attempt = value;
      },
    },
    () => randomUUID(),
    `customer-${account.id}-${shop.id}`,
  );
  const address = await checkout.address({
    condominio: "Synthetic condo",
    bloco: "A",
    apartamento: "101",
    destinatario: "Synthetic",
    telefone: "00000000",
    complemento: "Test only",
  });
  const otherAddress = await new CheckoutFlow(
    secondClient,
    { read: async () => null, write: async () => {} },
    () => randomUUID(),
    "other",
  ).address({
    condominio: "Synthetic condo",
    bloco: "B",
    apartamento: "202",
    destinatario: "Other",
    telefone: "00000000",
    complemento: "",
  });
  await carts.add(shop.id, products.results[0].id);
  const checkoutBody = {
    loja: shop.id,
    endereco: address.id,
    area_entrega: areas.results[0].id,
    meio_pagamento: "pix",
    observacoes: "Synthetic test",
  };
  await assert.rejects(checkout.preview({ ...checkoutBody, endereco: 0 }));
  await assert.rejects(
    checkout.preview({ ...checkoutBody, endereco: otherAddress.id }),
    (e: ApiError) => e.status === 404,
  );
  const outside = await checkout.address({
    condominio: "Outside delivery",
    bloco: "Z",
    apartamento: "303",
    destinatario: "Synthetic",
    telefone: "00000000",
    complemento: "",
  });
  await assert.rejects(
    checkout.preview({ ...checkoutBody, endereco: outside.id }),
    (e: ApiError) => e.status === 400,
  );
  await assert.rejects(
    checkout.preview({ ...checkoutBody, meio_pagamento: "cartao_na_entrega" }),
    (e: ApiError) => e.status === 400,
  );
  const preview = await checkout.preview(checkoutBody);
  assert.equal(preview.total, "14.50");
  assert.equal(preview.taxa_entrega, "2.00");
  assert.equal(preview.prazo_estimado_minutos, null);
  assert.equal((await carts.get(shop.id)).itens.length, 1);
  assert.equal(
    (await client.request<Page<any>>("pedidos/?page=1&page_size=20")).count,
    0,
  );
  const [placed, repeated] = await Promise.all([
    checkout.confirm(checkoutBody),
    checkout.confirm(checkoutBody),
  ]);
  assert.equal(placed.id, repeated.id);
  assert.equal(placed.total, preview.total);
  assert.equal(placed.endereco.apartamento, "101");
  assert.equal(attempt, null);
  assert.equal((await carts.get(shop.id)).itens.length, 0);
  assert.equal((await carts.get(otherShop.id)).itens[0].quantidade, 1);
  assert.equal((await secondCarts.get(shop.id)).itens[0].quantidade, 1);
  assert.equal(
    (await client.request<Page<any>>("pedidos/?page=1&page_size=20")).count,
    1,
  );
  await assert.rejects(
    secondClient.request(`pedidos/${placed.id}/`),
    (e: ApiError) => e.status === 404,
  );
  await carts.add(shop.id, products.results[0].id);
  const replay = await client.request<any>("pedidos/", "POST", {
    ...checkoutBody,
    chave_checkout: placed.chave_checkout,
  });
  assert.equal(replay.id, placed.id);
  assert.equal((await carts.get(shop.id)).itens[0].quantidade, 1);
  const editedAddress = await checkout.address({...address, apartamento:"999"}, address.id);
  assert.equal(editedAddress.id, address.id);
  assert.equal(editedAddress.apartamento, "999");
  const snapshot = await client.request<any>(`pedidos/${placed.id}/`);
  assert.equal(snapshot.endereco.apartamento, "101");
  await secondClient.logout();
  const merchant = new ApiClient(base, {
    read: async () => null,
    write: async () => {},
  });
  await merchant.login(
    "synthetic-owner-0",
    process.env.SYNTHETIC_MERCHANT_PASSWORD!,
  );
  assert.equal((await merchant.request<Account>("conta/")).papel, "lojista");
  const own = await merchant.request<Shop>("lojas/minha_loja/");
  assert.equal(own.id, shop.id);
  const catalog = new MerchantCatalog(merchant, own.id);
  const category = await catalog.createCategory("Synthetic merchant category");
  assert.equal(category.loja, own.id);
  await catalog.assignCategory(products.results[0].id, category.id);
  const photoFile=new Blob([Uint8Array.from(readFileSync(new URL("./fixtures/product.png",import.meta.url)))],{type:"image/png"});
  const editedProduct=await catalog.saveItem({nome:"Synthetic product edited",categoria:category.id,preco:"12.50",ativo:true},products.results[0].id,{uri:"unused-in-web",type:"image/png",name:"product.png",file:photoFile});
  assert.ok(editedProduct.imagem?.includes("produtos/"));
  assert.equal(editedProduct.nome,"Synthetic product edited");
  const removedPhoto=await catalog.saveItem({nome:editedProduct.nome,categoria:category.id,preco:"12.50",ativo:true},editedProduct.id,null);
  assert.equal(removedPhoto.imagem,null);

  await assert.rejects(
    merchant.request(`categorias/${category.id}/`, "PATCH", {
      loja: otherShop.id,
    }),
    (e: ApiError) => e.status === 400,
  );
  await assert.rejects(
    merchant.request(`produtos/${otherProducts.results[0].id}/`, "PATCH", {
      categoria: category.id,
    }),
    (e: ApiError) => e.status === 404,
  );
  const filtered = await client.publicRequest<Page<Product>>(
    `catalogo/lojas/${shop.id}/produtos/?categoria=${category.id}&page=1&page_size=20`,
  );
  assert.equal(filtered.count, 1);
  assert.equal(filtered.results[0].categoria, category.id);
  const kinds = await client.publicRequest<Page<any>>(
    "catalogo/tipos-loja/?page=1&page_size=20",
  );
  assert.equal(kinds.count, 1);
  const storeFilter = await client.publicRequest<Page<Shop>>(
    `catalogo/lojas/?tipo_loja=${kinds.results[0].id}&page=1&page_size=20`,
  );
  assert.equal(storeFilter.count, 1);
  assert.equal(storeFilter.results[0].id, shop.id);
  const incoming = await merchant.request<Page<any>>("lojista/pedidos/?page=1&page_size=20");
  assert.ok(incoming.results.some(order => order.id === placed.id));
  const merchantDetail = await merchant.request<any>(`lojista/pedidos/${placed.id}/`);
  assert.deepEqual(merchantDetail.itens, snapshot.itens);
  assert.equal(merchantDetail.endereco.apartamento, "101");
  const accepted = await merchant.request<any>(`lojista/pedidos/${placed.id}/transicao/`, "POST", {status: "aceito"});
  assert.equal(accepted.status, "aceito");
  assert.equal((await client.request<any>(`pedidos/${placed.id}/`)).status, "aceito");
  const otherMerchant = new ApiClient(base, {read:async () => null,write:async () => {}});
  await otherMerchant.login("synthetic-owner-1", process.env.SYNTHETIC_MERCHANT_PASSWORD!);
  await assert.rejects(otherMerchant.request(`lojista/pedidos/${placed.id}/`), (e:ApiError) => e.status === 404);
  await assert.rejects(otherMerchant.request(`lojista/pedidos/${placed.id}/transicao/`, "POST", {status:"preparando"}), (e:ApiError) => e.status === 404);
  await otherMerchant.logout();
  await catalog.setFulfillment("permite_retirada", true);
  await catalog.setPayments(["pix","dinheiro","credito","debito"]);
  const cardPreview=await checkout.preview({loja:shop.id,modalidade:"retirada",meio_pagamento:"credito",observacoes:"Card test"});
  assert.equal(cardPreview.meio_pagamento,"credito");
  const pickupBody = {loja:shop.id,modalidade:"retirada" as const,meio_pagamento:"dinheiro",precisa_troco:true,troco_para:"100.00",observacoes:"Pickup test"};
  const pickupPreview = await checkout.preview(pickupBody);
  assert.equal(pickupPreview.endereco, null);
  assert.equal(pickupPreview.taxa_entrega, "0.00");
  const pickupOrder = await checkout.confirm(pickupBody);
  assert.equal(pickupOrder.modalidade,"retirada");
  assert.equal(pickupOrder.precisa_troco,true);
  assert.equal(pickupOrder.troco_para,"100.00");
  assert.equal(pickupOrder.valor_troco,pickupPreview.valor_troco);
  assert.equal(pickupOrder.total,pickupOrder.subtotal);
  for (const state of ["aceito","preparando","pronto_retirada"]) {
    const updated = await merchant.request<any>(`lojista/pedidos/${pickupOrder.id}/transicao/`,"POST",{status:state});
    assert.equal(updated.status,state);
  }
  const received=await client.request<any>(`pedidos/${pickupOrder.id}/confirmar-recebimento/`,"POST",{});
  assert.equal(received.status,"entregue");
  assert.equal((await merchant.request<any>(`lojista/pedidos/${pickupOrder.id}/`)).status,"entregue");
  assert.equal((await client.request<any>(`pedidos/${pickupOrder.id}/confirmar-recebimento/`,"POST",{})).status,"entregue");
  await merchant.logout();
  // A deliberately expired access forces real refresh rotation while keeping the valid refresh.
  const before = saved! as Tokens;
  saved = { access: "invalid-access-for-test", refresh: before.refresh };
  const restored = new ApiClient(base, vault);
  assert.equal(await restored.restore(), true);
  const accounts = await Promise.all([
    restored.request<Account>("conta/"),
    restored.request<Account>("conta/"),
  ]);
  assert.equal(accounts[0].id, account.id);
  assert.equal(accounts[1].id, account.id);
  assert.notEqual((saved! as Tokens).refresh, before.refresh);
  await assert.rejects(
    client.publicRequest("token/refresh/", "POST", { refresh: before.refresh }),
    (error: ApiError) => error.status === 401,
  );
  const after = saved! as Tokens;
  assert.equal(await restored.logout(), true);
  assert.equal(saved, null);
  await assert.rejects(
    client.publicRequest("token/refresh/", "POST", { refresh: after.refresh }),
    (error: ApiError) => error.status === 401,
  );
  console.log(
    "PASS: cliente TS + Django HTTP real; cadastro, login, conta, paginação, loja, produtos, entrega, carrinhos isolados por loja/cliente, quantidades, remoção, permissões, endereço obrigatório, prévia, checkout idempotente, pedidos e snapshots, refresh concorrente, rotação e logout. SQLite em memória; dados sintéticos; servidor encerrado.",
  );
}
main().catch((error) => {
  console.error(
    error?.name,
    error instanceof ApiError ? `HTTP ${error.status}` : "",
  );
  console.error(
    String(error?.stack ?? "")
      .split("\n")
      .filter((line) => line.trim().startsWith("at "))
      .slice(0, 3)
      .join("\n"),
  );
  console.error(
    "FAIL: integração HTTP. Verifique o contrato local; credenciais e respostas não são registradas.",
  );
  process.exitCode = 1;
});
