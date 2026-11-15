import type { Shop } from "./types";
export interface StoreTheme {
  primary: string;
  secondary: string;
  onPrimary: string;
  onSecondary: string;
  secondaryText: string;
  actionText: string;
}
export function validHex(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length === 7 && /^#[\da-f]{6}$/i.test(value)
    ? value.toUpperCase()
    : fallback;
}
function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) =>
      v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function textOn(color: string) {
  return contrast(color, "#FFFFFF") >= contrast(color, "#000000")
    ? "#FFFFFF"
    : "#000000";
}
export function shopTheme(
  shop?: Pick<Shop, "cor_primaria" | "cor_secundaria"> | null,
): StoreTheme {
  const primary = validHex(shop?.cor_primaria, "#17624E");
  const secondary = validHex(shop?.cor_secundaria, "#EAF1E9");
  return {
    primary,
    secondary,
    onPrimary: textOn(primary),
    onSecondary: textOn(secondary),
    secondaryText:
      contrast(primary, secondary) >= 4.5 ? primary : textOn(secondary),
    actionText: contrast(primary, "#FFFFFF") >= 4.5 ? primary : "#172E2A",
  };
}
