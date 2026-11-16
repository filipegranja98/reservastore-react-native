import type { Tokens, Registration } from "./types";
export interface TokenVault {
  read(): Promise<Tokens | null>;
  write(tokens: Tokens | null): Promise<void>;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const labels: Record<string, string> = {
  username: "Usuário",
  codigo: "Código de recuperação",
  nova_senha: "Nova senha",
  password: "Senha",
  first_name: "Nome",
  email: "Email",
  telefone: "Telefone",
  non_field_errors: "Dados",
  detail: "",
  condominio: "Condomínio",
  bloco: "Bloco",
  apartamento: "Apartamento",
  destinatario: "Destinatário",
  complemento: "Complemento",
  endereco: "Endereço",
  area_entrega: "Área de entrega",
  meio_pagamento: "Pagamento",
  observacoes: "Observações",
  duracao_minutos: "Duração prevista",
  inicio_proposto: "Novo horário",
  inicio_solicitado: "Data de preferência",
  imagem: "Foto",
  versao: "Atualização",
  chave: "Solicitação",
};
function errorMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(errorMessage).join(" ");
  if (value && typeof value === "object")
    return Object.entries(value)
      .map(
        ([key, val]) =>
          `${labels[key] ?? key}${labels[key] === "" ? "" : ": "}${errorMessage(val)}`,
      )
      .join("\n");
  return "Não foi possível concluir a solicitação.";
}
export function normalizeBase(value: string): string {
  if (!value.trim())
    throw new ApiError(
      0,
      "Configure EXPO_PUBLIC_API_URL no arquivo .env.local e reinicie o Expo.",
    );
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ApiError(0, "O endereço da API é inválido.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new ApiError(
      0,
      "Use uma URL HTTP(S) da API sem credenciais ou parâmetros.",
    );
  return url.toString().replace(/\/*$/, "/");
}
export class ApiClient {
  private tokens: Tokens | null = null;
  private revision = 0;
  private refreshTask: Promise<void> | null = null;
  private writes: Promise<void> = Promise.resolve();
  onExpired: () => void = () => {};
  constructor(
    private base: string,
    private vault: TokenVault,
    private transport: typeof fetch = fetch,
    private requireHttps = false,
  ) {}
  private persist(tokens: Tokens | null) {
    const task = this.writes
      .catch(() => {})
      .then(() => this.vault.write(tokens));
    this.writes = task;
    return task;
  }
  async restore() {
    const value = await this.vault.read();
    if (
      value &&
      typeof value.access === "string" &&
      typeof value.refresh === "string"
    )
      this.tokens = value;
    else if (value) await this.persist(null);
    return !!this.tokens;
  }
  private async raw<T>(
    path: string,
    method = "GET",
    body?: unknown,
    token?: string,
  ): Promise<T> {
    const base = normalizeBase(this.base);
    if (this.requireHttps && !base.startsWith("https://"))
      throw new ApiError(
        0,
        "Configure uma API HTTPS para usar a versão de produção.",
      );
    // Paths come only from this application; never forward bearer tokens to pagination URLs.
    if (path.startsWith("/") || path.includes("://"))
      throw new ApiError(0, "Caminho de API inválido.");
    const controller = new AbortController();
    const multipart =
      typeof FormData !== "undefined" && body instanceof FormData;
    const timeout = setTimeout(() => controller.abort(), multipart ? 90000 : 15000);
    try {
      // Browser fetch must be invoked without binding it to the API client.
      const transport = this.transport;
      const response = await transport(base + path, {
        method,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(body === undefined || multipart
            ? {}
            : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined
          ? {}
          : { body: multipart ? (body as FormData) : JSON.stringify(body) }),
      });
      const text = await response.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch {
        if (response.ok)
          throw new ApiError(
            response.status,
            "A API retornou uma resposta inválida.",
          );
      }
      if (!response.ok)
        throw new ApiError(
          response.status,
          response.status >= 500
            ? "O serviço está indisponível. Tente novamente."
            : response.status === 429
              ? "Muitas tentativas. Aguarde um pouco e tente novamente."
              : data
                ? errorMessage(data)
                : "Não foi possível concluir a solicitação.",
        );
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        0,
        controller.signal.aborted
          ? "A conexão demorou demais. Tente novamente."
          : "Sem conexão com a API. Verifique a rede e tente novamente.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  publicRequest<T>(path: string, method = "GET", body?: unknown) {
    return this.raw<T>(path, method, body);
  }
  async login(username: string, password: string) {
    const revision = ++this.revision;
    const tokens = await this.raw<Tokens>("token/", "POST", {
      username,
      password,
    });
    if (!tokens.access || !tokens.refresh)
      throw new ApiError(0, "Resposta de login inválida.");
    if (revision !== this.revision)
      throw new ApiError(0, "A sessão foi alterada. Entre novamente.");
    this.tokens = tokens;
    try {
      await this.persist(tokens);
    } catch {
      this.tokens = null;
      throw new ApiError(0, "Não foi possível guardar a sessão com segurança.");
    }
  }
  register(data: Registration) {
    return this.raw("auth/cadastro/", "POST", { ...data, papel: "cliente" });
  }
  private async refresh(staleAccess: string) {
    if (this.tokens?.access !== staleAccess) return;
    if (!this.refreshTask) {
      const revision = this.revision;
      const refresh = this.tokens.refresh;
      this.refreshTask = (async () => {
        try {
          const tokens = await this.raw<Tokens>("token/refresh/", "POST", {
            refresh,
          });
          if (!tokens.access || !tokens.refresh)
            throw new ApiError(401, "Sessão inválida. Entre novamente.");
          if (revision !== this.revision) return;
          this.tokens = tokens;
          try {
            await this.persist(tokens);
          } catch {
            await this.clear();
            throw new ApiError(
              0,
              "Não foi possível guardar a sessão renovada. Entre novamente.",
            );
          }
        } catch (error) {
          if (
            error instanceof ApiError &&
            error.status === 401 &&
            revision === this.revision
          )
            await this.clear();
          throw error;
        }
      })().finally(() => {
        this.refreshTask = null;
      });
    }
    await this.refreshTask;
  }
  async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const revision = this.revision;
    const access = this.tokens?.access;
    if (!access) throw new ApiError(401, "Entre na sua conta para continuar.");
    try {
      return await this.raw<T>(path, method, body, access);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      await this.refresh(access);
      if (revision !== this.revision || !this.tokens)
        throw new ApiError(401, "A sessão terminou. Entre novamente.");
      try {
        return await this.raw<T>(path, method, body, this.tokens.access);
      } catch (retryError) {
        if (retryError instanceof ApiError && retryError.status === 401)
          await this.clear();
        throw retryError;
      }
    }
  }
  async clear() {
    ++this.revision;
    this.tokens = null;
    this.onExpired();
    try {
      await this.persist(null);
    } catch {
      throw new ApiError(
        0,
        "Não foi possível apagar a sessão salva. Tente sair novamente.",
      );
    }
  }
  async logout(): Promise<boolean> {
    // Wait for an in-flight rotation before revoking the current refresh.
    try {
      await this.refreshTask;
    } catch {
      /* local cleanup still runs */
    }
    let revoked = false;
    try {
      if (this.tokens) {
        await this.request("conta/"); // Renew first so logout uses the newly rotated refresh.
        if (this.tokens) {
          await this.raw(
            "token/logout/",
            "POST",
            { refresh_token: this.tokens.refresh },
            this.tokens.access,
          );
          revoked = true;
        }
      }
    } catch {
      /* Offline logout still removes local credentials. */
    } finally {
      await this.clear();
    }
    return revoked;
  }
}
