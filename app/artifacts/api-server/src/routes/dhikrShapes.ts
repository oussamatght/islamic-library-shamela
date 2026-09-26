import type { AdhkarCategory, AdhkarItem } from "../services/adhkarService";
import { getCategory, listCategories } from "../services/adhkarService";

/**
 * Shared adapter between `adhkarService` (internal shapes) and the OpenAPI
 * contract (`DhikrCollection`): reshapes categories/items so that
 * `GET /api/adhkar` and `GET /api/duas` return exactly what the generated
 * mobile client expects, without breaking the legacy category routes.
 */

export type DhikrPayload = {
  id: string;
  categoryId: string;
  title: string;
  text: string;
  translation?: string;
  source?: string;
  repeat: number;
  audioUrl?: string;
};

export type DhikrCategoryPayload = {
  id: string;
  title: string;
  count: number;
  items: DhikrPayload[];
};

export type DhikrCollectionPayload = {
  categories: DhikrCategoryPayload[];
};

export function toDhikr(item: AdhkarItem): DhikrPayload {
  return {
    id: item.id,
    categoryId: item.categoryId,
    title: item.title,
    text: item.arabicText,
    ...(item.translation ? { translation: item.translation } : {}),
    ...(item.source ? { source: item.source } : {}),
    repeat: item.repeatCount,
    ...(item.audioUrl ? { audioUrl: item.audioUrl } : {}),
  };
}

export function toDhikrCategory(
  category: AdhkarCategory,
  items: AdhkarItem[],
): DhikrCategoryPayload {
  return {
    id: category.id,
    title: category.nameAr,
    count: items.length > 0 ? items.length : category.count,
    items: items.map(toDhikr),
  };
}

/**
 * Builds the collection for `/adhkar` and `/duas`.
 *
 * - `categoryId` given  → a single category with its hydrated items.
 * - `categoryId` absent → every category from the manifest with metadata only
 *   (`items: []`); hydrating all ~130 upstream files at once would be slow and
 *   unfair to the provider. Clients that need items pass a `categoryId`.
 */
export async function buildDhikrCollection(
  categoryId?: string,
): Promise<DhikrCollectionPayload> {
  if (categoryId) {
    const { category, items } = await getCategory(categoryId);
    return { categories: [toDhikrCategory(category, items)] };
  }
  return {
    categories: listCategories().map((category) =>
      toDhikrCategory(category, []),
    ),
  };
}
