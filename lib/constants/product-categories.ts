export const PRODUCT_CATEGORY_VALUES = [
  "BANGLES",
  "BRACELET",
  "EAR_RINGS",
  "FINGER_RINGS",
  "CHAINS",
  "NECKLACE",
  "MANGALSUTRA",
  "NOSE_PIN",
  "PENDANTS",
  "COLLOR",
  "JUMKA",
  "PENDANT_EARRINGS",
  "NECKLACE_EARRINGS",
  "NECKLACE_PENDANT_EARRINGS",
  "COINS",
  "SILVER",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORY_VALUES)[number];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  BANGLES: "Bangles",
  BRACELET: "Bracelet",
  EAR_RINGS: "Ear rings",
  FINGER_RINGS: "Finger rings",
  CHAINS: "Chains",
  NECKLACE: "Necklace",
  MANGALSUTRA: "Mangalsutra",
  NOSE_PIN: "Nose pin",
  PENDANTS: "Pendants",
  COLLOR: "Collor",
  JUMKA: "Jumka",
  PENDANT_EARRINGS: "Pendant & earrings",
  NECKLACE_EARRINGS: "Necklace & earrings",
  NECKLACE_PENDANT_EARRINGS: "Necklace & pendant & earrings",
  COINS: "Coins",
  SILVER: "Silver",
};

/** Map raw DB/MV enum strings to display labels (handles plurals and unknown keys). */
export function formatProductCategoryLabel(raw: string): string {
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, "_");
  const singular = normalized.endsWith("S") && normalized !== "COINS"
    ? normalized.slice(0, -1)
    : normalized;
  const direct = PRODUCT_CATEGORY_LABELS[normalized as ProductCategory];
  if (direct) return direct;
  const singularMatch = PRODUCT_CATEGORY_LABELS[singular as ProductCategory];
  if (singularMatch) return singularMatch;
  return raw
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
