import React from "react";
import { ScrollView, Text, View } from "react-native";
import type { Order } from "./types";
import { OrderWhatsApp } from "./OrderWhatsApp";
import { orderWhatsAppMessage } from "./whatsappMessages";
import { styles } from "./ui";

const sample: Order = {
  id: 123, codigo: "DEMONSTRACAO", chave_checkout: "demo", loja: 1,
  loja_nome: "Mercadinho Demonstração", modalidade: "entrega", status: "saiu_entrega",
  pagamento_status: "pendente", meio_pagamento: "pix", instrucoes_pagamento: "",
  endereco: { condominio: "Condomínio Acácia", bloco: "2", apartamento: "101", destinatario: "Cliente de demonstração", telefone: "", complemento: "" },
  itens: [{ id: 1, produto: 1, nome: "Arroz 1 kg", quantidade: 2, preco_unitario: "6.90", total: "13.80" }],
  subtotal: "13.80", taxa_entrega: "0.00", total: "13.80", prazo_estimado_minutos: null,
  observacoes: "", criado_em: new Date().toISOString(),
};
export function WhatsAppPreview() {
  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: 26 }]}>
    <Text style={styles.title}>WhatsApp nos pedidos</Text>
    <Text style={styles.small}>Prévia com dados fictícios • mesmos botões do aplicativo</Text>
    <View style={styles.card}>
      <Text style={styles.eyebrow}>VISÃO DO CLIENTE</Text>
      <Text style={styles.section}>Pedido #123</Text>
      <Text style={styles.label}>Mercadinho Demonstração</Text>
      <Text style={styles.small}>2 × Arroz 1 kg • Total R$ 13,80</Text>
      <OrderWhatsApp order={sample} merchant={false} />
    </View>
    <View style={styles.card}>
      <Text style={styles.eyebrow}>VISÃO DA LOJA</Text>
      <Text style={styles.section}>Pedido #123 • Em entrega</Text>
      <Text style={styles.label}>Cliente de demonstração</Text>
      <Text style={styles.small}>Condomínio Acácia • Bloco 2 • Apto 101</Text>
      <OrderWhatsApp order={sample} merchant />
    </View>
    <View style={styles.card}>
      <Text style={styles.section}>Mensagem para o cliente</Text>
      <Text style={styles.subtitle}>{orderWhatsAppMessage(sample, true)}</Text>
    </View>
  </ScrollView>;
}
