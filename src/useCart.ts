import { checkoutVault } from "./checkoutVault";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "./client";
import { CartApi } from "./cart";
import { useSession } from "./session";
import type { Cart } from "./types";
interface State {
  scope: string;
  cart: Cart | null;
  error: string;
  needsReload: boolean;
  pendingCheckout: boolean;
  busy: boolean;
  message: string;
}
export function useCart(shop: number) {
  const session = useSession();
  const account = session.account?.papel === "cliente" ? session.account : null;
  const scope = `${account?.id ?? "guest"}:${shop}`;
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const revision = useRef(0);
  const locked = useRef(false);
  const [state, setState] = useState<State>({
    scope,
    cart: null,
    error: "",
    needsReload: true,
    pendingCheckout: false,
    busy: false,
    message: "",
  });
  const perform = useCallback(
    async (
      operation: (service: CartApi) => Promise<Cart>,
      message = "",
      mutation = false,
    ) => {
      if (!account || locked.current) return;
      locked.current = true;
      const version = ++revision.current;
      const current = () =>
        activeScope.current === scope && revision.current === version;
      setState((old) => ({
        ...old,
        scope,
        cart: old.scope === scope ? old.cart : null,
        error: "",
        message: "",
        busy: true,
      }));
      const service = new CartApi(api, () => {
        if (!current()) throw Error("A sessão ou a tela mudou.");
      });
      let pendingCheckout = true;
      try {
        pendingCheckout = !!(await checkoutVault(account.id, shop).read());
        if (!current()) throw Error("A sessão ou a tela mudou.");
        if (mutation && pendingCheckout)
          throw Error(
            "Existe um pedido aguardando confirmação. Abra a finalização para verificar o envio antes de alterar o carrinho.",
          );
        const cart = await operation(service);
        if (current())
          setState({
            scope,
            cart,
            error: "",
            needsReload: false,
            pendingCheckout,
            busy: false,
            message,
          });
      } catch (error) {
        if (current())
          setState((old) => ({
            ...old,
            error:
              error instanceof Error
                ? error.message
                : "Não foi possível confirmar a alteração. Atualize o carrinho antes de tentar novamente.",
            needsReload: true,
            pendingCheckout,
            busy: false,
            message: "",
          }));
      } finally {
        if (current()) locked.current = false;
      }
    },
    [scope, account?.id, shop],
  );
  const reload = useCallback(
    () => perform((service) => service.get(shop)),
    [perform, shop],
  );
  useFocusEffect(
    useCallback(() => {
      if (account) void reload();
      else
        setState({
          scope,
          cart: null,
          error: "",
          needsReload: true,
          pendingCheckout: false,
          busy: false,
          message: "",
        });
      return () => {
        ++revision.current;
        locked.current = false;
      };
    }, [reload, scope, account?.id]),
  );
  const visible =
    state.scope === scope
      ? state
      : {
          scope,
          cart: null,
          error: "",
          needsReload: true,
          pendingCheckout: false,
          busy: false,
          message: "",
        };
  return {
    ...visible,
    reload,
    add: (product: number) =>
      perform(
        (service) => service.add(shop, product),
        "Produto adicionado ao carrinho desta loja.",
        true,
      ),
    adjust: (item: number, delta: -1 | 1) =>
      perform((service) => service.adjust(shop, item, delta), "", true),
    remove: (item: number) =>
      perform((service) => service.remove(shop, item), "Item removido.", true),
  };
}
