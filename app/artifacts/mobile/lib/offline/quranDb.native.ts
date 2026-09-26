import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";
import type {
  QuranChapter,
  QuranJuz,
  QuranSurah,
  QuranTafsir,
  QuranVerse,
} from "@/lib/api/types";

/**
 * Offline Quran store (Task 5) — SQLite via expo-sqlite.
 *
 * Size rationale: the full Uthmani text is ~1.6–2.5MB across 6,236 ayahs —
 * above what AsyncStorage should hold (Android LSM ~6MB total app limit),
 * so a relational local store is the right fit.
 *
 * Schema (mirrors the API data model):
 *   chapters(id, nameArabic, nameEnglish, revelationPlace, versesCount)
 *   ayahs(surahId, number, text, juz, page)  — surahId+number = PK
 *   tafsir(surahId, ayahNumber, resourceName, text) — on-demand cache
 *
 * Web note: expo-sqlite falls back to SQLite WASM on web; everything is
 * guarded so a failure degrades to online-only mode without crashing.
 */

const DB_NAME = "sakinah-quran.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase | null {
  if (dbInstance) return dbInstance;
  try {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
    dbInstance.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS chapters (
        id INTEGER PRIMARY KEY,
        nameArabic TEXT NOT NULL,
        nameEnglish TEXT NOT NULL,
        revelationPlace TEXT NOT NULL,
        versesCount INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ayahs (
        surahId INTEGER NOT NULL,
        number INTEGER NOT NULL,
        text TEXT NOT NULL,
        juz INTEGER NOT NULL,
        page INTEGER NOT NULL,
        PRIMARY KEY (surahId, number)
      );
      CREATE INDEX IF NOT EXISTS idx_ayahs_juz ON ayahs(juz);
      CREATE TABLE IF NOT EXISTS tafsir (
        surahId INTEGER NOT NULL,
        ayahNumber INTEGER NOT NULL,
        resourceName TEXT NOT NULL,
        text TEXT NOT NULL,
        PRIMARY KEY (surahId, ayahNumber)
      );
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    return dbInstance;
  } catch {
    // Native module unavailable (e.g. tests) — degrade to online-only mode.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Download state
// ---------------------------------------------------------------------------

export type DownloadState = {
  downloadedAt: string | null;
  ayahCount: number;
};

export function getOfflineQuranState(): DownloadState {
  const db = getDb();
  if (!db) return { downloadedAt: null, ayahCount: 0 };
  try {
    const row = db.getFirstSync<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'quran.downloadedAt'",
    );
    const count = db.getFirstSync<{ total: number }>(
      "SELECT COUNT(*) as total FROM ayahs",
    );
    return { downloadedAt: row?.value ?? null, ayahCount: count?.total ?? 0 };
  } catch {
    return { downloadedAt: null, ayahCount: 0 };
  }
}

export function isQuranDownloaded(): boolean {
  const state = getOfflineQuranState();
  return state.downloadedAt !== null && state.ayahCount >= 6230;
}

// ---------------------------------------------------------------------------
// Download — surahs fetched from the SAME providers the app already uses
// ---------------------------------------------------------------------------

/** Bismillah stripping — duplicated from lib/api/quran.ts (see that file). */
const BISMILLAH_BASE = /^بسم\s+ٱلله\s+ٱلرحمن\s+ٱلرحيم(?=\s|$)/;
const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

function stripLeadingBismillah(text: string): string {
  const stripped = text.replace(TASHKEEL, "");
  if (!BISMILLAH_BASE.test(stripped)) return text;
  const strippedPrefixLen = stripped.split(/\s/).slice(0, 4).join(" ").length;
  let originalIndex = 0;
  let seen = 0;
  while (originalIndex < text.length && seen < strippedPrefixLen) {
    const char = text[originalIndex];
    if (char !== char.replace(TASHKEEL, "")) seen += 1;
    originalIndex += 1;
  }
  while (
    originalIndex < text.length &&
    (/\s/.test(text[originalIndex]) ||
      text[originalIndex] !== text[originalIndex].replace(TASHKEEL, ""))
  ) {
    originalIndex += 1;
  }
  return text.slice(originalIndex).trim();
}

export type DownloadProgress = {
  phase: "chapters" | "surahs";
  done: number;
  total: number;
};

/**
 * Downloads the whole Quran (chapters + 114 surahs, Uthmani). Surah requests
 * run in small batches to stay gentle on the free API; each surah commits as
 * it lands so an interrupted download can resume (already-filled surahs are
 * skipped via the meta marker per surah).
 */
export async function downloadQuran(
  fetchSurah: (surahId: number) => Promise<QuranSurah>,
  fetchChapters: () => Promise<QuranChapter[]>,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<{ ayahCount: number }> {
  const db = getDb();
  if (!db) throw new Error("التخزين المحلي غير متاح على هذا الجهاز");

  const chapters = await fetchChapters();
  db.execSync("DELETE FROM chapters;");
  db.withTransactionSync(() => {
    for (const chapter of chapters) {
      db.runSync(
        "INSERT OR REPLACE INTO chapters (id, nameArabic, nameEnglish, revelationPlace, versesCount) VALUES (?, ?, ?, ?, ?)",
        chapter.id,
        chapter.nameArabic,
        chapter.nameEnglish,
        chapter.revelationPlace,
        chapter.versesCount,
      );
    }
  });
  onProgress?.({ phase: "chapters", done: 1, total: 1 });

  let inserted = 0;
  const BATCH = 6;
  for (let start = 1; start <= 114; start += BATCH) {
    const end = Math.min(start + BATCH - 1, 114);
    const surahs = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, index) => start + index).map(
        (surahId) => fetchSurah(surahId),
      ),
    );
    db.withTransactionSync(() => {
      for (const surah of surahs) {
        db.runSync(
          "INSERT OR REPLACE INTO meta (key, value) VALUES ('quran.surah.' || ?, '1')",
          surah.id,
        );
        for (const verse of surah.verses) {
          db.runSync(
            "INSERT OR REPLACE INTO ayahs (surahId, number, text, juz, page) VALUES (?, ?, ?, ?, ?)",
            surah.id,
            verse.verseNumber,
            verse.text,
            verse.juz,
            verse.page,
          );
          inserted += 1;
        }
      }
    });
    onProgress?.({ phase: "surahs", done: end, total: 114 });
  }

  db.runSync(
    "INSERT OR REPLACE INTO meta (key, value) VALUES ('quran.downloadedAt', ?)",
    new Date().toISOString(),
  );
  return { ayahCount: inserted };
}

