import { EyeIcon } from "./EyeIcon";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { colors, styles } from "./ui";
export function PasswordField({
  label,
  ...props
}: TextInputProps & { label: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!props.value) setVisible(false);
  }, [props.value]);
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "white",
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 12,
        }}
      >
        <TextInput
          {...props}
          accessibilityLabel={label}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { flex: 1, borderWidth: 0, minWidth: 0 }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"}
          disabled={props.editable === false}
          hitSlop={4}
          onPress={() => setVisible((value) => !value)}
          style={{
            minHeight: 48,
            minWidth: 48,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 12,
          }}
        >
          <EyeIcon crossed={visible} />
        </Pressable>
      </View>
    </View>
  );
}
