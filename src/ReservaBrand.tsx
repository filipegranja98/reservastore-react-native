import React from "react";
import { Image, Text, View } from "react-native";
import { colors } from "./ui";

export function ReservaBrand({ size = 120 }: { size?: number }) {
  return (
    <View style={{ alignItems: "center", gap: 14 }}>
      <Image source={require("../assets/reserva-store-logo-v1.png")} resizeMode="contain" style={{ width: size, height: size }} accessible={false} />
      <Text accessibilityRole="header" style={{ color: colors.green, fontSize: 30, fontWeight: "700", textAlign: "center" }}>Reserva Store</Text>
    </View>
  );
}
