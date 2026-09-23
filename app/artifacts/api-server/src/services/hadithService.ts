import { cached } from "../lib/cache";
import { NotFoundError, UpstreamError } from "../lib/errors";
import { fetchJson, intString, isJsonRecord, type JsonRecord } from "../lib/network";

export type HadithCategoryNode = {
  id: string;
  titleAr: string;
  count: number;
  parentId: string | null;
  children: HadithCategoryNode[];
};

export type HadithListItem = {
  id: string;
  title: string;
};

export type HadithDetail = {
  id: string;
  title: string;
  hadith: string;
  attribution?: string;
  grade?: string;
  explanation?: string;
  reference?: string;
  categories?: HadithCategorySummary[];
};

export type HadithCategorySummary = {
  id: string;
  title: string;
};

export type HadithPage = {
  items: HadithListItem[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
};

const HADEETH_ENC = "https://hadeethenc.com/api/v1";
const SOURCE_NAME = "hadeethenc.com";
const CATEGORIES_CACHE_MS = 24 * 60 * 60 * 1000;
const LIST_CACHE_MS = 60 * 60 * 1000;

type HadeethCategoryRaw = {
  id?: unknown;
  title?: unknown;
  hadeeths_count?: unknown;
  parent_id?: unknown;
};

type RootResponse = HadeethCategoryRaw[];
type ListResponse = HadeethCategoryRaw[];

async function rawRoots(): Promise<RootResponse> {
  const payload = await cached(`hadith:roots`, CATEGORIES_CACHE_MS, () =>
    fetchJson<RootResponse>(
      `${HADEETH_ENC}/categories/roots/?language=ar`,
      SOURCE_NAME,
    ),
  );
  return payload ?? [];
}

async function rawListCategories(): Promise<ListResponse> {
  const payload = await cached(`hadith:categories`, CATEGORIES_CACHE_MS, () =>
    fetchJson<ListResponse>(
      `${HADEETH_ENC}/categories/list/?language=ar`,
      SOURCE_NAME,
    ),
  );
  return payload ?? [];
}

function normalizeCategory(raw: HadeethCategoryRaw): Omit<HadithCategoryNode, "children"> {
  const id = String(raw.id ?? "");
  return {
    id,
    titleAr: String(raw.title ?? ""),
    count: intString(raw.hadeeths_count, 0) ?? 0,
    parentId: raw.parent_id === null || raw.parent_id === undefined ? null : String(raw.parent_id),
  };
}

export async function listHadithCategories(): Promise<HadithCategoryNode[]> {
  const [roots, flat] = await Promise.all([rawRoots(), rawListCategories()]);

  const rootsNorm = roots.map(normalizeCategory);
  const children = flat.filter((raw) => {
    const parentId = raw.parent_id;
    return parentId !== null && parentId !== undefined;
  });
  const childrenByParent = new Map<string, HadithCategoryNode[]>();
  for (const raw of children) {
    const node = normalizeCategory(raw);
    const list = childrenByParent.get(node.parentId!) ?? [];
    list.push({ ...node, children: [] });
    childrenByParent.set(node.parentId!, list);
  }

  return rootsNorm.map((root) => ({
    ...root,
    children: (childrenByParent.get(root.id) ?? []).sort((a, b) => a.titleAr.localeCompare(b.titleAr)),
  }));
}

export async function getHadithCategoryList(categoryId: string): Promise<HadithCategoryNode[]> {
  const roots = await listHadithCategories();
  for (const root of roots) {
    if (root.id === categoryId) return root.children;
  }
  throw new NotFoundError("HADITH_CATEGORY_NOT_FOUND", "هذا التصنيف غير موجود");
}

type HadithListEnvelope = {
  data?: unknown;
  meta?: unknown;
};

function normalizeListItem(raw: JsonRecord): HadithListItem {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
  };
}

function normalizeMeta(meta: JsonRecord): Omit<HadithPage, "items"> | null {
  const currentPage = intString(meta.current_page);
  const perPage = intString(meta.per_page);
  const total = intString(meta.total_items);
  const lastPage = intString(meta.last_page);
  if (currentPage === undefined || perPage === undefined || total === undefined) {
    return null;
  }
  return {
    page: currentPage,
    perPage,
    total,
    hasMore: lastPage !== undefined ? currentPage < lastPage : currentPage * perPage < total,
  };
}

