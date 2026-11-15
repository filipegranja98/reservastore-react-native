import { test } from "node:test";
import assert from "node:assert/strict";
import { MerchantCatalog } from "../src/merchant";
import type { ApiClient } from "../src/api";
import { categoryPath, paginatedPath } from "../src/config";
import { allowedAppRole, landingRoute } from "../src/roles";
function client(
  handler: (path: string, method?: string, body?: unknown) => unknown,
): Pick<ApiClient, "request"> {
  return {
    request: async <T>(path: string, method?: string, body?: unknown) =>
      handler(path, method, body) as T,
  };
}
test("merchant creates a category without trusting a shop ID from form fields", async () => {
  let seen: unknown;
  const catalog = new MerchantCatalog(
    client((path, method, body) => {
      seen = { path, method, body };
      return { id: 8, nome: "Bebidas", loja: 3 };
    }),
    3,
  );
  await catalog.createCategory("  Bebidas  ");
  assert.deepEqual(seen, {
    path: "categorias/",
    method: "POST",
    body: { nome: "Bebidas" },
  });
});
test("merchant assignment sends only selected category and verifies returned ownership", async () => {
  const catalog = new MerchantCatalog(
    client((path, method, body) => {
      assert.equal(path, "produtos/5/");
      assert.equal(method, "PATCH");
      assert.deepEqual(body, { categoria: 8 });
      return { id: 5, loja: 3 };
    }),
    3,
  );
  await catalog.assignCategory(5, 8);
  const wrong = new MerchantCatalog(
    client(() => ({ loja: 4 })),
    3,
  );
  await assert.rejects(wrong.assignCategory(5, 8), /não pertence/);
});
test("blank names, oversized names and changed session cannot submit writes", async () => {
  let requests = 0;
  const c = client(() => {
    requests++;
  });
  const catalog = new MerchantCatalog(c, 3);
  await assert.rejects(catalog.createCategory(" "));
  await assert.rejects(catalog.createCategory("x".repeat(101)));
  await assert.rejects(
    new MerchantCatalog(c, 3, () => {
      throw Error("session changed");
    }).createCategory("Bebidas"),
  );
  assert.equal(requests, 0);
});
test("merchant changes type only through own store route", async () => {
  const catalog = new MerchantCatalog(
    client((path, method, body) => {
      assert.equal(path, "lojas/3/");
      assert.equal(method, "PATCH");
      assert.deepEqual(body, { tipo_loja: 2 });
      return { id: 3, tipo_loja: 2 };
    }),
    3,
  );
  await catalog.setStoreType(2);
});
test("category filters are preserved across server pagination", () => {
  assert.equal(
    paginatedPath(categoryPath("catalogo/lojas/", "tipo_loja", 2), 3),
    "catalogo/lojas/?tipo_loja=2&page=3&page_size=20",
  );
  assert.equal(
    paginatedPath(
      categoryPath("catalogo/lojas/7/produtos/", "categoria", 5),
      2,
    ),
    "catalogo/lojas/7/produtos/?categoria=5&page=2&page_size=20",
  );
  assert.equal(
    paginatedPath(categoryPath("catalogo/lojas/", "tipo_loja", null), 1),
    "catalogo/lojas/?page=1&page_size=20",
  );
});
test("existing merchant accounts get merchant panel; public registration is still customer-only", () => {
  assert.equal(allowedAppRole("cliente"), true);
  assert.equal(allowedAppRole("lojista"), true);
  assert.equal(allowedAppRole("administrador"), false);
  assert.equal(allowedAppRole("unknown"), false);
  assert.equal(landingRoute("lojista"), "MerchantCategories");
  assert.equal(landingRoute("cliente"), "Shops");
});

test("opening updates only the owner's store and confirms persisted state", async () => {
  for (const aberta of [true, false]) {
    const catalog = new MerchantCatalog(client((path, method, body) => {
      assert.equal(path, "lojas/3/"); assert.equal(method, "PATCH");
      assert.deepEqual(body, {aberta}); return {id: 3, aberta};
    }), 3);
    assert.equal((await catalog.setOpen(aberta)).aberta, aberta);
  }
  await assert.rejects(new MerchantCatalog(client(() => ({id: 4, aberta: true})), 3).setOpen(true));
  await assert.rejects(new MerchantCatalog(client(() => ({id: 3, aberta: false})), 3).setOpen(true));
});

test("merchant configures only own fulfillment modes", async () => {
  const catalog = new MerchantCatalog(client((path, method, body) => {
    assert.equal(path,"lojas/3/");assert.equal(method,"PATCH");assert.deepEqual(body,{permite_retirada:true});
    return {id:3,permite_retirada:true};
  }),3);
  assert.equal((await catalog.setFulfillment("permite_retirada",true)).permite_retirada,true);
  await assert.rejects(new MerchantCatalog(client(() => ({id:4,permite_retirada:true})),3).setFulfillment("permite_retirada",true));
});

test("catalog editing changes only item fields and can remove its photo",async()=>{
 const catalog=new MerchantCatalog(client((path,method,body)=>{
   assert.equal(path,"produtos/8/");assert.equal(method,"PATCH");
   assert.deepEqual(body,{nome:"Produto",preco:"15.50",categoria:2,ativo:false,imagem:null});
   return {id:8,loja:3};
 }),3);
 await catalog.saveItem({nome:" Produto ",preco:"15,50",categoria:2,ativo:false},8,null);
 await assert.rejects(new MerchantCatalog(client(()=>({id:8,loja:4})),3).saveItem({nome:"Produto",preco:"1",categoria:2,ativo:true},8));
});
