import { allowedAppRole } from "./roles";
import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./client";
import type { Account } from "./types";
import { ApiError } from "./api";
interface Session {
  account: Account | null;
  booting: boolean;
  error: string;
  reload(): Promise<void>;
  login(username: string, password: string): Promise<Account>;
  logout(): Promise<boolean>;
}
const Context = createContext<Session>(null!);
export function SessionProvider({ children }: React.PropsWithChildren) {
  const [account, setAccount] = useState<Account | null>(null);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  async function loadAccount() {
    const user = await api.request<Account>("conta/");
    if (!allowedAppRole(user.papel)) {
      await api.logout();
      throw new ApiError(
        403,
        "Use uma conta de cliente ou lojista para entrar. A administração permanece no Django Admin.",
      );
    }
    setAccount(user);
    return user;
  }
  async function reload() {
    setBooting(true);
    setError("");
    try {
      if (await api.restore()) await loadAccount();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível recuperar a sessão.",
      );
    } finally {
      setBooting(false);
    }
  }
  useEffect(() => {
    api.onExpired = () => setAccount(null);
    void reload();
    return () => {
      api.onExpired = () => {};
    };
  }, []);
  async function login(username: string, password: string) {
    await api.login(username, password);
    try {
      const user = await loadAccount();
      setError("");
      return user;
    } catch (error) {
      await api.logout();
      throw error;
    }
  }
  async function logout() {
    const revoked = await api.logout();
    setAccount(null);
    setError("");
    return revoked;
  }
  return (
    <Context.Provider
      value={{ account, booting, error, reload, login, logout }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