// ---------------------------------------------------------------------------
// Local reads — same shapes the API fetchers return
// ---------------------------------------------------------------------------

export function getLocalChapters(): QuranChapter[] | null {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = db.getAllSync<{
      id: number;
      nameArabic: string;
      nameEnglish: string;
      revelationPlace: string;
      versesCount: number;
    }>("SELECT * FROM chapters ORDER BY id");
    if (rows.length === 0) return null;
    return rows.map((row) => ({ ...row }));
  } catch {
    return null;
  }
}

export function getLocalSurah(surahId: number): QuranSurah | null {
  const db = getDb();
  if (!db) return null;
  try {
    const chapter = db.getFirstSync<{
      id: number;
      nameArabic: string;
      nameEnglish: string;
      revelationPlace: string;
      versesCount: number;
    }>("SELECT * FROM chapters WHERE id = ?", surahId);
    if (!chapter) return null;
    const rows = db.getAllSync<{
      number: number;
      text: string;
      juz: number;
      page: number;
    }>(
      "SELECT number, text, juz, page FROM ayahs WHERE surahId = ? ORDER BY number",
      surahId,
    );
    if (rows.length === 0) return null;
    const verses: QuranVerse[] = rows.map((row) => ({
      id: surahId * 1000 + row.number,
      verseNumber: row.number,
      verseKey: `${surahId}:${row.number}`,
      text: row.text,
      juz: row.juz,
      page: row.page,
    }));
    return { ...chapter, verses };
  } catch {
    return null;
  }
}

export function getLocalJuz(juz: number): QuranJuz | null {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = db.getAllSync<{
      surahId: number;
      number: number;
      text: string;
      page: number;
      nameArabic: string;
    }>(
      `SELECT a.surahId, a.number, a.text, a.page, c.nameArabic
       FROM ayahs a LEFT JOIN chapters c ON c.id = a.surahId
       WHERE a.juz = ? ORDER BY a.surahId, a.number`,
      juz,
    );
    if (rows.length === 0) return null;
    const ranges = new Map<
      number,
      { surahId: number; nameArabic: string; fromAyah: number; toAyah: number; startPage: number }
    >();
    for (const row of rows) {
      const existing = ranges.get(row.surahId);
      if (existing) {
        existing.toAyah = row.number;
      } else {
        ranges.set(row.surahId, {
          surahId: row.surahId,
          nameArabic: row.nameArabic ?? `السورة ${row.surahId}`,
          fromAyah: row.number,
          toAyah: row.number,
          startPage: row.page,
        });
      }
    }
    return {
      juz,
      ayahCount: rows.length,
      surahRanges: [...ranges.values()],
      verses: rows.map((row) => ({
        id: row.surahId * 1000 + row.number,
        verseNumber: row.number,
        verseKey: `${row.surahId}:${row.number}`,
        text: row.text,
        juz,
        page: row.page,
      })),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tafsir on-demand cache (fetch → store → read offline afterwards)
// ---------------------------------------------------------------------------

export function getLocalTafsir(
  surahId: number,
  ayahNumber: number,
): QuranTafsir | null {
  const db = getDb();
  if (!db) return null;
  try {
    const row = db.getFirstSync<{
      surahId: number;
      ayahNumber: number;
      resourceName: string;
      text: string;
    }>(
      "SELECT * FROM tafsir WHERE surahId = ? AND ayahNumber = ?",
      surahId,
      ayahNumber,
    );
    return row ?? null;
  } catch {
    return null;
  }
}

export function storeLocalTafsir(tafsir: QuranTafsir): void {
  const db = getDb();
  if (!db) return;
  try {
    db.runSync(
      "INSERT OR REPLACE INTO tafsir (surahId, ayahNumber, resourceName, text) VALUES (?, ?, ?, ?)",
      tafsir.surahId,
      tafsir.ayahNumber,
      tafsir.resourceName,
      tafsir.text,
    );
  } catch {
    // Cache write failures are non-fatal by design.
  }
}

/** True when the whole Quran is stored locally on this device. */
export function offlineSupported(): boolean {
  return Platform.OS !== "web" || getDb() !== null;
}
