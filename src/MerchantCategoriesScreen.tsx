import React, { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Routes } from "./screens";
import { api } from "./client";
import { useSession } from "./session";
import type { Shop, StoreType } from "./types";
import { MerchantCatalog } from "./merchant";
import { availablePayments, paymentLabels } from "./checkout";
import { usePage } from "./usePage";
import { CategoryTabs } from "./CategoryTabs";
import { StoreStatus } from "./StoreStatus";
import { StoreThemeProvider } from "./themeContext";
import { useBrandHeader } from "./useStoreBrand";
import { shopTheme } from "./theme";
import { Button, Notice, StoreHeading, styles } from "./ui";
type Props = NativeStackScreenProps<Routes, "MerchantCategories">;
export function MerchantCategoriesScreen(props: Props) {
  const { account } = useSession();
  if (account?.papel !== "lojista")
    return (
      <View style={[styles.screen, styles.content]}>
        <Text style={styles.title}>Área do lojista</Text>
        <Button
          title="Entrar"
          onPress={() => props.navigation.navigate("Login")}
        />
      </View>
    );
  return <Dashboard key={account.id} {...props} />;
}
function Dashboard({ navigation }: Props) {
  const [shop, setShop] = useState<Shop | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [settings, setSettings] = useState(false),
    [attempt, setAttempt] = useState(0);
  const alive = useRef(false),
    lock = useRef(false);
  const types = usePage<StoreType>("catalogo/tipos-loja/");
  useBrandHeader(shopTheme(shop), "Painel da loja");
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      api
        .request<Shop>("lojas/minha_loja/")
        .then((value) => {
          if (alive.current) {
            setShop(value);
            setError("");
          }
        })
        .catch((e) => {
          if (alive.current) setError(e.message);
        });
      return () => {
        alive.current = false;
      };
    }, [attempt]),
  );
  const service = useMemo(
    () =>
      shop
        ? new MerchantCatalog(api, shop.id, () => {
            if (!alive.current) throw Error("A sessão mudou.");
          })
        : null,
    [shop?.id],
  );
  async function update(task: () => Promise<Shop>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      setShop(await task());
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <StoreThemeProvider shop={shop}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>SUA LOJA</Text>
        {shop && service ? (
          <>
            <StoreHeading name={shop.nome} logo={shop.logo} />
            <View style={styles.card}>
              <StoreStatus shop={shop} />
              <Button
                title={shop.aberta ? "Fechar loja" : "Abrir loja"}
                busy={busy}
                onPress={() => void update(() => service.setOpen(!shop.aberta))}
              />
            </View>
            <Button
              title="Acompanhar e gerenciar pedidos"
              onPress={() => navigation.navigate("Orders")}
            />
            <View style={styles.card}>
              <Text style={styles.section}>
                {shop.tipo_catalogo === "servicos"
                  ? "Seus serviços"
                  : "Seus produtos"}
              </Text>
              <Text style={styles.small}>
                Cadastre itens, edite preços e categorias e adicione fotos.
              </Text>
              <Button
                title={
                  shop.tipo_catalogo === "servicos"
                    ? "Gerenciar serviços"
                    : "Gerenciar produtos"
                }
                onPress={() => navigation.navigate("MerchantCatalog")}
              />
            </View>
            <Button
              title={
                settings ? "Fechar configurações" : "Configurações da loja"
              }
              secondary
              disabled={busy}
              onPress={() => setSettings(!settings)}
            />
            {settings && (
              <>
                {shop.tipo_catalogo !== "servicos" && (
                  <View style={styles.card}>
                    <Text style={styles.section}>Entrega e retirada</Text>
                    {(["permite_entrega", "permite_retirada"] as const).map(
                      (field) => (
                        <Button
                          key={field}
                          title={`${field === "permite_entrega" ? "Entrega" : "Retirada no local"}: ${shop[field] ? "habilitada" : "desativada"}`}
                          secondary={!shop[field]}
                          busy={busy}
                          onPress={() =>
                            void update(() =>
                              service.setFulfillment(field, !shop[field]),
                            )
                          }
                        />
                      ),
                    )}
                    {!shop.permite_entrega && !shop.permite_retirada && (
                      <Text style={styles.error}>
                        Habilite uma modalidade para receber novos pedidos.
                      </Text>
                    )}
                  </View>
                )}
                <View style={styles.card}>
                  <Text style={styles.section}>Formas de pagamento</Text>
                  {availablePayments.map(method => (
                    <Button
                      key={method}
                      title={`${shop.meios_pagamento.includes(method) ? "✓ " : ""}${paymentLabels[method]}`}
                      secondary={!shop.meios_pagamento.includes(method)}
                      busy={busy}
                      disabled={
                        shop.meios_pagamento.length === 1 &&
                        shop.meios_pagamento.includes(method)
                      }
                      onPress={() =>
                        void update(() =>
                          service.setPayments(
                            shop.meios_pagamento.includes(method)
                              ? shop.meios_pagamento.filter(
                                  (value) => value !== method,
                                )
                              : [...shop.meios_pagamento, method],
                          ),
                        )
                      }
                    />
                  ))}
                </View>
                <View style={styles.card}>
                  <Text style={styles.section}>Tipo da loja</Text>
                  <CategoryTabs
                    items={types.items}
                    selected={shop.tipo_loja ?? null}
                    disabled={busy}
                    allLabel="Sem classificação"
                    onSelect={(value) =>
                      void update(() => service.setStoreType(value))
                    }
                  />
                  {types.hasMore && (
                    <Button title="Mais tipos" secondary onPress={types.more} />
                  )}
                </View>
              </>
            )}
            <Button
              title="Ver loja pública"
              secondary
              onPress={() =>
                navigation.navigate("Shop", { id: shop.id, name: shop.nome })
              }
            />
          </>
        ) : (
          <Text style={styles.subtitle}>Carregando sua loja…</Text>
        )}
        {!!error && (
          <Notice
            message={error}
            retry={() => setAttempt((value) => value + 1)}
          />
        )}
      </ScrollView>
    </StoreThemeProvider>
  );
}
