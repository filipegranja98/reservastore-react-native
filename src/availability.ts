export interface StoreAvailability {
  label: string;
  description: string;
  card: string;
  cardText: string;
  border: string;
  badge: string;
  color: string;
  canOrder: boolean;
}
export function storeAvailability(
  shop: { aberta?: boolean } | null,
): StoreAvailability {
  if (shop?.aberta === true)
    return {
      label: "Aberta",
      description: "Recebendo pedidos",
      card: "#1B7844",
      cardText: "#FFFFFF",
      border: "#1B7844",
      badge: "#1B7844",
      color: "#FFFFFF",
      canOrder: true,
    };
  if (shop?.aberta === false)
    return {
      label: "Fechada",
      description: "Não está recebendo pedidos",
      card: "#A3292B",
      cardText: "#FFFFFF",
      border: "#A3292B",
      badge: "#A3292B",
      color: "#FFFFFF",
      canOrder: false,
    };
  return {
    label: "Situação não informada",
    description: "Atualize para consultar o atendimento",
    card: "#FFFFFF",
    cardText: "#172E2A",
    border: "#DCE4DC",
    badge: "#52645E",
    color: "#FFFFFF",
    canOrder: false,
  };
}
