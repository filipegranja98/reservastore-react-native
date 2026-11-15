import {test} from "node:test";
import assert from "node:assert/strict";
import {parseCashAmount,checkoutPayload,paymentLabels} from "../src/checkout";
const base={loja:1,modalidade:"retirada" as const,meio_pagamento:"dinheiro",observacoes:""};
test("cash amount preserves cents and rejects ambiguous or negative values",()=>{
  assert.equal(parseCashAmount(" 100,5 "),"100.50");
  for(const value of ["1.000,00","-10","1.234","", "NaN"])assert.throws(()=>parseCashAmount(value));
});
test("change information is persisted in checkout payload and cannot attach to cards",()=>{
  assert.equal(checkoutPayload({...base,precisa_troco:true,troco_para:"100,00"}).troco_para,"100.00");
  assert.equal(checkoutPayload({...base,precisa_troco:false}).troco_para,null);
  assert.throws(()=>checkoutPayload({...base,precisa_troco:true}));
  assert.throws(()=>checkoutPayload({...base,meio_pagamento:"credito",precisa_troco:true,troco_para:"100"}));
  assert.equal(paymentLabels.credito,"Cartão de crédito");
  assert.equal(paymentLabels.debito,"Cartão de débito");
});
