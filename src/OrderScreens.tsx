import { OrderWhatsApp } from "./OrderWhatsApp";
import { MerchantOrders } from "./MerchantOrders";
import { elapsedTime, preparationStarted, merchantNext } from "./orderTiming";
import { OrderProgress } from "./OrderProgress";
import React from "react";
import {
  ActivityIndicator,
  AppState,
  Alert,
  FlatList,
  ScrollView,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import type { Routes } from "./screens";
import { useSession } from "./session";
import { usePage } from "./usePage";
import { api } from "./client";
import type { Order } from "./types";
import { paymentLabels } from "./checkout";
import { Button, colors, money, Notice, styles } from "./ui";
export const status: Record<string, string> = {
  recebido: "Recebido",
  aceito: "Aceito",
  preparando: "Preparando",
  pronto_retirada: "Pronto para retirada",
  saiu_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
const paymentStatus: Record<string, string> = {
  pendente: "Pendente",
  informado: "Informado pelo cliente",
  confirmado: "Confirmado pela loja",
  estornado: "Estorno registrado pela loja",
};
export function OrdersScreen(props: NativeStackScreenProps<Routes, "Orders">) {
  const { account } = useSession();
  if (!account)
    return (
      <View style={[styles.screen, styles.content]}>
        <Text style={styles.title}>Meus pedidos</Text>
        <Button
          title="Entrar na conta"
          onPress={() => props.navigation.navigate("Login")}
        />
      </View>
    );
  if (account.papel === "lojista") return <MerchantOrders key={account.id} {...props} />;
  return <OrdersContent key={account.id} {...props} />;
}
function OrdersContent({
  navigation,
}: NativeStackScreenProps<Routes, "Orders">) {
  const { account } = useSession();
  const merchant = account?.papel === "lojista";
  const [filter, setFilter] = React.useState<string | null>(null);
  const orders = usePage<Order>(`${merchant ? "lojista/pedidos/" : "pedidos/"}${merchant && filter ? `?status=${filter}` : ""}`, true);
  useFocusEffect(
    React.useCallback(() => {
      void orders.reload();
      const interval = setInterval(() => { if (AppState.currentState === "active") void orders.reload(); }, 20000);
      return () => clearInterval(interval);
    }, [orders.reload]),
  );
  return (
    <View style={styles.screen}>
      <FlatList
        data={orders.items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        refreshing={orders.busy}
        onRefresh={() => void orders.reload()}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 14 }}>
            <Text style={styles.eyebrow}>{merchant ? "PAINEL DO LOJISTA" : "SUA CONTA"}</Text>
            <Text style={styles.title}>{merchant ? "Pedidos da loja" : "Meus pedidos"}</Text>
            <Text style={styles.small}>
              {merchant ? "Confira os itens e acompanhe cada pedido. A lista atualiza a cada 20 segundos enquanto aberta." : "Escolha um pedido para acompanhar a situação e conferir os itens."}
            </Text>
            {merchant && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{[{value:null,label:"Todos"},{value:"recebido",label:"Novos"},{value:"aceito",label:"Aceitos"},{value:"preparando",label:"Em preparo"},{value:"saiu_entrega",label:"Em entrega"},{value:"pronto_retirada",label:"Prontos para retirar"},{value:"entregue",label:"Concluídos"},{value:"cancelado",label:"Cancelados"}].map(option => <Button key={option.value ?? "all"} title={`${filter === option.value ? "✓ " : ""}${option.label}`} secondary onPress={() => setFilter(option.value)} />)}</ScrollView>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { marginBottom: 12 }]}>
            <Text style={styles.section}>{item.loja_nome}</Text>
            <Text style={styles.label}>
              Pedido #{item.id} • {item.modalidade === "retirada" && item.status === "entregue" ? "Retirado" : status[item.status] ?? item.status}
            </Text>
            {merchant && <Text style={styles.label}>{item.endereco.destinatario} • {item.endereco.condominio}</Text>}
            <Text style={styles.label}>{item.modalidade === "retirada" ? "RETIRADA NA LOJA" : "ENTREGA"}</Text>
            <Text style={styles.subtitle}>{money(item.total)}</Text>
            {item.itens.map(line => <Text key={line.id} style={styles.label}>{line.quantidade} × {line.nome}</Text>)}
            <Text style={styles.small}>
              {new Date(item.criado_em).toLocaleString("pt-BR")}
            </Text>
            <Button
              title="Ver pedido"
              secondary
              onPress={() => navigation.navigate("Order", { id: item.id })}
            />
          </View>
        )}
        ListEmptyComponent={
          !orders.busy && !orders.error ? (
            <View style={styles.card}>
              <Text style={styles.label}>{merchant ? "Nenhum pedido neste filtro. Novos pedidos aparecerão aqui." : "Você ainda não tem pedidos."}</Text>
            </View>
          ) : undefined
        }
        ListFooterComponent={
          <View style={{ gap: 14 }}>
            {!!orders.error && (
              <Notice
                message={orders.error}
                retry={orders.hasMore ? orders.more : orders.reload}
              />
            )}
            {orders.busy ? (
              <ActivityIndicator color={colors.green} />
            ) : orders.hasMore ? (
              <Button title="Mais pedidos" secondary onPress={orders.more} />
            ) : null}
          </View>
        }
      />
    </View>
  );
}
export function OrderScreen(props: NativeStackScreenProps<Routes, "Order">) {
  const { account } = useSession();
  if (!account)
    return (
      <View style={[styles.screen, styles.content]}>
        <Text style={styles.subtitle}>
          Entre na sua conta para consultar o pedido.
        </Text>
        <Button
          title="Entrar"
          onPress={() => props.navigation.navigate("Login")}
        />
      </View>
    );
  return (
    <OrderContent key={`${account.id}:${props.route.params.id}`} {...props} />
  );
}
function OrderContent({
  route,
  navigation,
}: NativeStackScreenProps<Routes, "Order">) {
  const { account } = useSession();
  const merchant = account?.papel === "lojista";
  const mutationLock = React.useRef(false);
  const mutationRevision = React.useRef(0);
  const [saving, setSaving] = React.useState(false);
  const [confirmingReceipt,setConfirmingReceipt] = React.useState(false);
  const [order, setOrder] = React.useState<Order | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(true);
  const [attempt, setAttempt] = React.useState(0);
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      let inFlight = false;
      async function load(initial = false) {
        if (inFlight || mutationLock.current || AppState.currentState !== "active") return;
        inFlight = true;
        const revision = mutationRevision.current;
        if (initial) setBusy(true);
        try {
          const value = await api.request<Order>(`${merchant ? "lojista/pedidos" : "pedidos"}/${route.params.id}/`);
          if (active && !mutationLock.current && revision === mutationRevision.current) {setOrder(value);setError("");}
        } catch (e) {if(active)setError((e as Error).message);}
        finally {inFlight=false;if(active)setBusy(false);}
      }
      void load(true);
      const timer=setInterval(()=>void load(),10000);
      const listener=AppState.addEventListener("change",state=>{if(state==="active")void load();});
      return () => {active=false;clearInterval(timer);listener.remove();};
    }, [route.params.id, attempt, merchant]),
  );
  async function transition(destination: string) {
    if (!merchant || mutationLock.current) return;
    mutationLock.current = true; mutationRevision.current++; setSaving(true); setError("");
    try {
      const updated = await api.request<Order>(`lojista/pedidos/${route.params.id}/transicao/`, "POST", {status: destination});
      setOrder(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally { mutationLock.current = false; setSaving(false); }
  }
  async function confirmReceipt() {
    if (merchant || mutationLock.current || !order) return;
    mutationLock.current=true;mutationRevision.current++;setSaving(true);setError("");
    try {
      const updated=await api.request<Order>(`pedidos/${order.id}/confirmar-recebimento/`,"POST",{});
      setOrder(updated);setConfirmingReceipt(false);
    } catch(e) {setError((e as Error).message);}
    finally {mutationLock.current=false;setSaving(false);}
  }
  const canConfirmReceipt = !merchant && order && (order.modalidade === "retirada" ? order.status === "pronto_retirada" : order.status === "saiu_entrega");
  const next = order ? merchantNext(order) : undefined;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{merchant ? "PEDIDO DA SUA LOJA" : "SEU PEDIDO"}</Text>
      {!!route.params.notice && <Text accessibilityLiveRegion="polite" style={styles.label}>{route.params.notice}</Text>}
      {busy && <ActivityIndicator color={colors.green} />}
      {!!error && (
        <Notice
          message={error}
          retry={() => setAttempt((value) => value + 1)}
        />
      )}
      {order && (
        <>
          <Text style={styles.title}>Pedido #{order.id}</Text>
          <Text style={styles.section}>{order.loja_nome}</Text>
          {!merchant && <><OrderProgress order={order} /><Text style={styles.small}>Atualiza automaticamente a cada 10 segundos enquanto esta tela estiver aberta.</Text></>}
          {canConfirmReceipt && <View style={styles.card}>
            <Text style={styles.section}>{order.modalidade === "retirada" ? "Já retirou seu pedido?" : "Seu pedido chegou?"}</Text>
            <Text style={styles.small}>Confirme somente depois de receber todos os itens. A loja será informada e o pedido será concluído.</Text>
            {confirmingReceipt ? <>
              <Text style={styles.label}>Você confirma que recebeu os itens do pedido #{order.id}?</Text>
              <Button title="Sim, recebi meu pedido" busy={saving} disabled={busy} onPress={() => void confirmReceipt()} />
              <Button title="Voltar" secondary disabled={saving} onPress={() => setConfirmingReceipt(false)} />
            </> : <Button title={order.modalidade === "retirada" ? "Confirmar que retirei o pedido" : "Confirmar recebimento"} disabled={busy || saving} onPress={() => setConfirmingReceipt(true)} />}
          </View>}
          <Text style={styles.label}>
            Situação: {order.modalidade === "retirada" && order.status === "entregue" ? "Retirado" : status[order.status] ?? order.status}
          </Text>
          {merchant && <View style={styles.card}>
            {order.status === "preparando" && <Text style={styles.section}>Em preparo: {elapsedTime(preparationStarted(order), Date.now())}</Text>}
            {next && <Button title={next.label} busy={saving} disabled={busy} onPress={() => void transition(next.status)} />}
            {["recebido","aceito","preparando","pronto_retirada"].includes(order.status) && <Button title="Cancelar pedido" secondary disabled={saving || busy} onPress={() => Alert.alert("Cancelar pedido?", "O cliente verá o pedido como cancelado. Esta ação não realiza estorno de pagamentos.", [{text:"Voltar",style:"cancel"},{text:"Cancelar pedido",style:"destructive",onPress:() => void transition("cancelado")}])} />}
            {!next && <Text style={styles.label}>Pedido encerrado.</Text>}
          </View>}
          <OrderWhatsApp order={order} merchant={merchant} />
          <Text style={styles.small}>Código: {order.codigo}</Text>
          <Text style={styles.small}>
            {new Date(order.criado_em).toLocaleString("pt-BR")}
          </Text>
          <View style={styles.card}>
            <Text style={styles.section}>{order.modalidade === "retirada" ? "Retirada na loja" : "Entrega"}</Text>
            {order.modalidade === "retirada" ? <Text style={styles.small}>O cliente buscará o pedido na loja. Combine o ponto de retirada diretamente.</Text> : <>
            <Text style={styles.label}>{order.endereco.condominio}</Text>
            <Text style={styles.subtitle}>
              Bloco {order.endereco.bloco} • Apto {order.endereco.apartamento}
            </Text>
            </>}
            <Text style={styles.small}>
              {order.endereco.destinatario} • {order.endereco.telefone}
            </Text>
            {!!order.endereco.complemento && (
              <Text style={styles.small}>{order.endereco.complemento}</Text>
            )}
            <Text style={styles.small}>
              {order.prazo_estimado_minutos === null
                ? "Prazo não informado pela loja"
                : `Estimativa registrada: ${order.prazo_estimado_minutos} min`}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.section}>Itens do pedido</Text>
            {order.itens.map((item) => (
              <View key={item.id} style={{ gap: 4 }}>
                <Text style={styles.label}>
                  {item.quantidade} × {item.nome}
                </Text>
                <Text style={styles.small}>
                  {money(item.preco_unitario)} por unidade • {money(item.total)}
                </Text>
              </View>
            ))}
            <Text style={styles.label}>Itens: {money(order.subtotal)}</Text>
            <Text style={styles.label}>
              Entrega: {money(order.taxa_entrega)}
            </Text>
            <Text style={styles.section}>Total: {money(order.total)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.section}>Pagamento direto à loja</Text>
            <Text style={styles.label}>
              {paymentLabels[order.meio_pagamento] ?? order.meio_pagamento} •{" "}
              {paymentStatus[order.pagamento_status] ?? order.pagamento_status}
            </Text>
            {order.meio_pagamento === "dinheiro" && <Text style={styles.label}>{order.precisa_troco ? `Troco para ${money(order.troco_para!)} • devolver ${money(order.valor_troco!)}` : "Sem troco"}</Text>}
            {!!order.instrucoes_pagamento && (
              <Text style={styles.subtitle}>{order.instrucoes_pagamento}</Text>
            )}
            <Text style={styles.small}>
              A plataforma não processou nenhum pagamento. Combine e pague
              diretamente à loja conforme as instruções.
            </Text>
          </View>
          {!!order.observacoes && (
            <Text style={styles.subtitle}>
              Observações: {order.observacoes}
            </Text>
          )}
          <Button
            title="Atualizar situação"
            secondary
            disabled={busy}
            onPress={() => setAttempt((value) => value + 1)}
          />
        </>
      )}
      <Button
        title={merchant ? "Pedidos da loja" : "Meus pedidos"}
        secondary
        onPress={() => navigation.navigate("Orders")}
      />
      <Button
        title="Explorar lojas"
        onPress={() => navigation.popTo("Shops")}
      />
    </ScrollView>
  );
}
