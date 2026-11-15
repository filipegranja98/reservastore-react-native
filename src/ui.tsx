import { useStoreTheme } from "./themeContext";
import { mediaUri } from "./client";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
export const colors = {
  ink: "#172E2A",
  muted: "#5B6E68",
  green: "#17624E",
  cream: "#F5F5EF",
  line: "#DCE4DC",
  white: "#FFFFFF",
  error: "#9A302E",
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 22, gap: 18, paddingBottom: 40 },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "700",
    color: colors.green,
  },
  title: { fontSize: 32, lineHeight: 38, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.muted },
  section: { fontSize: 21, fontWeight: "700", color: colors.ink },
  card: {
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
    minHeight: 50,
  },
  button: {
    backgroundColor: colors.green,
    borderRadius: 12,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: colors.white },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryText: { color: colors.green },
  error: { color: colors.error, fontSize: 14, lineHeight: 21 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF1E9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  small: { fontSize: 13, lineHeight: 20, color: colors.muted },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: "#EAF1E9",
    alignItems: "center",
    justifyContent: "center",
  },
});
export function Button({
  title,
  onPress,
  busy = false,
  secondary = false,
  selected,
  disabled = false,
}: {
  title: string;
  onPress(): void;
  busy?: boolean;
  secondary?: boolean;
  selected?: boolean;
  disabled?: boolean;
}) {
  const theme = useStoreTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy, selected }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        {
          backgroundColor: secondary ? theme.secondary : theme.primary,
          borderColor: theme.secondary,
        },
        selected !== undefined && {
          backgroundColor: selected ? theme.primary : colors.white,
          borderColor: theme.primary,
          borderWidth: 2,
        },
        { opacity: pressed || disabled || busy ? 0.65 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={secondary ? theme.secondaryText : theme.onPrimary}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            { color: selected !== undefined ? (selected ? theme.onPrimary : theme.actionText) : (secondary ? theme.secondaryText : theme.onPrimary) },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}
export function Notice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="alert" style={styles.error}>
        {message}
      </Text>
      {retry && <Button title="Tentar novamente" secondary onPress={retry} />}
    </View>
  );
}
export function Thumbnail({
  uri,
  name,
  contain = false,
  circular = false,
}: {
  uri: string | null;
  name: string;
  contain?: boolean;
  circular?: boolean;
}) {
  const theme = useStoreTheme();
  const resolved = mediaUri(uri);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [resolved]);
  return resolved && !failed ? (
    <Image
      accessibilityLabel={name}
      source={{ uri: resolved }}
      resizeMode={contain ? "contain" : "cover"}
      style={[styles.avatar, contain && { backgroundColor: "white" }, circular && { width: 82, height: 82, borderRadius: 41 }]}
      onError={() => setFailed(true)}
    />
  ) : (
    <View
      style={[
        styles.avatar,
        circular && { width: 82, height: 82, borderRadius: 41 },
        { backgroundColor: contain ? "white" : theme.secondary },
      ]}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: contain ? theme.actionText : theme.onSecondary,
        }}
      >
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
export function StoreHeading({
  name,
  logo,
}: {
  name: string;
  logo: string | null;
}) {
  const theme = useStoreTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.primary, borderColor: theme.primary },
      ]}
    >
      <View style={styles.row}>
        <Thumbnail uri={logo} name={name} contain />
        <Text style={[styles.section, { flex: 1, color: theme.onPrimary }]}>
          {name}
        </Text>
      </View>
    </View>
  );
}
export const money = (value: string) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
