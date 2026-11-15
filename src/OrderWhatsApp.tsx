import React from "react";
import { Linking, Text, View } from "react-native";
import { api } from "./client";
import type { Order, Shop } from "./types";
import { Button, Notice, styles } from "./ui";
import { orderWhatsAppLink, orderWhatsAppMessage } from "./whatsappMessages";

export function OrderWhatsApp({ order, merchant }: { order: Order; merchant: boolean }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  async function open() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const phone = merchant ? order.endereco.telefone : (await api.publicRequest<Shop>(`catalogo/lojas/${order.loja}/`)).whatsapp;
      const url = orderWhatsAppLink(phone, orderWhatsAppMessage(order, merchant));
      if (!url) throw Error(merchant ? "O cliente não tem um telefone válido neste pedido." : "A loja ainda não informou um WhatsApp válido.");
      await Linking.openURL(url);
    } catch (e) { setError((e as Error).message || "Não foi possível abrir o WhatsApp."); }
    finally { setBusy(false); }
  }
  const title = !merchant ? "Enviar pedido à loja pelo WhatsApp" : order.status === "saiu_entrega" ? "Avisar cliente: saiu para entrega" : order.status === "pronto_retirada" ? "Avisar cliente: pronto para retirada" : "Avisar cliente pelo WhatsApp";
  return <View style={{ gap: 7 }}>
    <Button title={title} secondary busy={busy} onPress={() => void open()} />
    <Text style={styles.small}>Abre a mensagem preenchida no WhatsApp. Confira e toque em enviar.</Text>
    {!!error && <Notice message={error} />}
  </View>;
}

