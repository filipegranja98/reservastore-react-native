import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionDate,promotionExpiry} from '../src/promotions';
test('promotion dates preserve the local calendar day and reject invalid input',()=>{
 assert.equal(promotionDate('18/11/2026'),'2026-11-18');
 assert.equal(promotionExpiry('2026-11-18'),'18/11/2026');
 assert.throws(()=>promotionDate('31/02/2026'));
 assert.throws(()=>promotionDate('2026-11-18'));
});
