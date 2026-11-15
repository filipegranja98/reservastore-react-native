import { storeAvailability } from "./availability";
import { StoreStatus } from "./StoreStatus";
import type { Shop } from "./types";
import { StoreThemeProvider } from "./themeContext";
import { useStoreBrand, useBrandHeader } from "./useStoreBrand";
import React from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Routes } from "./screens";
import { useSession } from "./session";
import { useCart } from "./useCart";
import { Button, colors, money, Notice, styles, StoreHeading } from "./ui";
export function CartScreen(props: NativeStackScreenProps<Routes, "Cart">) {
  const { shop, theme } = useStoreBrand(props.route.params.id);
  useBrandHeader(theme, "Carrinho da loja");
  return (
    <StoreThemeProvider shop={shop}>
      <CartContent {...props} logo={shop?.logo ?? null} shop={shop} />
    </StoreThemeProvider>
  );
}
function CartContent({
  route,
  navigation,
  logo,
  shop,
}: NativeStackScreenProps<Routes, "Cart"> & {
  logo: string | null;
  shop: Shop | null;
}) {
  const { id, name } = route.params;
  const { account } = useSession();
  const cart = useCart(id);
  const operating = storeAvailability(shop);
  if (!account)
    return (
      <View style={[styles.screen, styles.content]}>
        <Text style={styles.title}>Seu carrinho</Text>
        <Text style={styles.subtitle}>
          Entre na sua conta para consultar o carrinho de {name}.
        </Text>
        <Button
          title="Entrar"
          onPress={() =>
            navigation.replace("Login", {
              returnTo: { screen: "Cart", id, name },
            })
          }
        />
      </View>
    );
  const disabled = cart.busy || cart.needsReload || cart.pendingCheckout;
  return (
    <View style={styles.screen}>
      <FlatList
        data={cart.cart?.itens ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        refreshing={cart.busy}
        onRefresh={() => void cart.reload()}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 16 }}>
            <Text style={styles.eyebrow}>1 DE 3 • SEUS ITENS</Text>
            <StoreHeading name={name} logo={logo} />
            <StoreStatus shop={shop} />
            <Text style={styles.small}>
              Seus carrinhos de outras lojas são mantidos separadamente.
            </Text>
            {!!cart.error && (
              <Notice
                message={`${cart.error}\nAtualize o carrinho para confirmar os itens antes de continuar.`}
                retry={() => void cart.reload()}
              />
            )}
            {cart.pendingCheckout && (
              <Text style={styles.small}>
                Existe um envio aguardando confirmação. Verifique a finalização
                antes de alterar os itens.
              </Text>
            )}
            {!!cart.message && (
              <Text accessibilityLiveRegion="polite" style={styles.label}>
                {cart.message}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { marginBottom: 12 }]}>
            <Text style={styles.section}>{item.nome}</Text>
            <Text style={styles.small}>
              {money(item.preco_unitario)} por unidade
            </Text>
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Button
                title="− 1"
                secondary
                disabled={
                  disabled || !operating.canOrder || item.quantidade <= 1
                }
                onPress={() => void cart.adjust(item.id, -1)}
              />
              <Text
                accessibilityLabel={`Quantidade de ${item.nome}: ${item.quantidade}`}
                style={styles.section}
              >
                {item.quantidade}
              </Text>
              <Button
                title="+ 1"
                secondary
                disabled={
                  disabled || !operating.canOrder || item.quantidade >= 99
                }
                onPress={() => void cart.adjust(item.id, 1)}
              />
            </View>
            <Text style={styles.label}>Total do item: {money(item.total)}</Text>
            <Button
              title="Remover item"
              secondary
              disabled={disabled}
              onPress={() => void cart.remove(item.id)}
            />
          </View>
        )}
        ListEmptyComponent={
          cart.busy ? (
            <ActivityIndicator color={colors.green} />
          ) : cart.cart && !cart.error ? (
            <View style={styles.card}>
              <Text style={styles.section}>Seu carrinho está vazio</Text>
              <Text style={styles.subtitle}>
                Escolha produtos no catálogo desta loja.
              </Text>
            </View>
          ) : undefined
        }
        ListFooterComponent={
          <View style={{ gap: 16, marginTop: 10 }}>
            {cart.cart && !cart.cart.itens.length ? null : cart.cart ? (
              <View style={styles.card}>
                <Text style={styles.label}>
                  Subtotal dos itens
                  {cart.needsReload ? " • atualização necessária" : ""}
                </Text>
                <Text style={styles.section}>{money(cart.cart.subtotal)}</Text>
                <Text style={styles.small}>
                  {shop?.tipo_catalogo === "servicos" ? "O atendimento será conferido na próxima etapa." : "Na próxima etapa, escolha entrega ou retirada. Retirada sem taxa de entrega."}
                </Text>
              </View>
            ) : null}
            {(!!cart.cart?.itens.length || cart.pendingCheckout) && (
              <Button
                title={
                  cart.pendingCheckout
                    ? "Verificar envio do pedido"
                    : shop?.tipo_catalogo === "servicos" ? "Continuar pedido" : "Escolher entrega ou retirada"
                }
                disabled={
                  cart.pendingCheckout
                    ? cart.busy
                    : disabled || !operating.canOrder
                }
                onPress={() => navigation.navigate("Checkout", { id, name })}
              />
            )}
            <Button
              title="Continuar escolhendo nesta loja"
              secondary
              onPress={() => navigation.navigate("Shop", { id, name })}
            />
            <Text style={styles.small}>
              O carrinho está salvo na sua conta. Para finalizar, informe o
              endereço e revise a entrega. O pagamento é feito diretamente à
              loja.
            </Text>
          </View>
        }
      />
    </View>
  );
}
