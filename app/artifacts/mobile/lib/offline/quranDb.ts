/**
 * Web stub for the offline Quran store.
 *
 * expo-sqlite's web build needs a wa-sqlite WASM asset that isn't shipped
 * (Metro resolves `expo-sqlite/web/worker.ts` on web and fails on the missing
 * .wasm). Rather than bundling WASM for web, the offline download feature is
 * native-only; the web app stays online-only and everything else keeps
 * working. Metro picks this file over quranDb.native.ts via platform
 * extensions.
 */

import type {
  QuranChapter,
  QuranJuz,
  QuranSurah,
  QuranTafsir,
} from "@/lib/api/types";

export type DownloadState = {
  downloadedAt: string | null;
  ayahCount: number;
};

export type DownloadProgress = {
  phase: "chapters" | "surahs";
  done: number;
  total: number;
};

export function getOfflineQuranState(): DownloadState {
  return { downloadedAt: null, ayahCount: 0 };
}

export function isQuranDownloaded(): boolean {
  return false;
}

export async function downloadQuran(
  _fetchSurah: (surahId: number) => Promise<QuranSurah>,
  _fetchChapters: () => Promise<QuranChapter[]>,
  _onProgress?: (progress: DownloadProgress) => void,
): Promise<{ ayahCount: number }> {
  throw new Error("التنزيل بدون إنترنت متاح على تطبيق الهاتف فقط");
}

export function getLocalChapters(): QuranChapter[] | null {
  return null;
}

export function getLocalSurah(_surahId: number): QuranSurah | null {
  return null;
}

export function getLocalJuz(_juz: number): QuranJuz | null {
  return null;
}

export function getLocalTafsir(
  _surahId: number,
  _ayahNumber: number,
): QuranTafsir | null {
  return null;
}

export function storeLocalTafsir(_tafsir: QuranTafsir): void {
  // No local store on web.
}

export function offlineSupported(): boolean {
  return false;
}
