import test from 'node:test';
import assert from 'node:assert/strict';
import {apiErrorMessage,friendlyMessage} from '../src/errorMessages';
test('translates nested validation without exposing English field names or error codes',()=>{
 assert.equal(apiErrorMessage({email:['Enter a valid email address.'],username:['This field is required.']}),'E-mail: Informe um e-mail válido, como nome@exemplo.com.\nUsuário: Preencha este campo para continuar.');
 assert.equal(apiErrorMessage({detail:'Authentication credentials were not provided.',code:'not_authenticated'}),'Seu acesso expirou. Entre novamente para continuar.');
});
test('password rules explain how to correct the input',()=>{
 assert.equal(friendlyMessage('This password is too short. It must contain at least 8 characters.'),'Use pelo menos 8 caracteres neste campo.');
 assert.match(friendlyMessage('This password is too common.'),/senha menos comum/);
});
test('unrecognized technical messages are replaced; Portuguese business guidance survives',()=>{
 assert.equal(friendlyMessage('Unexpected upstream gateway failure'),'Não foi possível concluir. Confira os dados e tente novamente.');
 assert.equal(friendlyMessage('Este horário já está reservado. Escolha outro horário.'),'Este horário já está reservado. Escolha outro horário.');
});
