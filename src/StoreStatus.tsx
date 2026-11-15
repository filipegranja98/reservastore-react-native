import React from "react";
import { Text, View } from "react-native";
import type { Shop } from "./types";
import { storeAvailability } from "./availability";
export function StoreStatus({ shop, onCard=false }: { shop: Pick<Shop, "aberta"> | null; onCard?:boolean }) {
  const state = storeAvailability(shop);
  return (
    <View style={{ gap: 5 }}>
      <View
        style={{
          alignSelf: "flex-start",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 7,
          backgroundColor: onCard ? "rgba(255,255,255,0.16)" : state.badge,
        }}
      >
        <Text
          accessibilityLabel={`Loja ${state.label.toLowerCase()}`}
          style={{ color: onCard?state.cardText:state.color, fontSize: 14, fontWeight: "700" }}
        >
          {state.label}
        </Text>
      </View>
      <Text style={{ color: onCard?state.cardText:"#45584F", fontSize: 13, lineHeight: 19 }}>
        {state.description}
      </Text>
    </View>
  );
}
