/**
 * Adhkar data — direct calls to hisnmuslim.com (auth-free), with the category
 * manifest bundled locally (lib/api/data/hisn-categories.json) exactly like
 * the server did. Normalization ported from adhkarService.ts.
 */

import { fetchJson, httpsUrl, isJsonRecord } from "./http";
import type { AdhkarCategory, AdhkarItem } from "./types";
import hisnCategoriesJson from "./data/hisn-categories.json";

const HISN_API = "https://www.hisnmuslim.com/api/ar";
const SOURCE_NAME = "الحصن المسلم";

type HisnCategoryMeta = {
  id: string;
  source: number;
  nameAr: string;
  count: number;
  order: number;
};

const manifest = hisnCategoriesJson as HisnCategoryMeta[];

const manifestById = new Map<string, HisnCategoryMeta>(
  manifest.map((category) => [category.id, category]),
);

export function listAdhkarCategories(): AdhkarCategory[] {
  return manifest
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((category) => ({
      id: category.id,
      nameAr: category.nameAr,
      count: category.count,
      order: category.order,
    }));
}

type HisnItemRaw = {
  ID?: unknown;
  ARABIC_TEXT?: unknown;
  LANGUAGE_ARABIC_TRANSLATED_TEXT?: unknown;
  TRANSLATED_TEXT?: unknown;
  REPEAT?: unknown;
  AUDIO?: unknown;
};

async function fetchHisnItems(source: number): Promise<HisnItemRaw[]> {
  const response = await fetch(`${HISN_API}/${source}.json`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const error = new Error("هذا التصنيف غير موجود") as Error & { code?: string };
    error.code = "ADHKAR_CATEGORY_NOT_FOUND";
    throw error;
  }
  const payload: unknown = await response.json();
  // Upstream files are objects whose first array-valued property holds the
  // items (shape varies per file) — same heuristic the server used.
  const entries = Object.entries(isJsonRecord(payload) ? payload : {});
  const first = entries[0];
  if (!first || !Array.isArray(first[1])) return [];
  return first[1] as unknown as HisnItemRaw[];
}

function normalizeItem(
  raw: HisnItemRaw,
  category: HisnCategoryMeta,
  index: number,
): AdhkarItem {
  const arabicText = String(raw.ARABIC_TEXT ?? "").trim();
  const translationRaw = String(
    raw.LANGUAGE_ARABIC_TRANSLATED_TEXT ?? raw.TRANSLATED_TEXT ?? "",
  ).trim();
  const sourceItemId = Number(raw.ID) || 1;
  return {
    id: `hisn-${category.source}-${sourceItemId}`,
    categoryId: category.id,
    title: category.nameAr,
    arabicText,
    ...(translationRaw ? { translation: translationRaw } : {}),
    source: SOURCE_NAME,
    repeatCount: Math.max(Number(raw.REPEAT ?? 1) || 1, 1),
    order: index + 1,
    ...(raw.AUDIO ? { audioUrl: httpsUrl(String(raw.AUDIO)) } : {}),
  };
}

export async function fetchAdhkarCategoryItems(
  categoryId: string,
): Promise<{ category: AdhkarCategory; items: AdhkarItem[] }> {
  const category = manifestById.get(categoryId);
  if (!category) {
    const error = new Error("هذا التصنيف غير موجود") as Error & { code?: string };
    error.code = "ADHKAR_CATEGORY_NOT_FOUND";
    throw error;
  }
  const raws = await fetchHisnItems(category.source);
  const items = raws.map((raw, index) => normalizeItem(raw, category, index));
  return {
    category: {
      id: category.id,
      nameAr: category.nameAr,
      count: items.length,
      order: category.order,
    },
    items,
  };
}

/**
 * DhikrCollection shape consumed by the adhkar screens: categories with
 * hydrated items. Without a categoryId we hydrate the morning/evening and
 * sleep dhikr categories by default (hydrating all ~130 files at once would
 * be slow and unfair to the provider).
 */
export async function fetchAdhkarCollection(
  categoryId?: string,
): Promise<
  Array<{ id: string; title: string; count: number; items: AdhkarItem[] }>
> {
  if (categoryId) {
    const { category, items } = await fetchAdhkarCategoryItems(categoryId);
    return [{ id: category.id, title: category.nameAr, count: items.length, items }];
  }
  const defaults = ["hisn-27", "hisn-28"];
  const chunks = await Promise.all(
    defaults.map((id) => fetchAdhkarCategoryItems(id)),
  );
  return chunks.map(({ category, items }) => ({
    id: category.id,
    title: category.nameAr,
    count: items.length,
    items,
  }));
}

export async function fetchAdhkarItem(adhkarId: string): Promise<AdhkarItem> {
  const match = /^hisn-(\d+)-(\d+)$/.exec(adhkarId);
  if (!match) {
    const error = new Error("هذا الذكر غير موجود") as Error & { code?: string };
    error.code = "ADHKAR_NOT_FOUND";
    throw error;
  }
  const categoryId = `hisn-${match[1]}`;
  const { items } = await fetchAdhkarCategoryItems(categoryId);
  const item = items.find((candidate) => candidate.id === adhkarId);
  if (!item) {
    const error = new Error("هذا الذكر غير موجود") as Error & { code?: string };
    error.code = "ADHKAR_NOT_FOUND";
    throw error;
  }
  return item;
}
