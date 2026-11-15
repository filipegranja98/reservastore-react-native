import React from "react";
import { View } from "react-native";
import { colors } from "./ui";
export function EyeIcon({ crossed = false }: { crossed?: boolean }) {
  return (
    <View
      accessible={false}
      style={{
        width: 28,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 24,
          height: 16,
          borderWidth: 2,
          borderColor: colors.green,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.green,
          }}
        />
      </View>
      {crossed && (
        <View
          style={{
            position: "absolute",
            width: 28,
            height: 2,
            backgroundColor: colors.green,
            transform: [{ rotate: "-45deg" }],
          }}
        />
      )}
    </View>
  );
}
