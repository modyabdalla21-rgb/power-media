import "server-only";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";
import { mergeDictionary } from "./merge";

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  ar: () => import("./dictionaries/ar").then((m) => m.default),
  // Egyptian colloquial mode = Arabic + Egyptian overrides.
  eg: async () => {
    const [ar, eg] = await Promise.all([import("./dictionaries/ar"), import("./dictionaries/eg")]);
    return mergeDictionary<Dictionary>(ar.default, eg.default);
  },
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}
