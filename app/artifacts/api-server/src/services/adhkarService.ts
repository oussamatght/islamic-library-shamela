import { cached } from "../lib/cache";
import { NotFoundError } from "../lib/errors";
import { httpsUrl, isJsonRecord, type JsonRecord } from "../lib/network";
import hisnCategories from "../data/hisn-categories.json";

export type AdhkarCategory = {
  id: string;
  nameAr: string;
  count: number;
  order: number;
};

export type AdhkarItem = {
  id: string;
  categoryId: string;
  title: string;
  arabicText: string;
  translation?: string;
  transliteration?: string;
  source: string;
  reference?: string;
  repeatCount: number;
  order: number;
  audioUrl?: string;
};

type HisnCategoryMeta = {
  id: string;
  source: number;
  nameAr: string;
  count: number;
  order: number;
};

const HISN_API = "https://www.hisnmuslim.com/api/ar";
const SOURCE_NAME = "والحصن المسلم (hisnmuslim.com)";
const CATEGORY_CACHE_MS = 24 * 60 * 60 * 1000;

const manifest = hisnCategories as HisnCategoryMeta[];

const manifestById = new Map<string, HisnCategoryMeta>(
  manifest.map((category) => [category.id, category]),
);

function itemId(source: number, sourceItemId: number): string {
  return `hisn-${source}-${sourceItemId}`;
}

type HisnItemRaw = {
  ID?: unknown;
  ARABIC_TEXT?: unknown;
  LANGUAGE_ARABIC_TRANSLATED_TEXT?: unknown;
  TRANSLATED_TEXT?: unknown;
  REPEAT?: unknown;
  AUDIO?: unknown;
};

export function listCategories(): AdhkarCategory[] {
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

export function getCategoryMeta(categoryId: string): HisnCategoryMeta {
  const category = manifestById.get(categoryId);
  if (!category) {
    throw new NotFoundError("ADHKAR_CATEGORY_NOT_FOUND", "هذا التصنيف غير موجود");
  }
  return category;
}

function isKnownCategory(categoryId: string): boolean {
  return manifestById.has(categoryId);
}

async function fetchHisnItems(source: number): Promise<HisnItemRaw[]> {
  const response = await fetch(`${HISN_API}/${source}.json`, {
    headers: { "user-agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new NotFoundError("ADHKAR_CATEGORY_NOT_FOUND", "هذا التصنيف غير موجود");
  }
  const payload: unknown = await response.json();
  const entries = Object.entries(
    isJsonRecord(payload) ? payload : {},
  );
  const first = entries[0];
  if (!first || !Array.isArray(first[1])) {
    return [];
  }
  return first[1] as unknown as HisnItemRaw[];
}

function normalizeItem(
  raw: HisnItemRaw,
  category: HisnCategoryMeta,
  index: number,
): AdhkarItem {
  const arabicText = String(raw.ARABIC_TEXT ?? "").trim();
  const translationRaw = String(raw.LANGUAGE_ARABIC_TRANSLATED_TEXT ?? "").trim();
  const sourceItemId = Number(raw.ID) || 1;

  return {
    id: itemId(category.source, sourceItemId),
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

async function getCategoryItems(category: HisnCategoryMeta): Promise<AdhkarItem[]> {
  const raws = await cached(
    `adhkar:category:${category.source}`,
    CATEGORY_CACHE_MS,
    () => fetchHisnItems(category.source),
  );
  return raws.map((raw, index) => normalizeItem(raw, category, index));
}

export async function getCategory(
  categoryId: string,
): Promise<{ category: AdhkarCategory; items: AdhkarItem[] }> {
  const category = getCategoryMeta(categoryId);
  const items = await getCategoryItems(category);
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

export async function listAdhkar(categoryId?: string): Promise<AdhkarItem[]> {
  if (categoryId) {
    if (!isKnownCategory(categoryId)) {
      throw new NotFoundError("ADHKAR_CATEGORY_NOT_FOUND", "هذا التصنيف غير موجود");
    }
    return hydratedItems(categoryId);
  }

  const chunks = await Promise.all(
    manifest
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((category) => getCategoryItems(category)),
  );
  return chunks.flat();
}

async function hydratedItems(categoryId: string): Promise<AdhkarItem[]> {
  const { items } = await getCategory(categoryId);
  return items;
}

export async function getAdhkarItem(adhkarId: string): Promise<AdhkarItem> {
  const match = /^hisn-(\d+)-(\d+)$/.exec(adhkarId);
  if (!match) {
    throw new NotFoundError("ADHKAR_NOT_FOUND", "هذا الذكر غير موجود");
  }
  const source = Number(match[1]);
  const categoryId = `hisn-${source}`;
  if (!isKnownCategory(categoryId)) {
    throw new NotFoundError("ADHKAR_NOT_FOUND", "هذا الذكر غير موجود");
  }
  const category = manifestById.get(categoryId)!;
  const items = await getCategoryItems(category);
  const item = items.find((candidate) => candidate.id === adhkarId);
  if (!item) {
    throw new NotFoundError("ADHKAR_NOT_FOUND", "هذا الذكر غير موجود");
  }
  return item;
}