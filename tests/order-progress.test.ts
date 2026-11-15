import {test} from "node:test";
import assert from "node:assert/strict";
import {orderProgress} from "../src/orderStages";
test("delivery and pickup track their actual server stages",()=>{
  assert.equal(orderProgress("saiu_entrega").index,3);
  assert.equal(orderProgress("pronto_retirada",true).index,3);
  assert.equal(orderProgress("entregue",true).current.title,"Pedido retirado");
  assert.equal(orderProgress("entregue").progress,1);
  assert.equal(orderProgress("pronto_retirada").index,-1);
});
test("canceled and unknown states never display completed delivery",()=>{
  assert.equal(orderProgress("cancelado").canceled,true);
  assert.equal(orderProgress("cancelado").progress,0);
  assert.equal(orderProgress("unknown").index,-1);
  assert.equal(orderProgress("unknown").finished,false);
});
