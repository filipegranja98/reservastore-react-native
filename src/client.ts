import Constants from "expo-constants";
import { runtimeApiUrl, runtimeMediaUrl } from "./config";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { ApiClient, type TokenVault } from "./api";
import type { Tokens } from "./types";
const key = "reservastore.session.v1";
// Web preview deliberately keeps credentials only in memory.
let webTokens: Tokens | null = null;
const vault: TokenVault = {
  async read() {
    if (Platform.OS === "web") return webTokens;
    const value = await SecureStore.getItemAsync(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as Tokens;
    } catch {
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async write(tokens) {
    if (Platform.OS === "web") {
      webTokens = tokens;
      return;
    }
    if (tokens)
      await SecureStore.setItemAsync(key, JSON.stringify(tokens), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    else await SecureStore.deleteItemAsync(key);
  },
};
const base = runtimeApiUrl(
  process.env.EXPO_PUBLIC_API_URL ?? "",
  Platform.OS === "web" && typeof window !== "undefined"
    ? window.location.host
    : Constants.expoConfig?.hostUri,
  __DEV__ && process.env.EXPO_PUBLIC_USE_DEV_API_PROXY === "true",
);
export const api = new ApiClient(base, vault, fetch, !__DEV__);

export const mediaUri = (value: string | null) =>
  runtimeMediaUrl(
    value,
    base,
    (__DEV__ && process.env.EXPO_PUBLIC_USE_DEV_API_PROXY === "true") || process.env.EXPO_PUBLIC_DEMO_MEDIA_PROXY === "true",
  );