export async function listHadiths(
  categoryId: string,
  page: number,
  perPage: number,
): Promise<HadithPage> {
  const safePerPage = Math.min(Math.max(perPage, 1), 50);
  const safePage = Math.max(page, 1);

  const payload = await cached(
    `hadith:list:${categoryId}:${safePage}:${safePerPage}`,
    LIST_CACHE_MS,
    async () =>
      fetchJson<HadithListEnvelope>(
        `${HADEETH_ENC}/hadeeths/list/?language=ar&category_id=${encodeURIComponent(categoryId)}&page=${safePage}&per_page=${safePerPage}`,
        SOURCE_NAME,
      ),
  );

  const data = Array.isArray(payload.data) ? payload.data : [];
  const items = data
    .filter(isJsonRecord)
    .map(normalizeListItem)
    .filter((item) => item.id);

  const metaDefaults = { page: safePage, perPage: safePerPage, total: items.length, hasMore: false };
  const metaNorm = isJsonRecord(payload.meta) ? normalizeMeta(payload.meta) : null;
  return { items, ...(metaNorm ?? metaDefaults) };
}

type HadithOneRaw = JsonRecord & {
  id?: unknown;
  title?: unknown;
  hadeeth?: unknown;
  attribution?: unknown;
  grade?: unknown;
  explanation?: unknown;
  categories?: unknown;
  reference?: unknown;
};

function normalizeReference(raw: HadithOneRaw): string | undefined {
  if (typeof raw.reference === "string" && raw.reference.trim()) {
    return raw.reference.trim();
  }
  if (raw.categories !== undefined) {
    const first = Array.isArray(raw.categories) ? raw.categories[0] : undefined;
    if (isJsonRecord(first)) {
      const title = first.title;
      if (typeof title === "string" && title.trim()) {
        return title.trim();
      }
    }
  }
  return undefined;
}

function normalizeCategories(raw: HadithOneRaw): HadithCategorySummary[] {
  if (!Array.isArray(raw.categories)) return [];
  return raw.categories
    .filter(isJsonRecord)
    .map((category) => ({
      id: String(category.id ?? ""),
      title: String(category.title ?? ""),
    }))
    .filter((category) => category.id);
}

export async function getHadith(hadithId: string): Promise<HadithDetail> {
  const payload = await cached(
    `hadith:one:${hadithId}`,
    LIST_CACHE_MS,
    async () =>
      fetchJson<HadithOneRaw>(
        `${HADEETH_ENC}/hadeeths/one/?language=ar&id=${encodeURIComponent(hadithId)}`,
        SOURCE_NAME,
      ),
  );

  const title = String(payload.title ?? "").trim();
  if (payload.id == null && !title) {
    throw new NotFoundError("HADITH_NOT_FOUND", "هذا الحديث غير موجود");
  }

  return {
    id: String(payload.id ?? ""),
    title,
    hadith: String(payload.hadeeth ?? ""),
    ...(stringProp(payload.attribution) ? { attribution: stringProp(payload.attribution)! } : {}),
    ...(stringProp(payload.grade) ? { grade: stringProp(payload.grade)! } : {}),
    ...(stringProp(payload.explanation) ? { explanation: stringProp(payload.explanation)! } : {}),
    ...(normalizeReference(payload) ? { reference: normalizeReference(payload)! } : {}),
    ...(normalizeCategories(payload).length ? { categories: normalizeCategories(payload) } : {}),
  };
}

export async function searchHadiths(
  phrase: string,
  page: number,
  perPage: number,
): Promise<HadithPage> {
  const safePerPage = Math.min(Math.max(perPage, 1), 50);
  const safePage = Math.max(page, 1);

  const payload = await fetchJson<HadithListEnvelope>(
    `${HADEETH_ENC}/hadeeths/search/?phrase=${encodeURIComponent(phrase)}&language=ar&page=${safePage}&per_page=${safePerPage}`,
    SOURCE_NAME,
    { timeoutMs: 25_000 },
  );

  const data = Array.isArray(payload.data) ? payload.data : [];
  const items = data
    .filter(isJsonRecord)
    .map(normalizeListItem)
    .filter((item) => item.id);

  const metaDefaults = { page: safePage, perPage: safePerPage, total: items.length, hasMore: false };
  const metaNorm = isJsonRecord(payload.meta) ? normalizeMeta(payload.meta) : null;
  return { items, ...(metaNorm ?? metaDefaults) };
}

function stringProp(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}