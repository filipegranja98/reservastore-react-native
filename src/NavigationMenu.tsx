import React, { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Routes } from "./screens";
import { useSession } from "./session";
import { Button, colors, Notice, styles } from "./ui";

export function NavigationMenu({ color = colors.ink }: { color?: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<Routes>>();
  const { account, logout } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function close() {
    if (!busy) setOpen(false);
  }
  function go(
    route:
      | "Shops"
      | "Account"
      | "Orders"
      | "Appointments"
      | "MerchantCategories"
      | "MerchantCatalog"
      | "MerchantPromotions"
      | "Login"
      | "Register",
  ) {
    setOpen(false);
    navigation.navigate(route);
  }
  async function exit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const revoked = await logout();
      setOpen(false);
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "Login",
            params: {
              notice: revoked
                ? "Você saiu da sua conta."
                : "Você saiu deste aparelho. Não foi possível encerrar a sessão no servidor.",
            },
          },
        ],
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir menu de navegação"
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 44,
          minWidth: 64,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 8,
        }}
      >
        <Text style={{ color, fontSize: 16, fontWeight: "700" }}>☰ Menu</Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#00000066",
            flexDirection: "row",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar menu"
            onPress={close}
            disabled={busy}
            style={{ flex: 1 }}
          />
          <SafeAreaView
            accessibilityViewIsModal
            style={{
              width: "86%",
              maxWidth: 380,
              backgroundColor: colors.cream,
            }}
          >
            <ScrollView
              contentContainerStyle={[styles.content, { gap: 16 }]}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Image
                  source={require("../assets/reserva-store-logo-v1.png")}
                  resizeMode="contain"
                  accessible={false}
                  style={{ width: 38, height: 38 }}
                />
                <Text style={[styles.eyebrow, { flexShrink: 1 }]}>
                  RESERVA STORE
                </Text>
              </View>
              <Text style={styles.title}>Menu</Text>
              <Text style={styles.subtitle}>
                {account ? account.first_name || account.username : "Bem-vindo"}
              </Text>
              {account && (
                <Text style={styles.small}>
                  {account.papel === "lojista"
                    ? "Conta de lojista"
                    : "Conta de cliente"}
                </Text>
              )}
              <Button
                title="Explorar lojas"
                secondary
                disabled={busy}
                onPress={() => go("Shops")}
              />
              {account?.papel === "lojista" && (
                <Button
                  title="Painel da minha loja"
                  secondary
                  disabled={busy}
                  onPress={() => go("MerchantCategories")}
                />
              )}
              {account?.papel === "lojista" && (
                <Button
                  title="Gerenciar produtos e serviços"
                  secondary
                  disabled={busy}
                  onPress={() => go("MerchantCatalog")}
                />
              )}
              {account?.papel === "lojista" && <Button title="Promoções da loja" secondary disabled={busy} onPress={()=>go("MerchantPromotions")}/>}
              {account && (
                <Button title={account.papel === "lojista" ? "Agenda de serviços" : "Meus agendamentos"} secondary disabled={busy} onPress={() => go("Appointments")} />
              )}
              {account && (
                <Button
                  title={
                    account.papel === "lojista"
                      ? "Pedidos da loja"
                      : "Meus pedidos"
                  }
                  secondary
                  disabled={busy}
                  onPress={() => go("Orders")}
                />
              )}
              {account && (
                <Button
                  title="Minha conta"
                  secondary
                  disabled={busy}
                  onPress={() => go("Account")}
                />
              )}
              {!account && (
                <>
                  <Button
                    title="Entrar"
                    disabled={busy}
                    onPress={() => go("Login")}
                  />
                  <Button
                    title="Criar conta"
                    secondary
                    disabled={busy}
                    onPress={() => go("Register")}
                  />
                </>
              )}
              {!!error && <Notice message={error} />}
              {account && (
                <Button
                  title="Sair da conta"
                  busy={busy}
                  onPress={() => void exit()}
                />
              )}
              <Button
                title="Fechar menu"
                secondary
                disabled={busy}
                onPress={close}
              />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
