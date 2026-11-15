import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtimeApiUrl } from '../src/config';
test('development relay follows LAN host or HTTPS tunnel while production keeps configured API', () => {
  assert.equal(runtimeApiUrl('https://api.example.test/api/', '192.168.1.102:8000', true), 'http://192.168.1.102:8000/api/');
  assert.equal(runtimeApiUrl('http://192.168.1.102:8000/api/', 'example.exp.direct', true), 'https://example.exp.direct/api/');
  assert.equal(runtimeApiUrl('https://api.example.test/api/', 'example.exp.direct', false), 'https://api.example.test/api/');
  assert.equal(runtimeApiUrl('https://api.example.test/api/', undefined, true), 'https://api.example.test/api/');
});
