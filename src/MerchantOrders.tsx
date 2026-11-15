import { OrderWhatsApp } from "./OrderWhatsApp";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, AppState, FlatList, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Routes } from "./screens";
import type { Order } from "./types";
import { api } from "./client";
import { usePage } from "./usePage";
import { elapsedTime, merchantNext, preparationStarted } from "./orderTiming";
import { paymentLabels } from "./checkout";
import { Button, colors, money, Notice, styles } from "./ui";
const filters=[{key:"active",label:"Em andamento"},{key:"recebido",label:"Novos"},{key:"aceito",label:"Aceitos"},{key:"preparando",label:"Em preparo"},{key:"pronto_retirada",label:"Para retirar"},{key:"saiu_entrega",label:"Em entrega"},{key:"entregue",label:"Concluídos"},{key:"cancelado",label:"Cancelados"}];
const labels:Record<string,string>={recebido:"Novo pedido",aceito:"Aceito",preparando:"Em preparo",pronto_retirada:"Pronto para retirada",saiu_entrega:"Em entrega",entregue:"Concluído",cancelado:"Cancelado"};
const payments:Record<string,string>={pendente:"Pagamento pendente",informado:"Pagamento informado pelo cliente",confirmado:"Pagamento confirmado pela loja",estornado:"Estorno registrado"};
export function MerchantOrders(props: NativeStackScreenProps<Routes,"Orders">) {
  const [filter,setFilter]=useState("active");
  const orders=usePage<Order>(`lojista/pedidos/?${filter === "active" ? "fila=ativos" : `status=${filter}`}&ordem=antigos`,true);
  const [now,setNow]=useState(Date.now());
  const [saving,setSaving]=useState<number|null>(null);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const mutation=useRef(false);
  const alive=useRef(false);
  useFocusEffect(useCallback(()=>{
    alive.current=true;
    void orders.reload();setNow(Date.now());
    const tick=setInterval(()=>{if(AppState.currentState==="active")setNow(Date.now());},15000);
    const refresh=setInterval(()=>{if(AppState.currentState==="active" && !mutation.current)void orders.reload();},20000);
    const listener=AppState.addEventListener("change",state=>{if(state==="active"){setNow(Date.now());if(!mutation.current)void orders.reload();}});
    return ()=>{alive.current=false;clearInterval(tick);clearInterval(refresh);listener.remove();};
  },[orders.reload]));
  async function advance(order:Order) {
    const next=merchantNext(order);
    if(!next || mutation.current)return;
    mutation.current=true;setSaving(order.id);setError("");setMessage("");
    try {
      const updated=await api.request<Order>(`lojista/pedidos/${order.id}/transicao/`,"POST",{status:next.status});
      if(alive.current)setMessage(`Pedido #${updated.id}: ${labels[updated.status] ?? updated.status}.`);
    } catch(e){if(alive.current)setError((e as Error).message);}
    finally {
      mutation.current=false;
      if(alive.current){setSaving(null);await orders.reload();setNow(Date.now());}
    }
  }
  return <View style={styles.screen}><FlatList data={orders.items} keyExtractor={item=>String(item.id)} refreshing={orders.busy} onRefresh={()=>void orders.reload()} contentContainerStyle={styles.content}
    ListHeaderComponent={<View style={{gap:14,marginBottom:12}}>
      <Text style={styles.eyebrow}>CENTRAL DE PEDIDOS</Text>
      <Text style={styles.title}>Fila de atendimento</Text>
      <Text style={styles.subtitle}>Os pedidos mais antigos aparecem primeiro. Confira o tempo em preparo para organizar as próximas entregas e retiradas.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{filters.map(item=><Button key={item.key} title={item.label} secondary={filter!==item.key} disabled={saving!==null} onPress={()=>setFilter(item.key)} />)}</ScrollView>
      <Text style={styles.small}>Atualiza a cada 20 segundos enquanto aberta. Tempos são calculados pelos horários registrados, sem previsão automática de entrega.</Text>
      {!!error && <Notice message={error} />}
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.label}>{message}</Text>}
    </View>}
    renderItem={({item:order})=>{
      const next=merchantNext(order);
      const preparing=order.status==="preparando";
      return <View style={[styles.card,{marginBottom:14,borderLeftWidth:5,borderLeftColor:preparing?"#AC6412":order.status==="recebido"?colors.green:colors.line}]}>
        <View style={{flexDirection:"row",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <Text style={{fontSize:26,fontWeight:"800",color:colors.ink}}>Pedido #{order.id}</Text>
          <View style={{backgroundColor:preparing?"#FFF0D7":"#EAF1E9",padding:8,borderRadius:8}}><Text style={{fontWeight:"700",color:preparing?"#804600":colors.green}}>{labels[order.status] ?? order.status}</Text></View>
        </View>
        <Text style={styles.small}>{new Date(order.criado_em).toLocaleString("pt-BR")} • {order.modalidade==="retirada"?"RETIRADA NA LOJA":"ENTREGA"}</Text>
        {!["entregue","cancelado"].includes(order.status) && <Text style={styles.label}>Pedido recebido há {elapsedTime(Date.parse(order.criado_em),now)}</Text>}
        {preparing && <View style={{backgroundColor:"#FFF0D7",borderRadius:12,padding:14,gap:4}}><Text style={{fontSize:20,fontWeight:"800",color:"#804600"}}>Em preparo: {elapsedTime(preparationStarted(order),now)}</Text><Text style={{color:"#804600",fontSize:12}}>Contado desde que a loja iniciou o preparo.</Text></View>}
        <Text style={styles.section}>{order.endereco.destinatario || "Cliente"}</Text>
        <Text selectable style={styles.label}>Contato: {order.endereco.telefone || "Não informado"}</Text>
        {order.modalidade==="retirada"?<Text style={styles.small}>O cliente buscará os itens na loja.</Text>:<View style={{gap:4}}><Text style={styles.label}>{order.endereco.condominio}</Text><Text style={styles.label}>Bloco {order.endereco.bloco} • Apto {order.endereco.apartamento}</Text>{!!order.endereco.complemento && <Text style={styles.small}>Referência: {order.endereco.complemento}</Text>}</View>}
        <View style={{borderTopWidth:1,borderColor:colors.line,paddingTop:12,gap:8}}>
          <Text style={styles.label}>ITENS DO PEDIDO</Text>
          {order.itens.map(item=><View key={item.id} style={{gap:3}}><Text style={styles.label}>{item.quantidade} × {item.nome}</Text><Text style={styles.small}>{money(item.preco_unitario)} / unidade • {money(item.total)}</Text></View>)}
        </View>
        {!!order.observacoes && <View style={{backgroundColor:"#F5F5EF",padding:12,borderRadius:10}}><Text style={styles.label}>Observações do cliente</Text><Text style={styles.subtitle}>{order.observacoes}</Text></View>}
        <Text style={styles.section}>Total {money(order.total)}</Text>
        <Text style={styles.small}>{paymentLabels[order.meio_pagamento] ?? order.meio_pagamento} • {payments[order.pagamento_status] ?? order.pagamento_status}</Text>
        {order.meio_pagamento === "dinheiro" && <View style={{backgroundColor:order.precisa_troco?"#FFF0D7":"#EAF1E9",padding:12,borderRadius:10}}><Text style={styles.label}>{order.precisa_troco ? `Levar troco: ${money(order.valor_troco!)} (cliente paga ${money(order.troco_para!)})` : "Pagamento em dinheiro • sem troco"}</Text></View>}
        {next && <Button title={`${next.label} • #${order.id}`} busy={saving===order.id} disabled={saving!==null || orders.busy} onPress={()=>void advance(order)} />}
        <OrderWhatsApp order={order} merchant />
        <Button title={`Ver detalhes do pedido #${order.id}`} secondary disabled={saving!==null} onPress={()=>props.navigation.navigate("Order",{id:order.id})} />
      </View>;
    }}
    ListEmptyComponent={!orders.busy && !orders.error ? <View style={styles.card}><Text style={styles.section}>Nenhum pedido nesta etapa</Text><Text style={styles.small}>Novos pedidos aparecerão automaticamente na fila.</Text></View>:undefined}
    ListFooterComponent={<View style={{gap:12}}>{!!orders.error && <Notice message={orders.error} retry={orders.reload} />}{orders.busy && <ActivityIndicator color={colors.green} />}{orders.hasMore && <Button title="Carregar próximos pedidos" secondary busy={orders.busy} disabled={saving!==null} onPress={orders.more} />}</View>}
  /></View>;
}
