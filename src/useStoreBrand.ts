import React from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { api } from "./client";
import type { Shop } from "./types";
import { shopTheme, type StoreTheme } from "./theme";
export function useStoreBrand(id: number) {
  const [value, setValue] = React.useState<{ id: number; shop: Shop } | null>(
    null,
  );
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      api
        .publicRequest<Shop>(`catalogo/lojas/${id}/`)
        .then((shop) => {
          if (active) setValue({ id, shop });
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [id]),
  );
  const shop = value?.id === id ? value.shop : null;
  return { shop, theme: shopTheme(shop) };
}
export function useBrandHeader(theme: StoreTheme, title: string) {
  const navigation = useNavigation();
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title,
      headerStyle: { backgroundColor: theme.primary },
      headerTintColor: theme.onPrimary,
    });
  }, [navigation, title, theme.primary, theme.onPrimary]);
}
