import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import type { Routes } from "./screens";
import { api, mediaUri } from "./client";
import { useSession } from "./session";
import { usePage } from "./usePage";
import { MerchantCatalog } from "./merchant";
import type { Product, ProductCategory, Shop } from "./types";
import { StoreThemeProvider } from "./themeContext";
import { useBrandHeader } from "./useStoreBrand";
import { shopTheme } from "./theme";
import { searchLoaded } from "./search";
import {
  Button,
  colors,
  Field,
  money,
  Notice,
  StoreHeading,
  styles,
  Thumbnail,
} from "./ui";
type Props = NativeStackScreenProps<Routes, "MerchantCatalog">;
type Photo = { uri: string; type: string; name: string; file?: Blob };
export function MerchantCatalogScreen(props: Props) {
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
  return <CatalogContent key={account.id} {...props} />;
}
function CatalogContent({ navigation }: Props) {
  const [shop, setShop] = useState<Shop | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [query, setQuery] = useState("");
  const [open, setOpen] = useState(false),
 [editing, setEditing] = useState<Product | null>(null),
    [name, setName] = useState(""),
    [price, setPrice] = useState(""),
    [category, setCategory] = useState<number | null>(null),
    [active, setActive] = useState(true),
    [photo, setPhoto] = useState<Photo | null | undefined>(),
    [categoryName, setCategoryName] = useState(""),
    [busy, setBusy] = useState(false);
  const [savedItems, setSavedItems] = useState<Product[]>([]),
    [savedCategories, setSavedCategories] = useState<ProductCategory[]>([]);
  const alive = useRef(false),
    lock = useRef(false);
  const products = usePage<Product>("produtos/", true),
    categories = usePage<ProductCategory>("categorias/", true);
  const allCategories = [
    ...savedCategories,
    ...categories.items.filter(
      (item) => !savedCategories.some((value) => value.id === item.id),
    ),
  ];
  const allProducts = [
    ...savedItems,
    ...products.items.filter(
      (item) => !savedItems.some((value) => value.id === item.id),
    ),
  ];
  const services = shop?.tipo_catalogo === "servicos",
    singular = services ? "serviço" : "produto",
    plural = services ? "serviços" : "produtos";
  useBrandHeader(
    shopTheme(shop),
    services ? "Gerenciar serviços" : "Gerenciar produtos",
  );
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      api
        .request<Shop>("lojas/minha_loja/")
        .then((value) => {
          if (alive.current) setShop(value);
        })
        .catch((e) => {
          if (alive.current) setError(e.message);
        });
      void products.reload();
      void categories.reload();
      return () => {
        alive.current = false;
      };
    }, [products.reload, categories.reload]),
  );
  const catalog = useMemo(
    () =>
      shop
        ? new MerchantCatalog(api, shop.id, () => {
            if (!alive.current) throw Error("A sessão mudou.");
          })
        : null,
    [shop?.id],
  );
  function edit(product: Product | null) {
    setEditing(product);
    setName(product?.nome ?? "");
    setPrice(product?.preco.replace(".", ",") ?? "");
    setCategory(product?.categoria ?? null);
    setActive(product?.ativo !== false);
    setPhoto(undefined);
    setError("");
    setMessage("");
    setCategoryName("");
    setOpen(true);
  }
  async function run(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function save() {
    if (!catalog || category === null) return;
    await run(async () => {
      const item = await catalog.saveItem(
        { nome: name, categoria: category, preco: price, ativo: active },
        editing?.id,
        photo,
      );
      setSavedItems((old) => [
        item,
        ...old.filter((value) => value.id !== item.id),
      ]);
      setOpen(false);
      setMessage(`${services ? "Serviço" : "Produto"} salvo na sua loja.`);
      await products.reload();
    });
  }
  async function createCategory() {
    if (!catalog) return;
    await run(async () => {
      const item = await catalog.createCategory(categoryName);
      setSavedCategories((old) => [item, ...old]);
      setCategory(item.id);
      setCategoryName("");
      await categories.reload();
    });
  }
  async function choosePhoto() {
    await run(async () => {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted)
          throw Error(
            "Permita acesso às fotos para escolher a imagem do produto.",
          );
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.8,
        exif: false,
      });
      if (result.canceled) return;
      if (!alive.current) return;
      const asset = result.assets[0],
        type = asset.mimeType ?? "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp"].includes(type))
        throw Error("Escolha uma imagem JPG, PNG ou WebP.");
      if ((asset.fileSize ?? asset.file?.size ?? 0) > 5 * 1024 * 1024)
        throw Error("A imagem deve ter no máximo 5 MB.");
      setPhoto({
        uri: asset.uri,
        type,
        name: `produto.${type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg"}`,
        file: asset.file,
      });
    });
  }
  const preview =
    photo?.uri ?? (photo === null ? null : mediaUri(editing?.imagem ?? null));
  return (
    <StoreThemeProvider shop={shop}>
      <View style={styles.screen}>
        <FlatList
          data={shop ? searchLoaded(allProducts, query) : []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          refreshing={products.busy}
          onRefresh={() => {
            setSavedItems([]);
            void products.reload();
            void categories.reload();
          }}
          ListHeaderComponent={
            <View style={{ gap: 14, marginBottom: 12 }}>
              <Text style={styles.eyebrow}>CATÁLOGO DA SUA LOJA</Text>
              {shop ? (
                <StoreHeading name={shop.nome} logo={shop.logo} />
              ) : (
                <ActivityIndicator color={colors.green} />
              )}
              <Button
                title={`Adicionar ${singular}`}
                disabled={!shop}
                onPress={() => edit(null)}
              />
              <Field
                label={`Buscar ${plural}`}
                placeholder="Nome do item"
                value={query}
                onChangeText={setQuery}
              />
              <Text style={styles.small}>
                {allProducts.length} {plural} carregados. Edite preço,
                categoria, foto e disponibilidade.
              </Text>
              {!!message && (
                <Text accessibilityLiveRegion="polite" style={styles.label}>
                  {message}
                </Text>
              )}
              {!!error && !open && <Notice message={error} />}
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { marginBottom: 12 }]}>
              <View style={styles.row}>
                <Thumbnail uri={item.imagem} name={item.nome} />
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={styles.section}>{item.nome}</Text>
                  <Text style={styles.label}>
                    {money(item.preco)} •{" "}
                    {item.ativo === false ? "Oculto no catálogo" : "Disponível"}
                  </Text>
                  <Text style={styles.small}>
                    {allCategories.find((value) => value.id === item.categoria)
                      ?.nome ?? "Categoria cadastrada"}
                  </Text>
                </View>
              </View>
              <Button
                title={`Editar ${singular}`}
                secondary
                onPress={() => edit(item)}
              />
            </View>
          )}
          ListEmptyComponent={
            !products.busy && !products.error && shop ? (
              <Text style={styles.subtitle}>
                {query
                  ? "Nenhum item encontrado nos itens carregados."
                  : `Cadastre seu primeiro ${singular} pelo botão acima.`}
              </Text>
            ) : undefined
          }
          ListFooterComponent={
            <View style={{ gap: 14 }}>
              {!!products.error && (
                <Notice message={products.error} retry={products.reload} />
              )}
              {products.hasMore && (
                <Button
                  title={`Carregar mais ${plural}`}
                  secondary
                  busy={products.busy}
                  onPress={products.more}
                />
              )}
              <Button
                title="Voltar ao painel da loja"
                secondary
                onPress={() => navigation.navigate("MerchantCategories")}
              />
            </View>
          }
        />
        <Modal
          visible={open}
          animationType="slide"
          onRequestClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.content}
              >
                <Text style={styles.eyebrow}>
                  {editing ? "EDITAR" : "ADICIONAR"} {plural.toUpperCase()}
                </Text>
                <Text style={styles.title}>
                  {editing ? `Editar ${singular}` : `Novo ${singular}`}
                </Text>
                {preview && (
                  <Image
                    source={{ uri: preview }}
                    resizeMode="contain"
                    style={{
                      height: 200,
                      width: "100%",
                      borderRadius: 16,
                      backgroundColor: "white",
                    }}
                  />
                )}
                <Button
                  title={preview ? "Trocar imagem" : "Adicionar imagem"}
                  secondary
                  busy={busy}
                  onPress={() => void choosePhoto()}
                />
                {preview && (
                  <Button
                    title="Remover imagem deste item"
                    secondary
                    disabled={busy}
                    onPress={() => setPhoto(null)}
                  />
                )}
                <Text style={styles.small}>
                  JPG, PNG ou WebP • até 5 MB. A foto será enviada ao salvar.
                </Text>
                <Field
                  label={`Nome do ${singular}`}
                  value={name}
                  maxLength={255}
                  editable={!busy}
                  onChangeText={setName}
                />
                <Field
                  label="Preço por unidade (R$)"
                  value={price}
                  placeholder="Ex.: 15,00"
                  keyboardType="decimal-pad"
                  editable={!busy}
                  onChangeText={setPrice}
                />
                <Text style={styles.section}>Categoria</Text>
                {allCategories.map((item) => (
                  <Button
                    key={item.id}
                    title={`${category === item.id ? "✓ " : ""}${item.nome}`}
                    secondary={category !== item.id}
                    disabled={busy}
                    onPress={() => setCategory(item.id)}
                  />
                ))}
                {categories.hasMore && (
                  <Button
                    title="Carregar mais categorias"
                    secondary
                    busy={categories.busy}
                    disabled={busy}
                    onPress={categories.more}
                  />
                )}
                {!!categories.error && (
                  <Notice
                    message={categories.error}
                    retry={categories.reload}
                  />
                )}
                <View style={styles.card}>
                  <Field
                    label="Criar categoria"
                    placeholder={
                      services ? "Ex.: Limpeza de estofados" : "Ex.: Bebidas"
                    }
                    value={categoryName}
                    maxLength={100}
                    editable={!busy}
                    onChangeText={setCategoryName}
                  />
                  <Button
                    title="Criar e selecionar categoria"
                    secondary
                    busy={busy}
                    disabled={!categoryName.trim()}
                    onPress={() => void createCategory()}
                  />
                </View>
                <Button
                  title={
                    active
                      ? "✓ Disponível no catálogo"
                      : "Oculto no catálogo • toque para disponibilizar"
                  }
                  secondary={!active}
                  disabled={busy}
                  onPress={() => setActive(!active)}
                />
                <Text style={styles.small}>
                  Itens ocultos não aparecem para novas compras. Pedidos
                  anteriores são preservados.
                </Text>
                {!!error && <Notice message={error} />}
                <Button
                  title={
                    editing ? "Salvar alterações" : `Cadastrar ${singular}`
                  }
                  busy={busy}
                  disabled={!name.trim() || !price.trim() || category === null}
                  onPress={() => void save()}
                />
                <Button
                  title="Cancelar"
                  secondary
                  disabled={busy}
                  onPress={() => setOpen(false)}
                />
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </View>
    </StoreThemeProvider>
  );
}
