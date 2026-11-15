import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { storeAvailability } from "./availability";
import type { Shop } from "./types";
import { Thumbnail } from "./ui";

export function StoreLogo({ shop }: { shop: Shop }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  const focused = useIsFocused();
  const known = typeof shop.aberta === "boolean";
  const border = storeAvailability(shop).border;
  const glow = shop.aberta ? "#20D878" : "#FF454F";

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(value => { if (mounted) setReduceMotion(value); })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const app = AppState.addEventListener("change", state => setActive(state === "active"));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion || !active || !focused || !known) {
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    animation.start();
    return () => { animation.stop(); pulse.setValue(0); };
  }, [active, focused, known, reduceMotion, pulse]);

  return (
    <View style={{ width: 104, height: 104, alignItems: "center", justifyContent: "center" }}>
      {known && <Animated.View pointerEvents="none" accessible={false} style={{
        position: "absolute", width: 98, height: 98, borderRadius: 49,
        backgroundColor: glow,
        boxShadow: `0px 0px 16px 5px ${glow}`,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.48] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] }) }],
      }} />}
      <View style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 3,
        borderColor: border, backgroundColor: "white", alignItems: "center", justifyContent: "center" }}>
        <Thumbnail uri={shop.logo} name={shop.nome} contain circular />
      </View>
    </View>
  );
}
