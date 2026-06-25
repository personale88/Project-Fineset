import { prisma } from "@/lib/db/prisma";
import { mergeStoreWhere } from "@/lib/db/store-scope";
import {
  BUILTIN_STORE_CATEGORIES,
  defaultBuiltinLabel,
  isBuiltinStoreCategoryKey,
  type StoreCategoryChoice,
} from "@/lib/store-category/catalog";
import type { StoreCategory } from "@prisma/client";

function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

async function countStoresForCategoryKey(name: string, isBuiltin: boolean): Promise<number> {
  if (isBuiltin) {
    const category = name.toUpperCase() as StoreCategory;
    if (category === "OTHER") {
      return prisma.store.count({
        where: mergeStoreWhere({
          category: "OTHER",
          OR: [{ customCategory: null }, { customCategory: "" }],
        }),
      });
    }

    return prisma.store.count({
      where: mergeStoreWhere({ category }),
    });
  }

  return prisma.store.count({
    where: mergeStoreWhere({ customCategory: name }),
  });
}

export async function ensureStoreCategoryCatalog(): Promise<void> {
  await Promise.all(
    BUILTIN_STORE_CATEGORIES.map((category) =>
      prisma.storeCategoryOption.upsert({
        where: { name: category },
        create: {
          name: category,
          label: defaultBuiltinLabel(category),
          isBuiltin: true,
        },
        update: {},
      }),
    ),
  );
}

async function buildCategoryCatalog(catalogOptions?: {
  includeHidden?: boolean;
}): Promise<StoreCategoryChoice[]> {
  await ensureStoreCategoryCatalog();

  const [categoryRows, customStores] = await Promise.all([
    prisma.storeCategoryOption.findMany({
      orderBy: [{ isBuiltin: "desc" }, { label: "asc" }],
    }),
    prisma.store.findMany({
      where: mergeStoreWhere({
        category: "OTHER",
        customCategory: { not: null },
      }),
      select: { customCategory: true },
    }),
  ]);

  const byName = new Map<
    string,
    { label: string; isBuiltin: boolean; hiddenFromPicker: boolean }
  >();

  for (const option of categoryRows) {
    byName.set(option.name, {
      label: option.label,
      isBuiltin: option.isBuiltin,
      hiddenFromPicker: option.hiddenFromPicker,
    });
  }

  for (const store of customStores) {
    const name = store.customCategory?.trim();
    if (!name || isBuiltinStoreCategoryKey(name) || byName.has(name)) continue;
    byName.set(name, { label: name, isBuiltin: false, hiddenFromPicker: false });
  }

  const builtinOrder = new Map(BUILTIN_STORE_CATEGORIES.map((name, index) => [name, index]));
  const entries = Array.from(byName.entries())
    .filter(([, meta]) => catalogOptions?.includeHidden || !meta.hiddenFromPicker)
    .sort(([aName, aMeta], [bName, bMeta]) => {
      if (aMeta.isBuiltin && bMeta.isBuiltin) {
        return (
          (builtinOrder.get(aName as StoreCategory) ?? 99) -
          (builtinOrder.get(bName as StoreCategory) ?? 99)
        );
      }
      if (aMeta.isBuiltin) return -1;
      if (bMeta.isBuiltin) return 1;
      return aMeta.label.localeCompare(bMeta.label);
    });

  return Promise.all(
    entries.map(async ([name, meta]) => ({
      name,
      label: meta.label,
      isBuiltin: meta.isBuiltin,
      hiddenFromPicker: meta.hiddenFromPicker,
      storeCount: await countStoresForCategoryKey(name, meta.isBuiltin),
    })),
  );
}

/** Visible categories for store dropdowns. */
export async function listStoreCategoryChoices(): Promise<StoreCategoryChoice[]> {
  return buildCategoryCatalog({ includeHidden: false });
}

/** All categories for admin settings, including hidden. */
export async function listAdminStoreCategories(): Promise<StoreCategoryChoice[]> {
  return buildCategoryCatalog({ includeHidden: true });
}

export async function createStoreCategoryOption(name: string): Promise<StoreCategoryChoice> {
  const normalized = normalizeCategoryName(name);
  if (!normalized) {
    throw new Error("Category name is required.");
  }

  if (isBuiltinStoreCategoryKey(normalized)) {
    throw new Error("Built-in categories cannot be added manually.");
  }

  await prisma.storeCategoryOption.upsert({
    where: { name: normalized },
    create: {
      name: normalized,
      label: normalized,
      isBuiltin: false,
      hiddenFromPicker: false,
    },
    update: {
      hiddenFromPicker: false,
    },
  });

  return {
    name: normalized,
    label: normalized,
    isBuiltin: false,
    hiddenFromPicker: false,
    storeCount: await countStoresForCategoryKey(normalized, false),
  };
}

