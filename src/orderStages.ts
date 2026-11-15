export function orderProgress(status: string, pickup = false) {
  const steps = [
    {key:"recebido", title:"Pedido enviado", description:"Seu pedido chegou à loja. Aguarde a confirmação."},
    {key:"aceito", title:"Confirmado pela loja", description:"A loja aceitou seu pedido e vai iniciar o preparo."},
    {key:"preparando", title:"Em preparo", description:"A loja está preparando os itens do seu pedido."},
    pickup
      ? {key:"pronto_retirada", title:"Pronto para retirar", description:"Seu pedido está pronto. Combine a retirada diretamente com a loja."}
      : {key:"saiu_entrega", title:"A caminho", description:"A loja informou que seu pedido saiu para entrega."},
    {key:"entregue", title:pickup ? "Pedido retirado" : "Pedido entregue", description:pickup ? "A loja confirmou a retirada. Obrigado por comprar no Reserva Store!" : "A loja confirmou a entrega. Obrigado por comprar no Reserva Store!"},
  ];
  const index = steps.findIndex(step => step.key === status);
  const canceled = status === "cancelado";
  const current = canceled ? {title:"Pedido cancelado", description:"Este pedido foi cancelado. Se você já pagou, combine a devolução diretamente com a loja."} : steps[index] ?? {title:"Aguardando atualização",description:"Consulte a loja para confirmar o andamento do pedido."};
  return {steps,index,canceled,current,finished:canceled || status === "entregue",progress:index < 0 ? 0 : index / (steps.length - 1)};
}
