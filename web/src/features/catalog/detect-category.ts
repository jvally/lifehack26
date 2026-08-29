export const SUPPORTED_CATEGORIES = [
  "running_shoes",
  "clothing",
  "furniture",
  "accessories",
  "makeup",
  "groceries",
  "sports_equipment",
] as const;

const categoryTerms: Record<(typeof SUPPORTED_CATEGORIES)[number], string[]> = {
  running_shoes: ["running shoe", "sneaker", "trail shoe", "road shoe"],
  clothing: ["shirt", "dress", "jacket", "pants", "jeans", "hoodie", "clothing", "apparel"],
  furniture: ["sofa", "chair", "table", "desk", "shelf", "cabinet", "furniture", "bedframe"],
  accessories: ["watch", "bag", "wallet", "belt", "jewelry", "earrings", "accessory", "case"],
  makeup: ["foundation", "lipstick", "mascara", "blush", "concealer", "skincare", "serum", "makeup"],
  groceries: ["grocery", "coffee", "snack", "rice", "milk", "tea", "sauce", "food", "protein bar"],
  sports_equipment: ["racket", "mat", "helmet", "dumbbell", "yoga", "football", "sports equipment", "training gear"],
};

export function detectCategory(text: string): string {
  const normalized = text.toLowerCase();
  let best = "running_shoes";
  let bestScore = 0;
  for (const category of SUPPORTED_CATEGORIES) {
    const score = categoryTerms[category].reduce(
      (total, term) => total + (normalized.includes(term) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }
  return best;
}
