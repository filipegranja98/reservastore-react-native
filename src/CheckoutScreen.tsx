import { orderWhatsAppLink, orderWhatsAppMessage } from "./whatsappMessages";
import { reservaCondominiums } from "./condominiums";
import { CondominiumPicker } from "./CondominiumPicker";
import { storeAvailability } from "./availability";
import { StoreStatus } from "./StoreStatus";
import { StoreThemeProvider } from "./themeContext";
import { shopTheme } from "./theme";
import { useBrandHeader } from "./useStoreBrand";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Routes } from "./screens";
import { useSession } from "./session";
import { usePage } from "./usePage";
import { api } from "./client";
import {
  CheckoutFlow,
  checkoutPayload,
  matchingAreas,
  paymentLabels,
  availablePayments,
  parseCashAmount,
  type PendingCheckout,
} from "./checkout";
import { checkoutVault } from "./checkoutVault";
import * as Crypto from "expo-crypto";
import type {
  Account,
  Address,
  AddressInput,
  CheckoutPayload,
  CheckoutPreview,
  DeliveryArea,
  Shop,
} from "./types";
import {
  Button,
  colors,
  Field,
  money,
  Notice,
  styles,
  StoreHeading,
} from "./ui";
type Props = NativeStackScreenProps<Routes, "Checkout">;
export function CheckoutScreen(props: Props) {
  const { account } = useSession();
  if (!account)
    return (
      <View style={[styles.screen, styles.content]}>
        <Text style={styles.title}>Entre para finalizar</Text>
        <Button
          title="Entrar"
          onPress={() =>
            props.navigation.replace("Login", {
              returnTo: { screen: "Checkout", ...props.route.params },
            })
          }
        />
      </View>
    );
  return (
    <CheckoutContent
      key={`${account.id}:${props.route.params.id}`}
      {...props}
      account={account}
    />
  );
}
function CheckoutContent({
  route,
  navigation,
  account,
}: Props & { account: Account }) {
  const { id, name } = route.params;
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const flow = useMemo(
    () =>
      new CheckoutFlow(
        api,
        checkoutVault(account.id, id),
        () => Crypto.randomUUID(),
        `${account.id}:${id}`,
        () => {
          if (!alive.current) throw Error("A sessão ou a tela mudou.");
        },
      ),
    [account.id, id],
  );
  const addresses = usePage<Address>("enderecos/", true);
  const areas = usePage<DeliveryArea>(`catalogo/lojas/${id}/areas-entrega/`);
  const [shop, setShop] = useState<Shop | null>(null);
  useBrandHeader(shopTheme(shop), "Finalizar pedido");
  const operating = storeAvailability(shop);
  const [shopError, setShopError] = useState("");
  const [shopAttempt, setShopAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setShopError("");
    api
      .publicRequest<Shop>(`catalogo/lojas/${id}/`)
      .then((value) => {
        if (active) {
          setShop(value);
          setPayment(value.meios_pagamento[0] ?? "");
        }
      })
      .catch((e) => {
        if (active) setShopError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, shopAttempt]);
  const [extra, setExtra] = useState<Address[]>([]);
  const allAddresses = [
    ...extra,
    ...addresses.items.filter(
      (value) => !extra.some((item) => item.id === value.id),
    ),
  ];
  const [addressId, setAddressId] = useState<number | null>(null);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [payment, setPayment] = useState("");
  const [needsChange,setNeedsChange] = useState<boolean|null>(null);
  const [changeFor,setChangeFor] = useState("");
  const [mode, setMode] = useState<"entrega" | "retirada">("entrega");
  const deliveryAllowed = shop?.permite_entrega !== false;
  const pickupAllowed = shop?.tipo_catalogo !== "servicos" && shop?.permite_retirada === true;
  const pickup = mode === "retirada" && pickupAllowed;
  const modeAllowed = mode === "entrega" ? deliveryAllowed : pickupAllowed;

  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<AddressInput>({
    condominio: "",
    bloco: "",
    apartamento: "",
    destinatario: account.first_name,
    telefone: account.telefone,
    complemento: "",
  });
  const [form, setForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<number | null>(null);
  const [review, setReview] = useState<{
    payload: CheckoutPayload;
    preview: CheckoutPreview;
  } | null>(null);
  const [pending, setPending] = useState<PendingCheckout | null>(null);
  const [pendingReady, setPendingReady] = useState(false);
  const [pendingError, setPendingError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function readPending() {
    setPendingReady(false);
    setPendingError("");
    try {
      const value = await flow.pending();
      if (alive.current) {
        setPending(value);
        setPendingReady(true);
      }
    } catch (e) {
      if (alive.current) setPendingError((e as Error).message);
    }
  }
  useEffect(() => {
    void readPending();
  }, [flow]);
  const address = allAddresses.find((value) => value.id === addressId);
  const compatible = matchingAreas(address, areas.items);
  useEffect(() => {
    if (
      compatible.length === 1 &&
      !compatible.some((value) => value.id === areaId)
    )
      setAreaId(compatible[0].id);
  }, [addressId, address?.condominio, areaId, areas.items]);
  const locked = busy || !!pending || !pendingReady;
  useEffect(() => {
    if (!shop || locked) return;
    if (mode === "entrega" && !deliveryAllowed && pickupAllowed) setMode("retirada");
    if (mode === "retirada" && !pickupAllowed && deliveryAllowed) setMode("entrega");
  }, [shop, mode, deliveryAllowed, pickupAllowed, locked]);
  function changeAddress(value: number) {
    setAddressId(value);
    setAreaId(null);
    setReview(null);
    setError("");
  }
  async function run(operation: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (e) {
      if (alive.current) {
        setError((e as Error).message);
        setReview(null);
        try {
          const value = await flow.pending();
          if (alive.current) setPending(value);
        } catch {
          if (alive.current) {
            setPendingReady(false);
            setPendingError("Não foi possível verificar a tentativa salva.");
          }
        }
      }
    } finally {
      if (alive.current) setBusy(false);
      lock.current = false;
    }
  }
  function payload() {
    return checkoutPayload({
      loja: id,
      modalidade: pickup ? "retirada" : "entrega",
      endereco: pickup ? undefined : addressId ?? 0,
      area_entrega: pickup ? undefined : areaId ?? 0,
      ...(payment === "dinheiro" ? {precisa_troco:needsChange === true,troco_para:needsChange ? parseCashAmount(changeFor) : null} : {}),
      meio_pagamento: payment,
      observacoes: notes,
    });
  }
  function editAddress(value: Address) {
    const normalized = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/^condominio\s+/, "").trim();
    const condo = reservaCondominiums.find(name => normalized(name) === normalized(value.condominio)) ?? "";
    setDraft({condominio:condo,bloco:value.bloco,apartamento:value.apartamento,destinatario:value.destinatario,telefone:value.telefone,complemento:value.complemento});
    setEditingAddress(value.id); setForm(true); setReview(null); setError("");
  }
  async function saveAddress() {
    await run(async () => {
      const body = Object.fromEntries(
        Object.entries(draft).map(([key, value]) => [key, value.trim()]),
      ) as unknown as AddressInput;
      if (!reservaCondominiums.some(name => name === body.condominio)) throw Error("Selecione um condomínio da lista.");
      const saved = await flow.address(body, editingAddress ?? undefined);
      setExtra((old) => [saved, ...old.filter(value => value.id !== saved.id)]);
      changeAddress(saved.id);
      setEditingAddress(null);
      setForm(false);
    });
  }
  async function preview() {
    await run(async () => {
      const body = payload();
      const value = await flow.preview(body);
      setReview({ payload: body, preview: value });
    });
  }
  async function confirm(body: CheckoutPayload) {
    await run(async () => {
      const order = await flow.confirm(body);
      if (!alive.current) return;
      const url = orderWhatsAppLink(shop?.whatsapp, orderWhatsAppMessage(order, false));
      let notice = url ? undefined : "Pedido registrado. A loja não informou um WhatsApp válido; acompanhe seu pedido aqui no app.";
      navigation.replace("Order", { id: order.id, notice });
      if (url) {
        try {
          if (Platform.OS === "web") window.location.assign(url);
          else await Linking.openURL(url);
        } catch {
          navigation.replace("Order", { id: order.id, notice: "Pedido registrado. Não foi possível abrir o WhatsApp. Use o botão abaixo para tentar novamente." });
        }
      }
    });
  }
  const showForm =
    form || (!addresses.busy && !addresses.error && allAddresses.length === 0);
  return (
    <StoreThemeProvider shop={shop}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <Text style={styles.eyebrow}>2 DE 3 • RECEBIMENTO E PAGAMENTO</Text>
          <StoreHeading name={name} logo={shop?.logo ?? null} />
          <StoreStatus shop={shop} />
          {!!error && <Notice message={error} />}
          {!!pendingError && (
            <Notice message={pendingError} retry={() => void readPending()} />
          )}
          {!pendingReady && !pendingError && (
            <ActivityIndicator color={colors.green} />
          )}
          {pending ? (
            <View style={styles.card}>
              <Text style={styles.section}>Verificar envio anterior</Text>
              <Text style={styles.subtitle}>
                Existe uma confirmação ainda não verificada. Vamos consultar
                novamente o mesmo envio para evitar um pedido duplicado.
              </Text>
              <Button
                title="Verificar envio do pedido"
                busy={busy}
                onPress={() => void confirm(pending.payload)}
              />
              <Button
                title="Consultar meus pedidos"
                secondary
                disabled={busy}
                onPress={() => navigation.navigate("Orders")}
              />
            </View>
          ) : (
            <>
              {shop && shop.tipo_catalogo !== "servicos" && <View style={styles.card}>
                <Text style={styles.section}>Como deseja receber?</Text>
                {deliveryAllowed && <Button title={`${mode === "entrega" ? "✓ " : ""}Receber por entrega`} selected={mode === "entrega"} disabled={locked} onPress={() => {setMode("entrega");setReview(null);}} />}
                {pickupAllowed && <Button title={`${pickup ? "✓ " : ""}Retirar na loja • sem taxa de entrega`} selected={pickup} disabled={locked} onPress={() => {setMode("retirada");setReview(null);}} />}
              </View>}
              {!modeAllowed && <Text style={styles.error}>A loja não oferece esta modalidade no momento. Atualize a tela ou entre em contato com a loja.</Text>}
              {pickup ? <View style={styles.card}><Text style={styles.section}>Retirada na loja</Text><Text style={styles.small}>Você vai buscar os itens na loja. Não é necessário endereço de entrega. Aguarde a loja confirmar que o pedido está pronto e combine o ponto de retirada pelo contato da loja.</Text></View> : <>
              <Text style={styles.section}>1. Endereço de entrega</Text>
              <Text style={styles.small}>
                Para pedir no Reserva São Lourenço, selecione seu condomínio e informe bloco, apartamento e contato de quem recebe. O endereço é obrigatório e fica salvo para os próximos pedidos.
              </Text>
              {addresses.items.length === 0 && addresses.busy && (
                <ActivityIndicator color={colors.green} />
              )}
              {!!addresses.error && (
                <Notice
                  message={addresses.error}
                  retry={() => void addresses.reload()}
                />
              )}
              {allAddresses.map((value) => (
                <View key={value.id} style={styles.card}>
                  <Button
                    selected={addressId === value.id}
                    title={`${addressId === value.id ? "✓ " : ""}${value.condominio} • Bloco ${value.bloco} • Apto ${value.apartamento}`}
                    disabled={locked}
                    onPress={() => changeAddress(value.id)}
                  />
                  <Text style={styles.small}>
                    {value.destinatario} • {value.telefone}
                    {value.complemento ? ` • ${value.complemento}` : ""}
                  </Text>
                  <Button title="Editar endereço" secondary disabled={locked} onPress={() => editAddress(value)} />
                </View>
              ))}
              {addresses.hasMore && (
                <Button
                  title="Carregar mais endereços"
                  secondary
                  busy={addresses.busy}
                  disabled={locked}
                  onPress={() => void addresses.more()}
                />
              )}
              {!showForm && (
                <Button
                  title="Selecionar condomínio e cadastrar endereço"
                  secondary
                  disabled={locked}
                  onPress={() => {
                    setEditingAddress(null);
                    setDraft({condominio:"",bloco:"",apartamento:"",destinatario:account.first_name,telefone:account.telefone,complemento:""});
                    setForm(true);
                    setReview(null);
                  }}
                />
              )}
              {showForm && (
                <View style={styles.card} onLayout={event => { if (form) scroll.current?.scrollTo({y:event.nativeEvent.layout.y,animated:true}); }}>
                  <Text style={styles.section}>{editingAddress ? "Editar endereço" : "Seu endereço no Reserva São Lourenço"}</Text>
                  <Text style={styles.small}>São Lourenço da Mata • PE. Selecione seu condomínio e complete os dados abaixo.</Text>
                  <CondominiumPicker value={draft.condominio} disabled={locked} onChange={value => setDraft(old => ({...old,condominio:value}))} />
                  <Text style={styles.small}>A disponibilidade e a taxa de entrega para seu condomínio serão conferidas antes de enviar o pedido.</Text>
                  <Field
                    label="Bloco / torre"
                    placeholder="Informe seu bloco ou torre"
                    maxLength={40}
                    value={draft.bloco}
                    editable={!locked}
                    onChangeText={(value) =>
                      setDraft((old) => ({ ...old, bloco: value }))
                    }
                  />
                  <Field
                    label="Apartamento"
                    placeholder="Informe o número do apartamento"
                    maxLength={40}
                    value={draft.apartamento}
                    editable={!locked}
                    onChangeText={(value) =>
                      setDraft((old) => ({ ...old, apartamento: value }))
                    }
                  />
                  <Field
                    label="Nome de quem recebe"
                    maxLength={150}
                    value={draft.destinatario}
                    editable={!locked}
                    onChangeText={(value) =>
                      setDraft((old) => ({ ...old, destinatario: value }))
                    }
                  />
                  <Field
                    label="Telefone com DDD"
                    maxLength={20}
                    keyboardType="phone-pad"
                    value={draft.telefone}
                    editable={!locked}
                    onChangeText={(value) =>
                      setDraft((old) => ({ ...old, telefone: value }))
                    }
                  />
                  <Field
                    label="Referência para entrega (opcional)"
                    placeholder="Ex.: entrada ou orientação para encontrar o bloco"
                    maxLength={300}
                    value={draft.complemento}
                    editable={!locked}
                    onChangeText={(value) =>
                      setDraft((old) => ({ ...old, complemento: value }))
                    }
                  />
                  <Button
                    title={editingAddress ? "Salvar alterações do endereço" : "Salvar endereço"}
                    busy={busy}
                    disabled={
                      locked ||
                      [
                        draft.condominio,
                        draft.bloco,
                        draft.apartamento,
                        draft.destinatario,
                        draft.telefone,
                      ].some((value) => !value.trim())
                    }
                    onPress={() => void saveAddress()}
                  />
                  {!!allAddresses.length && (
                    <Button
                      title={editingAddress ? "Cancelar edição" : "Usar endereço já cadastrado"}
                      secondary
                      disabled={locked}
                      onPress={() => {setForm(false);setEditingAddress(null);}}
                    />
                  )}
                </View>
              )}
              <Text style={styles.section}>2. Entrega desta loja</Text>
              {areas.busy && <ActivityIndicator color={colors.green} />}
              {!!areas.error && (
                <Notice
                  message={areas.error}
                  retry={() => void areas.reload()}
                />
              )}
              {compatible.map((area) => (
                <Button
                  key={area.id}
                  title={`${areaId === area.id ? "✓ " : ""}${area.condominio} • ${money(area.taxa)}`}
                  selected={areaId === area.id}
                  disabled={locked}
                  onPress={() => {
                    setAreaId(area.id);
                    setReview(null);
                  }}
                />
              ))}
              {address && !areas.busy && !compatible.length && (
                <Text style={styles.error}>
                  Não encontramos entrega para esse condomínio nas áreas
                  carregadas. Carregue mais áreas ou selecione outro endereço.
                </Text>
              )}
              {areas.hasMore && (
                <Button
                  title="Carregar mais áreas de entrega"
                  secondary
                  busy={areas.busy}
                  disabled={locked}
                  onPress={() => void areas.more()}
                />
              )}
              {!areas.busy && !areas.items.length && !areas.error && (
                <Text style={styles.error}>
                  A loja ainda não tem áreas de entrega disponíveis.
                </Text>
              )}
              </>}
              <Text style={styles.section}>Pagamento direto à loja</Text>
              {!!shopError && (
                <Notice
                  message={shopError}
                  retry={() => setShopAttempt((value) => value + 1)}
                />
              )}
              {!shop && !shopError && (
                <ActivityIndicator color={colors.green} />
              )}
              {shop?.meios_pagamento.filter(value => (availablePayments as readonly string[]).includes(value)).map((value) => (
                <Button
                  key={value}
                  title={`${payment === value ? "✓ " : ""}${paymentLabels[value] ?? value}`}
                  selected={payment === value}
                  disabled={locked}
                  onPress={() => {
                    setPayment(value);
                    setReview(null);
                  }}
                />
              ))}
              {payment === "dinheiro" && <View style={styles.card}>
                <Text style={styles.section}>Vai precisar de troco?</Text>
                <Button title={`${needsChange === false ? "✓ " : ""}Não preciso de troco`} selected={needsChange === false} disabled={locked} onPress={() => {setNeedsChange(false);setReview(null);}} />
                <Button title={`${needsChange === true ? "✓ " : ""}Sim, preciso de troco`} selected={needsChange === true} disabled={locked} onPress={() => {setNeedsChange(true);setReview(null);}} />
                {needsChange && <Field label="Troco para quanto? (R$)" placeholder="Ex.: 100,00" keyboardType="decimal-pad" value={changeFor} editable={!locked} onChangeText={value => {setChangeFor(value);setReview(null);}} />}
                <Text style={styles.small}>Informe o valor em dinheiro que você vai entregar, incluindo a taxa de entrega.</Text>
              </View>}
              <Text style={styles.small}>
                O aplicativo não processa pagamentos. O acerto é feito
                diretamente com a loja pelo meio escolhido.
              </Text>
              <Field
                label="Observações para a loja (opcional)"
                multiline
                maxLength={1000}
                value={notes}
                editable={!locked}
                onChangeText={(value) => {
                  setNotes(value);
                  setReview(null);
                }}
              />
              <Button
                title="Revisar pedido"
                busy={busy}
                disabled={
                  locked ||
                  !modeAllowed ||
                  (!pickup && showForm) ||
                  !shop ||
                  !!shopError ||
                  !operating.canOrder ||
                  (!pickup && (!address || !compatible.some((value) => value.id === areaId))) ||
                  !payment || (payment === "dinheiro" && (needsChange === null || (needsChange && !changeFor.trim())))
                }
                onPress={() => void preview()}
              />
              {review && (
                <View style={styles.card}>
                  <Text style={styles.section}>3 de 3 • Confira antes de enviar</Text>
                  {review.preview.itens.map((item) => (
                    <View key={item.produto} style={{ gap: 4 }}>
                      <Text style={styles.label}>
                        {item.quantidade} × {item.nome}
                      </Text>
                      <Text style={styles.small}>
                        {money(item.preco_unitario)} por unidade •{" "}
                        {money(item.total)}
                      </Text>
                    </View>
                  ))}
                  {review.preview.endereco ? <Text style={styles.small}>
                    {review.preview.endereco.condominio} • Bloco{" "}
                    {review.preview.endereco.bloco} • Apto{" "}
                    {review.preview.endereco.apartamento}
                  </Text> : <Text style={styles.label}>Retirada na loja • sem entrega</Text>}
                  <Text style={styles.label}>
                    Itens: {money(review.preview.subtotal)}
                  </Text>
                  <Text style={styles.label}>
                    {review.preview.modalidade === "retirada" ? "Taxa de entrega na retirada" : "Entrega"}: {money(review.preview.taxa_entrega)}
                  </Text>
                  <Text style={styles.section}>
                    Total: {money(review.preview.total)}
                  </Text>
                  <Text style={styles.small}>
                    {review.preview.prazo_estimado_minutos === null
                      ? review.preview.modalidade === "retirada" ? "Aguarde a loja informar que está pronto para retirar." : "Prazo não informado pela loja"
                      : `Prazo estimado pela loja: ${review.preview.prazo_estimado_minutos} min`}
                  </Text>
                  <Text style={styles.label}>
                    Pagamento:{" "}
                    {paymentLabels[review.preview.meio_pagamento] ??
                      review.preview.meio_pagamento}
                  </Text>
                  {review.preview.meio_pagamento === "dinheiro" && <Text style={styles.label}>{review.preview.precisa_troco ? `Troco para ${money(review.preview.troco_para!)} • devolver ${money(review.preview.valor_troco!)}` : "Não precisa de troco"}</Text>}
                  {!!review.preview.instrucoes_pagamento && (
                    <Text style={styles.subtitle}>
                      {review.preview.instrucoes_pagamento}
                    </Text>
                  )}
                  <Text style={styles.small}>
                    Os valores e a disponibilidade são validados novamente ao
                    confirmar. Esta revisão não reserva produtos.
                  </Text>
                  <Text style={styles.small}>Após registrar o pedido, abriremos o WhatsApp da loja com o resumo. No WhatsApp, toque em enviar.</Text>
                  <Button
                    title="Enviar pedido e abrir WhatsApp"
                    busy={busy}
                    disabled={locked || !operating.canOrder || !modeAllowed}
                    onPress={() => void confirm(review.payload)}
                  />
                </View>
              )}
            </>
          )}
          <Button
            title="Voltar ao carrinho"
            secondary
            disabled={busy}
            onPress={() => navigation.navigate("Cart", { id, name })}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </StoreThemeProvider>
  );
}
