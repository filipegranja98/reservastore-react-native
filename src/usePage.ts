import { paginatedPath } from "./config";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./client";
import type { Page } from "./types";
export function usePage<T>(path: string, authenticated = false) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const lock = useRef(false);
  const load = useCallback(
    async (number = 1) => {
      if (lock.current) return;
      lock.current = true;
      const current = generation.current;
      setBusy(true);
      setError("");
      try {
        const result = authenticated
          ? await api.request<Page<T>>(paginatedPath(path, number))
          : await api.publicRequest<Page<T>>(paginatedPath(path, number));
        if (current !== generation.current) return;
        setItems((previous) =>
          number === 1 ? result.results : [...previous, ...result.results],
        );
        setHasMore(!!result.next);
        setPage(number);
      } catch (e) {
        if (current === generation.current)
          setError(
            e instanceof Error ? e.message : "Não foi possível carregar.",
          );
      } finally {
        if (current === generation.current) {
          lock.current = false;
          setBusy(false);
        }
      }
    },
    [path, authenticated],
  );
  useEffect(() => {
    lock.current = false;
    setItems([]);
    setPage(0);
    setHasMore(false);
    void load();
    return () => {
      ++generation.current;
    };
  }, [load]);
  const reload = useCallback(() => load(1), [load]);
  const more = useCallback(() => load(page + 1), [load, page]);
  return {
    items,
    busy,
    error,
    hasMore,
    reload,
    more,
  };
}
