/**
 * Shared domain types for direct provider calls.
 *
 * The mobile app no longer talks to @workspace/api-server; screens consume
 * these shapes directly. They intentionally match the shapes the server used
 * to normalize to, so screens compile unchanged.
 */

export type QuranChapter = {
  id: number;
  nameArabic: string;
  nameEnglish: string;
  revelationPlace: string;
  versesCount: number;
};

/** Chapter → mushaf page-range (start, end) for the juz/page pickers. */
export type QuranChapterPage = {
  id: number;
  nameArabic: string;
  startPage: number;
  endPage: number;
  versesCount: number;
  revelationPlace: string;
};

export type QuranVerse = {
  id: number;
  verseNumber: number;
  verseKey: string;
  text: string;
  juz: number;
  page: number;
};

export type QuranSurah = QuranChapter & {
  verses: QuranVerse[];
};

export type QuranAudio = {
  surahId: number;
  audioUrl: string;
  reciter: string;
  format: string;
};

export type QuranTafsir = {
  surahId: number;
  ayahNumber: number;
  resourceName: string;
  text: string;
};

export type HadithItem = {
  id: string;
  title: string;
  text: string;
  source: string;
  attribution?: string;
  grade?: string;
  reference?: string;
};

export type HadithPage = {
  items: HadithItem[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
};

export type HadithCategoryNode = {
  id: string;
  titleAr: string;
  count: number;
  parentId: string | null;
  children: HadithCategoryNode[];
};

/** A canonical hadith book (Bukhari, Muslim, …) for the browsing UI. */
export type HadithBook = {
  slug: string;
  nameAr: string;
  nameEn: string;
  total: number;
};

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
  source: string;
  reference?: string;
  repeatCount: number;
  order: number;
  audioUrl?: string;
};

export type PrayerTimesResult = {
  date: string;
  hijriDate: string;
  timezone: string;
  location: { latitude: number; longitude: number };
  timings: Record<string, string>;
};

/** Thrown by every fetcher — message is Arabic, ready to show inline. */
export class UpstreamError extends Error {
  readonly source: string;
  constructor(source: string, message?: string) {
    super(message ?? `تعذر الوصول إلى ${source}، تحقق من اتصالك وحاول مجددًا.`);
    this.name = "UpstreamError";
    this.source = source;
  }
}
