import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { CheckoutVault, PendingCheckout } from "./checkout";
const memory = new Map<string, PendingCheckout>();
export function checkoutVault(user: number, shop: number): CheckoutVault {
  const key = `reservastore.checkout.v1.${user}.${shop}`;
  return {
    async read() {
      const value =
        Platform.OS === "web"
          ? (memory.get(key) ?? null)
          : (JSON.parse(
              (await SecureStore.getItemAsync(key)) ?? "null",
            ) as PendingCheckout | null);
      if (
        value &&
        (!value.key || value.payload?.loja !== shop || (value.payload.modalidade !== "retirada" && !value.payload.endereco))
      )
        throw Error(
          "Não foi possível ler a tentativa de pedido salva. Não envie outro pedido antes de verificar sua conta.",
        );
      return value;
    },
    async write(value) {
      if (Platform.OS === "web") {
        if (value) memory.set(key, value);
        else memory.delete(key);
        return;
      }
      if (value)
        await SecureStore.setItemAsync(key, JSON.stringify(value), {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      else await SecureStore.deleteItemAsync(key);
    },
  };
}
