export function runtimeApiUrl(
  configured: string,
  devHost: string | undefined,
  useDevProxy: boolean,
): string {
  if (!useDevProxy || !devHost) return configured;
  // Only enabled by the development launcher; production always uses configured API.
  const local = /^(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)(:|$)/.test(
    devHost,
  );
  const url = new URL(
    devHost.includes("://")
      ? devHost
      : `${local ? "http" : "https"}://${devHost}`,
  );
  return `${url.origin}/api/`;
}

export function runtimeMediaUrl(
  value: string | null,
  base: string,
  relay: boolean,
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    if (
      relay &&
      (["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
        value.startsWith("/media/")) &&
      url.pathname.startsWith("/media/")
    )
      return new URL(
        "/api/media/" + url.pathname.slice("/media/".length) + url.search,
        new URL(base).origin,
      ).toString();
    return url.toString();
  } catch {
    return null;
  }
}

export const paginatedPath = (path: string, page: number) =>
  `${path}${path.includes("?") ? "&" : "?"}page=${page}&page_size=20`;
export const categoryPath = (
  path: string,
  key: "tipo_loja" | "categoria",
  id: number | null,
) => (id === null ? path : `${path}?${key}=${encodeURIComponent(id)}`);
