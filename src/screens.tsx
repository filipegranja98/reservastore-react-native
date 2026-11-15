import { StoreLogo } from "./StoreLogo";
import { PasswordField } from "./PasswordField";
import {StoreContact} from "./StoreContact";
import { CategoryTabs } from "./CategoryTabs";
import { categoryPath } from "./config";
import { storeAvailability } from "./availability";
import { StoreStatus } from "./StoreStatus";
import { StoreThemeProvider } from "./themeContext";
import { shopTheme } from "./theme";
import { useBrandHeader } from "./useStoreBrand";
import { CartIcon } from "./CartIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cartQuantity } from "./cart";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "./client";
import { useSession } from "./session";
import { usePage } from "./usePage";
import { useCart } from "./useCart";
import { searchLoaded } from "./search";
import {
  Button,
  colors,
  Field,
  money,
  Notice,
  styles,
  Thumbnail,
  StoreHeading,
} from "./ui";
import type {
  Product,
  Registration,
  Shop,
  StoreType,
  ProductCategory,
} from "./types";
type ReturnTo = {
  screen: "Shop" | "Cart" | "Checkout";
  id: number;
  name: string;
};
export type Routes = {
  Shops: undefined;
  Shop: { id: number; name: string };
  Cart: { id: number; name: string };
  Checkout: { id: number; name: string };
  Order: { id: number; notice?: string };
  Orders: undefined;
  Login: { notice?: string; returnTo?: ReturnTo } | undefined;
  Register: { returnTo?: ReturnTo } | undefined;
  Account: undefined;
  MerchantCategories: undefined;
  MerchantCatalog: undefined;
  PasswordRecovery: undefined;
};
type Props<T extends keyof Routes> = NativeStackScreenProps<Routes, T>;
export function ShopsScreen({ navigation }: Props<"Shops">) {
  const [storeType, setStoreType] = useState<number | null>(null);
  const types = usePage<StoreType>("catalogo/tipos-loja/");
  const shops = usePage<Shop>(
    categoryPath("catalogo/lojas/", "tipo_loja", storeType),
  );
  const [query, setQuery] = useState("");
  const { error: sessionError, reload } = useSession();
  useFocusEffect(
    React.useCallback(() => {
      void shops.reload();
    }, [shops.reload]),
  );
  return (
    <View style={styles.screen}>
      <FlatList
        data={searchLoaded(shops.items, query)}
        numColumns={3}
        columnWrapperStyle={{ gap: 12 }}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshing={shops.busy}
        onRefresh={shops.reload}
        ListHeaderComponent={
          <View style={{ gap: 18, marginBottom: 8 }}>
            {!!sessionError && (
              <Notice message={sessionError} retry={() => void reload()} />
            )}
            <CategoryTabs
              items={types.items}
              selected={storeType}
              onSelect={setStoreType}
              allLabel="Todas as lojas"
            />
            {!!types.error && (
              <Notice message={types.error} retry={types.reload} />
            )}
            {types.hasMore && (
              <Button
                title="Mais tipos de loja"
                secondary
                busy={types.busy}
                onPress={types.more}
              />
            )}

            <Field
              label="Pesquisar lojas"
              placeholder="Nome da loja"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.nome}, ${storeAvailability(item).label}. Ver loja`}
            onPress={() => navigation.navigate("Shop", { id: item.id, name: item.nome })}
            style={({ pressed }) => ({
              width: "30.8%",
              alignItems: "center",
              gap: 10,
              paddingVertical: 14,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <StoreLogo shop={item} />
            <Text style={{ color: "#172E2A", fontSize: 15, fontWeight: "600", textAlign: "center" }}>
              {item.nome}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !shops.busy && !shops.error ? (
            <View style={styles.card}>
              <Text style={styles.section}>
                {query.trim()
                  ? "Nenhuma loja encontrada nesta busca"
                  : "Novas lojas estão a caminho"}
              </Text>
              <Text style={styles.subtitle}>
                {query.trim()
                  ? "Nenhuma correspondência entre as lojas carregadas. Limpe a pesquisa ou carregue mais lojas."
                  : "Nenhuma loja disponível no momento. Atualize para consultar novamente."}
              </Text>
            </View>
          ) : undefined
        }
        ListFooterComponent={
          <View style={{ gap: 14 }}>
            {shops.error ? (
              <Notice
                message={shops.error}
                retry={shops.hasMore ? shops.more : shops.reload}
              />
            ) : null}
            {shops.busy ? (
              <ActivityIndicator color={colors.green} />
            ) : shops.hasMore ? (
              <Button
                title="Carregar mais lojas"
                secondary
                onPress={shops.more}
              />
            ) : null}
          </View>
        }
      />
    </View>
  );
}

export function ShopScreen({ route, navigation }: Props<"Shop">) {
  const { id } = route.params;
  const session = useSession();
  const merchant = session.account?.papel === "lojista";
  const account = session.account?.papel === "cliente" ? session.account : null;
  const cart = useCart(id);
  const insets = useSafeAreaInsets();
  const [floatingHeight, setFloatingHeight] = useState(72);
  const [query, setQuery] = useState("");
  const [shop, setShop] = useState<Shop | null>(null);
  const services = shop?.tipo_catalogo === "servicos";
  const offerings = services ? "serviços" : "produtos";
  const theme = shopTheme(shop);
  const operating = storeAvailability(shop);
  useBrandHeader(theme, shop?.nome ?? route.params.name);
  const [detailError, setDetailError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [category, setCategory] = useState<number | null>(null);
  const categories = usePage<ProductCategory>(
    `catalogo/lojas/${id}/categorias/`,
  );
  const products = usePage<Product>(
    categoryPath(`catalogo/lojas/${id}/produtos/`, "categoria", category),
  );
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setLoading(true);
      setDetailError("");
      api
        .publicRequest<Shop>(`catalogo/lojas/${id}/`)
        .then((value) => {
          if (active) setShop(value);
        })
        .catch((error) => {
          if (active) {
            setShop(null);
            setDetailError(error.message);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [id, attempt]),
  );
  if (loading)
    return (
      <View style={[styles.screen, styles.content]}>
        <ActivityIndicator color={theme.actionText} />
      </View>
    );
  if (!shop)
    return (
      <View style={[styles.screen, styles.content]}>
        <Notice
          message={detailError || "Loja indisponível."}
          retry={() => setAttempt((value) => value + 1)}
        />
      </View>
    );
  return (
    <StoreThemeProvider shop={shop}>
      <View style={styles.screen}>
        <FlatList
          data={searchLoaded(products.items, query)}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: Math.max(104, floatingHeight + 36) + insets.bottom,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          refreshing={products.busy}
          onRefresh={() => {
            void products.reload();
            setAttempt((value) => value + 1);
          }}
          ListHeaderComponent={
            <View style={{ gap: 18, marginBottom: 18 }}>
              <StoreHeading name={shop.nome} logo={shop.logo} />
              <StoreStatus shop={shop} />
              {!!cart.error && (
                <Notice message={cart.error} retry={() => void cart.reload()} />
              )}
              {cart.pendingCheckout && (
                <Text style={styles.small}>
                  Há um envio aguardando confirmação. Abra o carrinho para
                  verificar.
                </Text>
              )}
              {!!cart.message && (
                <Text accessibilityLiveRegion="polite" style={styles.label}>
                  {cart.message}
                </Text>
              )}
              <Text style={styles.section}>{services ? "Serviços oferecidos" : "Produtos"}</Text>
              <CategoryTabs
                items={categories.items}
                selected={category}
                onSelect={setCategory}
                allLabel={`Todos os ${offerings}`}
              />
              {!!categories.error && (
                <Notice message={categories.error} retry={categories.reload} />
              )}
              {categories.hasMore && (
                <Button
                  title="Mais categorias"
                  secondary
                  busy={categories.busy}
                  onPress={categories.more}
                />
              )}

              <Field
                label={`Pesquisar ${offerings} nesta loja`}
                placeholder={services ? "Nome do serviço" : "Nome do produto"}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                returnKeyType="search"
              />
              <Text style={styles.small}>
                Pesquisa em {products.items.length} {offerings} carregados desta
                loja.
                {products.hasMore
                  ? ` Carregue mais ${offerings} para ampliar a busca.`
                  : ""}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, styles.row, { marginBottom: 12 }]}>
              <Thumbnail uri={item.imagem} name={item.nome} />
              <View style={{ flex: 1, gap: 7 }}>
                <Text style={styles.label}>{item.nome}</Text>
                <Text style={[styles.section, { color: theme.actionText }]}>
                  {money(item.preco)}
                </Text>
                <Button
                  title={
                    merchant
                      ? "Compras com conta de cliente"
                      : !operating.canOrder
                        ? shop.aberta === false
                          ? "Loja fechada para pedidos"
                          : "Atendimento não informado"
                        : account
                          ? `Adicionar${cart.cart?.itens.find((value) => value.produto === item.id)?.quantidade ? ` • ${cart.cart.itens.find((value) => value.produto === item.id)!.quantidade} no carrinho` : ""}`
                          : "Entrar para adicionar"
                  }
                  secondary
                  disabled={
                    merchant ||
                    !operating.canOrder ||
                    (!!account &&
                      (cart.busy || cart.needsReload || cart.pendingCheckout))
                  }
                  onPress={() =>
                    account
                      ? void cart.add(item.id)
                      : navigation.navigate("Login", {
                          notice:
                            `Entre para adicionar ${offerings}. Depois, toque em Adicionar novamente.`,
                          returnTo: { screen: "Shop", id, name: shop.nome },
                        })
                  }
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            !products.busy && !products.error ? (
              <Text style={styles.subtitle}>
                {query.trim()
                  ? `Nenhuma correspondência entre os ${offerings} carregados. Limpe a pesquisa ou carregue mais ${offerings}.`
                  : "Nenhum produto disponível nesta loja."}
              </Text>
            ) : undefined
          }
          ListFooterComponent={
            <View style={{ gap: 14 }}>
              {products.error && (
                <Notice
                  message={products.error}
                  retry={products.hasMore ? products.more : products.reload}
                />
              )}
              {products.busy ? (
                <ActivityIndicator color={theme.actionText} />
              ) : products.hasMore ? (
                <Button
                  title={`Mais ${offerings}`}
                  secondary
                  onPress={products.more}
                />
              ) : null}
              <StoreContact shop={shop} />
              <Text style={styles.small}>
                Os itens ficam no carrinho desta loja. Confira o endereço e
                revise os valores antes de confirmar o pedido.
              </Text>
            </View>
          }
        />
        {!merchant && (
          <Pressable
            onLayout={(event) =>
              setFloatingHeight(event.nativeEvent.layout.height)
            }
            accessibilityRole="button"
            accessibilityLabel={
              account
                ? `Abrir carrinho de ${shop.nome}. ${cart.busy || cart.needsReload ? "Atualizando quantidade" : `${cartQuantity(cart.cart)} itens`}`
                : "Entre para abrir o carrinho desta loja"
            }
            onPress={() =>
              account
                ? navigation.navigate("Cart", { id, name: shop.nome })
                : navigation.navigate("Login", {
                    returnTo: { screen: "Cart", id, name: shop.nome },
                  })
            }
            style={({ pressed }) => [
              styles.button,
              {
                position: "absolute",
                right: 22,
                bottom: 12 + insets.bottom,
                backgroundColor: theme.primary,
                width: 64,
                height: 64,
                padding: 0,
                borderRadius: 32,
                opacity: pressed ? 0.8 : 1,
                elevation: 5,
                boxShadow: "0 4px 14px #172e2a30",
              },
            ]}
          >
            <CartIcon color={theme.onPrimary} />
            <View
              style={{
                position: "absolute",
                top: -5,
                right: -5,
                backgroundColor: theme.secondary,
                borderColor: theme.primary,
                borderWidth: 1.5,
                borderRadius: 20,
                minWidth: 25,
                minHeight: 25,
                paddingHorizontal: 6,
                paddingVertical: 2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                maxFontSizeMultiplier={1.4}
                style={[styles.label, { color: theme.onSecondary }]}
              >
                {account && (cart.busy || cart.needsReload)
                  ? "…"
                  : cartQuantity(cart.cart)}
              </Text>
            </View>
          </Pressable>
        )}
      </View>
    </StoreThemeProvider>
  );
}
function FormLayout({ children }: React.PropsWithChildren) {
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function LoginScreen({ navigation, route }: Props<"Login">) {
  const session = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const user = await session.login(username.trim(), password);
      const target = route.params?.returnTo;
      if (user.papel === "lojista") navigation.replace("MerchantCategories");
      else if (target)
        navigation.replace(target.screen, { id: target.id, name: target.name });
      else navigation.replace("Shops");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPassword("");
      setBusy(false);
    }
  }
  return (
    <FormLayout>
      <Text style={styles.eyebrow}>SUA CONTA</Text>
      <Text style={styles.title}>Bom ter você{"\n"}por aqui.</Text>
      <Text style={styles.subtitle}>Entre para acessar sua conta.</Text>
      {route.params?.notice && (
        <View style={styles.card}>
          <Text style={styles.label}>{route.params.notice}</Text>
        </View>
      )}
      <Field
        label="Usuário"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        editable={!busy}
      />
      <PasswordField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        editable={!busy}
      />
      <Button title="Esqueci minha senha" secondary disabled={busy} onPress={()=>navigation.navigate("PasswordRecovery")} />
      {!!error && <Notice message={error} />}
      <Button
        title="Entrar"
        busy={busy}
        disabled={!username.trim() || !password}
        onPress={submit}
      />
      <Button
        title="Criar conta"
        secondary
        disabled={busy}
        onPress={() =>
          navigation.navigate("Register", { returnTo: route.params?.returnTo })
        }
      />
      <Text style={styles.small}>
        Clientes não pagam assinatura.
      </Text>
    </FormLayout>
  );
}
export function RegisterScreen({ navigation, route }: Props<"Register">) {
  const [data, setData] = useState<Registration>({
    first_name: "",
    username: "",
    email: "",
    telefone: "",
    password: "",
  });
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof Registration) => (value: string) =>
    setData((old) => ({ ...old, [key]: value }));
  async function submit() {
    if (data.password !== confirm) {
      setError("As senhas devem ser iguais.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.register({
        ...data,
        username: data.username.trim(),
        first_name: data.first_name.trim(),
        email: data.email.trim(),
        telefone: data.telefone.trim(),
      });
      setData((old) => ({ ...old, password: "" }));
      setConfirm("");
      navigation.popTo("Login", {
        notice: "Conta criada. Entre com seu usuário e senha.",
        returnTo: route.params?.returnTo,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormLayout>
      <Text style={styles.eyebrow}>COMECE AQUI</Text>
      <Text style={styles.title}>Mais perto{"\n"}do seu dia a dia.</Text>
      <Text style={styles.subtitle}>Crie sua conta gratuita de cliente.</Text>
      <Field
        label="Nome"
        value={data.first_name}
        onChangeText={update("first_name")}
        autoComplete="given-name"
        editable={!busy}
      />
      <Field
        label="Usuário"
        value={data.username}
        onChangeText={update("username")}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        editable={!busy}
      />
      <Field
        label="Email"
        value={data.email}
        onChangeText={update("email")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        editable={!busy}
      />
      <Field
        label="Telefone com DDD"
        value={data.telefone}
        onChangeText={update("telefone")}
        keyboardType="phone-pad"
        autoComplete="tel"
        editable={!busy}
      />
      <Field
        label="Senha"
        value={data.password}
        onChangeText={update("password")}
        secureTextEntry
        autoComplete="new-password"
        editable={!busy}
      />
      <Text style={styles.small}>
        Use pelo menos 8 caracteres. Evite senhas comuns ou parecidas com seus
        dados pessoais.
      </Text>
      <Field
        label="Confirmar senha"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        editable={!busy}
      />
      {!!error && <Notice message={error} />}
      <Button
        title="Criar minha conta"
        busy={busy}
        disabled={
          Object.values(data).some((value) => !value.trim()) || !confirm
        }
        onPress={submit}
      />
    </FormLayout>
  );
}
export function AccountScreen({ navigation }: Props<"Account">) {
  const { account, logout, error, reload } = useSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function exit() {
    setBusy(true);
    try {
      const revoked = await logout();
      navigation.replace("Login", {
        notice: revoked
          ? "Você saiu da sua conta."
          : "Você saiu deste aparelho. Não foi possível encerrar a sessão no servidor.",
      });
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>MINHA CONTA</Text>
      <Text style={styles.title}>
        {account
          ? `Olá, ${account.first_name || account.username}.`
          : "Sua sessão"}
      </Text>
      {account ? (
        <View style={styles.card}>
          <Text style={styles.label}>@{account.username}</Text>
          <Text style={styles.subtitle}>{account.email}</Text>
          <Text style={styles.subtitle}>{account.telefone}</Text>
          <Text style={styles.small}>
            {account.papel === "lojista"
              ? "Conta de lojista"
              : "Conta de cliente • Sem assinatura"}
          </Text>
        </View>
      ) : (
        <Notice
          message={error || "Entre para acessar sua conta."}
          retry={() => void reload()}
        />
      )}
      {!!message && <Notice message={message} />}
      {account?.papel === "lojista" && (
        <Button
          title="Painel da loja"
          secondary
          onPress={() => navigation.navigate("MerchantCategories")}
        />
      )}
      {account && (
        <Button
          title={account.papel === "lojista" ? "Pedidos da loja" : "Meus pedidos"}
          secondary
          onPress={() => navigation.navigate("Orders")}
        />
      )}
      <Button
        title="Explorar lojas"
        secondary
        onPress={() => navigation.navigate("Shops")}
      />
      {account ? (
        <Button title="Sair da conta" busy={busy} onPress={exit} />
      ) : (
        <>
          <Button title="Entrar" onPress={() => navigation.replace("Login")} />
          <Button
            title="Apagar sessão deste aparelho"
            secondary
            busy={busy}
            onPress={exit}
          />
        </>
      )}
    </ScrollView>
  );
}
