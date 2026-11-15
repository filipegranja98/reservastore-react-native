import React from "react";
import { View } from "react-native";
// Code-native cart outline: no font or remote asset needs to load.
export function CartIcon({ color = "white" }: { color?: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 36, height: 36 }}
    >
      <View
        style={{
          position: "absolute",
          left: 2,
          top: 4,
          width: 9,
          height: 2.5,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 7,
          top: 5,
          width: 2.5,
          height: 22,
          borderRadius: 2,
          backgroundColor: color,
          transform: [{ rotate: "-12deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 10,
          top: 9,
          width: 23,
          height: 15,
          borderWidth: 2.5,
          borderColor: color,
          borderRadius: 3,
          transform: [{ skewX: "-8deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 11,
          top: 26,
          width: 21,
          height: 2.5,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 12,
          top: 31,
          width: 4.5,
          height: 4.5,
          borderRadius: 3,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 27,
          top: 31,
          width: 4.5,
          height: 4.5,
          borderRadius: 3,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
