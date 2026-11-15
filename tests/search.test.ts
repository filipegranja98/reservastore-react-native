import assert from "node:assert/strict";
import { test } from "node:test";
import { searchLoaded } from "../src/search";
const loaded = [
  { nome: "Café em pó — DEMO" },
  { nome: "Água mineral — DEMO" },
  { nome: "Arroz integral" },
];
test("search ignores accents and case and combines words in any order", () => {
  assert.deepEqual(searchLoaded(loaded, "  CAFE  "), [loaded[0]]);
  assert.deepEqual(searchLoaded(loaded, "demo agua"), [loaded[1]]);
});
test("empty query preserves loaded rows, nonmatches remain empty without mutating rows", () => {
  assert.deepEqual(searchLoaded(loaded, ""), loaded);
  assert.deepEqual(searchLoaded(loaded, "leite"), []);
  assert.equal(loaded.length, 3);
});
