import React, { createContext, useContext } from "react";
import type { Shop } from "./types";
import { shopTheme } from "./theme";
const Context = createContext({
  ...shopTheme(),
  secondary: "#FFFFFF",
  secondaryText: "#17624E",
});
export function StoreThemeProvider({
  shop,
  children,
}: React.PropsWithChildren<{ shop: Shop | null }>) {
  return (
    <Context.Provider value={shopTheme(shop)}>{children}</Context.Provider>
  );
}
export const useStoreTheme = () => useContext(Context);
