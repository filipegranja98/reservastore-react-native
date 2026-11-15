export function searchLoaded<T extends { nome: string }>(
  items: readonly T[],
  query: string,
): T[] {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  return items.filter((item) =>
    words.every((word) => normalize(item.nome).includes(word)),
  );
}
