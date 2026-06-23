import { listStoreCategoryChoices } from "@/lib/services/store-category-admin";

export async function listStoreCategoryOptions() {
  const choices = await listStoreCategoryChoices();
  return choices.map((choice) => choice.label);
}

export { listStoreCategoryChoices };
