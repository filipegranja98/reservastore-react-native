import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogPrice, MerchantCatalog } from "../src/merchant";
test("prices preserve cents and reject ambiguous values", () => {
  assert.equal(catalogPrice(" 150,5 "), "150.50");
  assert.equal(catalogPrice("0"), "0.00");
  for (const value of ["1.000,00", "-5", "1.234", "Infinity", "", "100000000"]) assert.throws(() => catalogPrice(value));
});
test("service creation submits only catalog fields and checks store ownership", async () => {
 const catalog = new MerchantCatalog({request: async <T>(path: string, method?: string, body?: unknown) => {
   assert.equal(path, "produtos/"); assert.equal(method, "POST");
   assert.deepEqual(body, {nome: "Limpeza de sofa", categoria: 2, preco: "150.00"});
   return {id: 9, loja: 3} as T;
 }}, 3);
 await catalog.createItem(" Limpeza de sofa ", 2, "150,00");
 const wrong = new MerchantCatalog({request: async <T>() => ({loja: 4}) as T}, 3);
 await assert.rejects(wrong.createItem("Limpeza", 2, "100"));
});
