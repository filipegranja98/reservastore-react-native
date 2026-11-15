import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contactLinks} from '../src/contact';
test('Brazilian local store phone opens WhatsApp and explicit international numbers keep DDI',()=>{
 assert.equal(contactLinks('(85) 99999-0000','').whatsapp,'https://wa.me/5585999990000');
 assert.equal(contactLinks('+55 (85) 99999-0000','').telephone,'tel:+5585999990000');
 assert.equal(contactLinks('+1 202 555 0100','').whatsapp,'https://wa.me/12025550100');
});
test('missing and malformed contact data do not produce actionable links',()=>{
 for(const phone of ['', '111','not-a-number','85999990000?text=spam'])assert.equal(contactLinks(phone,'').whatsapp,null);
 assert.equal(contactLinks('','store@example.test').email,'mailto:store@example.test');
 assert.equal(contactLinks('','store@example.test?bcc=other@example.test').email,null);
 assert.equal(contactLinks(undefined,undefined).telephone,null);
});
