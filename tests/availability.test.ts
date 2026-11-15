import { test } from "node:test";
import assert from "node:assert/strict";
import { storeAvailability } from "../src/availability";
import { shopTheme } from "../src/theme";
test("open and closed cards have green/red surfaces plus explicit labels", () => {
  const open = storeAvailability({ aberta: true }),
    closed = storeAvailability({ aberta: false });
  assert.equal(open.label, "Aberta");
  assert.equal(closed.label, "Fechada");
  assert.equal(open.canOrder, true);
  assert.equal(closed.canOrder, false);
  assert.equal(open.border, "#1B7844");
  assert.equal(closed.border, "#A3292B");
  assert.notEqual(open.card, closed.card);
});
test("missing operational state is not assumed open or closed", () => {
  for (const value of [null, {}]) {
    const state = storeAvailability(value);
    assert.equal(state.canOrder, false);
    assert.equal(state.label, "Situação não informada");
  }
});
test("operational colors do not overwrite store identity", () => {
  const brand = shopTheme({
    cor_primaria: "#243B7A",
    cor_secundaria: "#FFD166",
  });
  storeAvailability({ aberta: false });
  assert.equal(brand.primary, "#243B7A");
});
