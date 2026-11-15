import {test} from "node:test";
import assert from "node:assert/strict";
import {elapsedTime,preparationStarted,merchantNext} from "../src/orderTiming";
test("preparation clock uses recorded preparation event, never payment or order creation",()=>{
  const start="2026-11-08T12:00:00Z";
  const events=[{id:1,tipo:"status",novo:"preparando",criado_em:start},{id:2,tipo:"pagamento",novo:"confirmado",criado_em:"2026-11-08T12:05:00Z"}];
  assert.equal(elapsedTime(preparationStarted({status:"preparando",eventos:events}),Date.parse("2026-11-08T12:14:00Z")),"14 min");
  assert.equal(preparationStarted({status:"entregue",eventos:events}),null);
  assert.equal(preparationStarted({status:"preparando"}),null);
  assert.equal(elapsedTime(null,Date.now()),"Tempo não informado");
});
test("clock handles long durations and clock differences without negative values",()=>{
  assert.equal(elapsedTime(0,65*60000),"1 h 5 min");
  assert.equal(elapsedTime(100000,1000),"menos de 1 min");
  assert.equal(merchantNext({status:"preparando",modalidade:"retirada"})?.status,"pronto_retirada");
  assert.equal(merchantNext({status:"preparando",modalidade:"entrega"})?.status,"saiu_entrega");
  assert.equal(merchantNext({status:"cancelado"}),undefined);
});
