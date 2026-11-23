import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionDate,promotionExpiry} from '../src/promotions';
test('promotion dates preserve the local calendar day and reject invalid input',()=>{
 assert.equal(promotionDate('18/11/2026'),'2026-11-18');
 assert.equal(promotionExpiry('2026-11-18'),'18/11/2026');
 assert.throws(()=>promotionDate('31/02/2026'));
 assert.throws(()=>promotionDate('2026-11-18'));
});

test('service booking retains promotion conditions without replacing customer details',async()=>{
 const {promotionContext,bookingPromotionNotes}=await import('../src/promotions');
 const context=promotionContext({titulo:'Sofá + cadeiras',descricao:'Desconto para dois estofados'} as any);
 assert.match(context,/Promoção solicitada: Sofá \+ cadeiras/);
 assert.equal(bookingPromotionNotes(context,'  Um sofá de 3 lugares  '),context+'\n\nUm sofá de 3 lugares');
 assert.equal(bookingPromotionNotes(undefined,'  Um sofá  '),'Um sofá');
 assert.ok(promotionContext({titulo:'x'.repeat(2000),descricao:'y'.repeat(2000)} as any).length<=1200);
});