export async function updateStoreCategoryOption(input: {
  name: string;
  label?: string;
  newName?: string;
}): Promise<StoreCategoryChoice> {
  const currentName = normalizeCategoryName(input.name);
  if (!currentName) {
    throw new Error("Category name is required.");
  }

  const existing = await prisma.storeCategoryOption.findUnique({
    where: { name: currentName },
  });

  const isBuiltin = existing?.isBuiltin ?? isBuiltinStoreCategoryKey(currentName);
  const nextLabel = input.label !== undefined ? normalizeCategoryName(input.label) : undefined;
  const nextName =
    input.newName !== undefined ? normalizeCategoryName(input.newName) : undefined;

  if (isBuiltin) {
    if (nextName && nextName.toUpperCase() !== currentName.toUpperCase()) {
      throw new Error("Built-in category keys cannot be renamed.");
    }

    if (!nextLabel) {
      throw new Error("Display label is required.");
    }

    await ensureStoreCategoryCatalog();
    const row = await prisma.storeCategoryOption.update({
      where: { name: currentName },
      data: { label: nextLabel, hiddenFromPicker: false },
    });

    return {
      name: row.name,
      label: row.label,
      isBuiltin: true,
      hiddenFromPicker: row.hiddenFromPicker,
      storeCount: await countStoresForCategoryKey(row.name, true),
    };
  }

  if (!existing && !(await countStoresForCategoryKey(currentName, false))) {
    throw new Error("Category not found.");
  }

  const resolvedName = nextName ?? currentName;
  if (!resolvedName) {
    throw new Error("Category name is required.");
  }

  if (isBuiltinStoreCategoryKey(resolvedName)) {
    throw new Error("This name conflicts with a built-in category.");
  }

  const resolvedLabel = nextLabel ?? resolvedName;

  if (resolvedName !== currentName) {
    const conflict = await prisma.storeCategoryOption.findUnique({
      where: { name: resolvedName },
    });
    if (conflict) {
      throw new Error("A category with this name already exists.");
    }

    await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.storeCategoryOption.update({
          where: { name: currentName },
          data: {
            name: resolvedName,
            label: resolvedLabel,
            hiddenFromPicker: false,
          },
        });
      } else {
        await tx.storeCategoryOption.create({
          data: {
            name: resolvedName,
            label: resolvedLabel,
            isBuiltin: false,
            hiddenFromPicker: false,
          },
        });
      }

      await tx.store.updateMany({
        where: mergeStoreWhere({ customCategory: currentName }),
        data: { customCategory: resolvedName },
      });
    });
  } else {
    await prisma.storeCategoryOption.upsert({
      where: { name: currentName },
      create: {
        name: currentName,
        label: resolvedLabel,
        isBuiltin: false,
        hiddenFromPicker: false,
      },
      update: { label: resolvedLabel, hiddenFromPicker: false },
    });
  }

  return {
    name: resolvedName,
    label: resolvedLabel,
    isBuiltin: false,
    hiddenFromPicker: false,
    storeCount: await countStoresForCategoryKey(resolvedName, false),
  };
}

export async function deleteStoreCategoryOption(name: string): Promise<void> {
  const normalized = normalizeCategoryName(name);
  if (!normalized) {
    throw new Error("Category name is required.");
  }

  const existing = await prisma.storeCategoryOption.findUnique({
    where: { name: normalized },
  });

  const isBuiltin = existing?.isBuiltin ?? isBuiltinStoreCategoryKey(normalized);

  if (isBuiltin) {
    await ensureStoreCategoryCatalog();
    await prisma.storeCategoryOption.update({
      where: { name: normalized },
      data: { hiddenFromPicker: true },
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.store.updateMany({
      where: mergeStoreWhere({ customCategory: normalized }),
      data: { customCategory: null },
    });

    await tx.storeCategoryOption.deleteMany({
      where: { name: normalized },
    });
  });
}

export async function restoreStoreCategoryOption(name: string): Promise<StoreCategoryChoice> {
  const normalized = normalizeCategoryName(name);
  if (!normalized) {
    throw new Error("Category name is required.");
  }

  await ensureStoreCategoryCatalog();

  const row = await prisma.storeCategoryOption.update({
    where: { name: normalized },
    data: { hiddenFromPicker: false },
  });

  return {
    name: row.name,
    label: row.label,
    isBuiltin: row.isBuiltin,
    hiddenFromPicker: false,
    storeCount: await countStoresForCategoryKey(row.name, row.isBuiltin),
  };
}
