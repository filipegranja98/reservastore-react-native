import { test } from "node:test";
import assert from "node:assert/strict";
import { shopTheme, contrast, textOn } from "../src/theme";
import { runtimeMediaUrl } from "../src/config";
test("store colors are scoped, normalized and invalid values use neutral defaults", () => {
  const first = shopTheme({
    cor_primaria: "#243b7a",
    cor_secundaria: "#FFD166",
  });
  const second = shopTheme({
    cor_primaria: "#880022",
    cor_secundaria: "#FFEEDD",
  });
  assert.equal(first.primary, "#243B7A");
  assert.equal(second.primary, "#880022");
  assert.equal(shopTheme().primary, "#17624E");
  assert.equal(
    shopTheme({ cor_primaria: "red", cor_secundaria: "url(x)" }).secondary,
    "#EAF1E9",
  );
});
test("light and dark brands select legible text including cart icon and badge", () => {
  for (const primary of [
    "#FFFFFF",
    "#FFFF00",
    "#111111",
    "#243B7A",
    "#888888",
  ]) {
    const theme = shopTheme({ cor_primaria: primary, cor_secundaria: primary });
    assert.ok(contrast(primary, theme.onPrimary) >= 4.5);
    assert.ok(contrast(primary, theme.onSecondary) >= 4.5);
    assert.ok(contrast(primary, theme.secondaryText) >= 4.5);
  }
  assert.equal(textOn("#FFFFFF"), "#000000");
  assert.equal(textOn("#000000"), "#FFFFFF");
});
test("development logo URLs follow tunnel while public storage URLs are preserved", () => {
  const base = "https://demo.exp.direct/api/";
  assert.equal(
    runtimeMediaUrl("http://127.0.0.1:8002/media/logos/demo.png", base, true),
    "https://demo.exp.direct/api/media/logos/demo.png",
  );
  assert.equal(
    runtimeMediaUrl("https://images.example.test/logo.png", base, true),
    "https://images.example.test/logo.png",
  );
  assert.equal(
    runtimeMediaUrl("/media/logos/logo.png", base, false),
    "https://demo.exp.direct/media/logos/logo.png",
  );
  assert.equal(runtimeMediaUrl("file:///private/logo.png", base, true), null);
  assert.equal(
    runtimeMediaUrl("https://user:secret@example.test/logo.png", base, true),
    null,
  );
  assert.equal(runtimeMediaUrl(null, base, true), null);
});
