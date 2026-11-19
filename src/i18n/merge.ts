/** Deep-partial dictionary overrides (arrays are replaced whole). */
export type DeepPartial<T> = T extends string ? string : T extends readonly unknown[] ? T : { [K in keyof T]?: DeepPartial<T[K]> };

export function mergeDictionary<T>(base: T, overrides: DeepPartial<T>): T {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return (overrides ?? base) as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(overrides as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) && v && typeof v === "object" && !Array.isArray(v) ? mergeDictionary(b, v as DeepPartial<typeof b>) : v;
  }
  return out as T;
}
