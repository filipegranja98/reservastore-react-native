import React from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { useStoreTheme } from "./themeContext";
export function CategoryTabs({
  items,
  selected,
  onSelect,
  allLabel = "Todos",
  disabled = false,
}: {
  items: { id: number; nome: string }[];
  selected: number | null;
  onSelect: (id: number | null) => void;
  allLabel?: string;
  disabled?: boolean;
}) {
  const theme = useStoreTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {[{ id: null, nome: allLabel }, ...items].map((item) => (
        <Pressable
          key={item.id ?? "all"}
          accessibilityRole="button"
          disabled={disabled}
          accessibilityState={{ selected: selected === item.id, disabled }}
          onPress={() => onSelect(item.id)}
          style={({ pressed }) => ({
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.primary,
            paddingHorizontal: 16,
            minHeight: 46,
            justifyContent: "center",
            backgroundColor:
              selected === item.id ? theme.primary : theme.secondary,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontWeight: "600",
              color:
                selected === item.id ? theme.onPrimary : theme.secondaryText,
            }}
          >
            {item.nome}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
