export type Locale = "en";

const dictionaries = {
  en: () => import("@/content/en").then((m) => m.content),
} as const;

export async function getDictionary(locale: Locale = "en") {
  return dictionaries[locale]();
}
