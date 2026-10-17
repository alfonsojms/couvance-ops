/** Agrupa en un Map por clave, preservando el orden de llegada dentro de cada grupo. */
export function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(key(item)) || [];
    list.push(item);
    groups.set(key(item), list);
  }
  return groups;
}
