import { cached } from "../lib/cache";
import { NotFoundError, UpstreamError } from "../lib/errors";
import { fetchJson, isJsonRecord, type JsonRecord } from "../lib/network";;

export type QuranChapter = {
  id: number;
  nameArabic: string;
  nameEnglish: string;
  revelationPlace: string;
  versesCount: number;
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

type QfcEnvironment = "prelive" | "production";

type QfcHosts = { oauth: string; api: string };

const QFC_HOSTS: Record<QfcEnvironment, QfcHosts> = {
  prelive: {
    oauth: "https://prelive-oauth2.quran.foundation",
    api: "https://apis-prelive.quran.foundation",
  },
  production: {
    oauth: "https://oauth2.quran.foundation",
    api: "https://apis.quran.foundation",
  },
};

const DEFAULTS: QfcHosts = QFC_HOSTS.production;

const CONTENT_API = "/content/api/v4";
const RECITER = "Mishari Alafasy";
const TAFSIR_RESOURCE_ID = 169;

const QURAN_CLIENT_ID = process.env.QURAN_CLIENT_ID ?? process.env.QF_CLIENT_ID;
const QURAN_CLIENT_SECRET =
  process.env.QURAN_CLIENT_SECRET ?? process.env.QF_CLIENT_SECRET;
const QURAN_ENV = process.env.QURAN_ENV ?? process.env.QF_ENV ?? "production";

const REFRESH_BEFORE_SECONDS = 60;
const TOKEN_CACHE_KEY = "quran:token";

/**
 * Resolves the Quran Foundation hosts for the configured channel.
 *
 * Never mix pre-live credentials with production hosts (and vice versa);
 * the Developer Console issues separate credentials per environment and a
 * token created in one environment is rejected by API hosts of the other.
 */
function resolveHosts(): QfcHosts {
  const raw = QURAN_ENV.trim().toLowerCase();
  const base = raw === "prelive" || raw === "production" ? QFC_HOSTS[raw] : undefined;
  const defaults = base ?? DEFAULTS;

  const oauth = process.env.QURAN_OAUTH_URL?.trim() || defaults.oauth;
  const api = process.env.QURAN_API_URL?.trim() || defaults.api;
  return { oauth, api };
}

function tokenCacheKey(): string {
  return `${TOKEN_CACHE_KEY}:${resolveHosts().oauth}`;
}

async function requestAccessToken(forceRefresh: boolean): Promise<string> {
  if (!QURAN_CLIENT_ID || !QURAN_CLIENT_SECRET) {
    throw new UpstreamError("Quran authentication", 503);
  }

  const cacheKey = tokenCacheKey();
  if (!forceRefresh) {
    const cachedToken = await getToken();
    if (cachedToken) return cachedToken;
  }

  let response: globalThis.Response;
  try {
    const basicCredentials = Buffer.from(
      `${QURAN_CLIENT_ID}:${QURAN_CLIENT_SECRET}`,
    ).toString("base64");
    response = await fetch(`${resolveHosts().oauth}/oauth2/token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${basicCredentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=content",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new UpstreamError("Quran authentication", 503);
  }

  if (!response.ok) {
    throw new UpstreamError("Quran authentication", 503);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new UpstreamError("Quran authentication", 503);
  }

  if (
    !isJsonRecord(payload) ||
    typeof payload.access_token !== "string" ||
    !payload.access_token
  ) {
    throw new UpstreamError("Quran authentication", 503);
  }

  const expiresIn = Number(payload.expires_in ?? 3600);
  const ttlMs = Math.max(Math.floor((expiresIn - REFRESH_BEFORE_SECONDS) * 1000), 5000);
  const token = payload.access_token;
  await setToken(cacheKey, token, ttlMs);
  return token;
}

let tokenStore = new Map<string, { value: string; expiresAt: number }>();

async function getToken(): Promise<string | null> {
  const current = tokenStore.get(tokenCacheKey());
  if (current && current.expiresAt > Date.now()) {
    return current.value;
  }
  return null;
}

async function setToken(
  key: string,
  value: string,
  ttlMs: number,
): Promise<void> {
  tokenStore.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function getQuranJson<T>(apiPath: string, source: string): Promise<T> {
  let token = await requestAccessToken(false);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: globalThis.Response;
    try {
      response = await fetch(`${resolveHosts().api}${CONTENT_API}${apiPath}`, {
        headers: {
          Accept: "application/json",
          "x-auth-token": token,
          "x-client-id": QURAN_CLIENT_ID!,
        },
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new UpstreamError(source);
    }

    if (response.status === 401 && attempt === 0) {
      token = await requestAccessToken(true);
      continue;
    }
    if (!response.ok) {
      throw new UpstreamError(source);
    }

    try {
      const payload: unknown = await response.json();
      if (!isJsonRecord(payload)) {
        throw new UpstreamError(source);
      }
      return payload as T;
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      throw new UpstreamError(source);
    }
  }

  throw new UpstreamError(source);
}

function mapChapter(raw: JsonRecord): QuranChapter {
  return {
    id: Number(raw.id),
    nameArabic: String(raw.name_arabic ?? ""),
    nameEnglish: String(raw.name_simple ?? ""),
    revelationPlace: String(raw.revelation_place ?? ""),
    versesCount: Number(raw.verses_count ?? 0),
  };
}

function mapVerse(raw: JsonRecord, fallbackSurahId: number): QuranVerse {
  const verseNumber = Number(raw.verse_number);
  return {
    id: Number(raw.id),
    verseNumber,
    verseKey: String(raw.verse_key ?? `${fallbackSurahId}:${verseNumber}`),
    text: String(raw.text_uthmani ?? ""),
    juz: Number(raw.juz_number ?? 0),
    page: Number(raw.page_number ?? 0),
  };
}

const CHAPTERS_CACHE_MS = 12 * 60 * 60 * 1000;
const SURAH_CACHE_MS = 12 * 60 * 60 * 1000;
const AUDIO_CACHE_MS = 12 * 60 * 60 * 1000;
const TAFSIR_CACHE_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Fallback provider: alquran.cloud (free, no auth).
//
// QFC credentials are issued per channel, and the prelive channel may expose
// only a subset of the 114 surahs (observed live: chapters 1–2 only, with 404
// for everything else). When QFC can't serve a chapter — or its credentials
// are missing entirely — we transparently fall back to alquran.cloud so the
// app keeps working. Same response shape, so callers don't care.
// ---------------------------------------------------------------------------

const ALQURAN_API = "https://api.alquran.cloud/v1";
const ALQURAN_RECITER = "Mishary Alafasy";

async function alquranChapters(): Promise<QuranChapter[]> {
  const payload = await fetchJson<{ data?: unknown }>(
    `${ALQURAN_API}/surah`,
    "Quran (fallback)",
  );
  const list = Array.isArray(payload.data) ? payload.data : [];
  return list
    .filter(isJsonRecord)
    .map((raw) => ({
      id: Number(raw.number),
      // `name` is the full Arabic name ("سُورَةُ الفَاتِحَةِ"); strip the prefix.
      nameArabic: String(raw.name ?? "").replace(/^سُورَةُ\s*/, ""),
      nameEnglish: String(raw.englishName ?? ""),
      revelationPlace: String(raw.revelationType ?? "") === "Meccan" ? "makkah" : "madinah",
      versesCount: Number(raw.numberOfAyahs ?? 0),
    }))
    .filter((chapter) => chapter.id > 0 && chapter.nameArabic)
    .sort((a, b) => a.id - b.id);
}

async function alquranSurah(surahId: number): Promise<QuranSurah | null> {
  const chapters = await getChapters();
  const chapter = chapters.find((candidate) => candidate.id === surahId);
  if (!chapter) return null;

  const payload = await fetchJson<{ data?: unknown }>(
    `${ALQURAN_API}/surah/${surahId}/quran-uthmani`,
    "Quran (fallback)",
  );
  const data = isJsonRecord(payload.data) ? payload.data : {};
  const ayahs = Array.isArray(data.ayahs) ? data.ayahs : [];
  const verses = ayahs
    .filter(isJsonRecord)
    .map((raw, index) => ({
      id: Number(raw.number) || index + 1,
      verseNumber: Number(raw.numberInSurah) || index + 1,
      verseKey: `${surahId}:${Number(raw.numberInSurah) || index + 1}`,
      // Edition merges bismillah into ayah 1 for non-Fatihah surahs — strip it.
      text: String(raw.text ?? "")
        .replace(
          surahId !== 1 && surahId !== 9
            ? /^بِسْمِ\s*ٱللَّهِ\s*ٱلرَّحْمَ[ـٰ]?نِ\s*ٱلرَّحِيمِ\s*/
            : /^(?!)/,
          "",
        )
        .trim(),
      juz: Number(raw.juz ?? 0),
      page: Number(raw.page ?? 0),
    }));
  return { ...chapter, verses };
}

async function alquranAudio(surahId: number): Promise<QuranAudio> {
  const payload = await fetchJson<{ data?: unknown }>(
    `${ALQURAN_API}/surah/${surahId}/ar.alafasy`,
    "Quran audio (fallback)",
  );
  const data = isJsonRecord(payload.data) ? payload.data : {};
  const ayahs = Array.isArray(data.ayahs) ? data.ayahs : [];
  const first = ayahs.find(isJsonRecord);
  const audioUrl = String(first?.audio ?? "");
  // Per-ayah URL → chapter-level URL (Alafasy files follow the 1..114 pattern).
  const chapterUrl = audioUrl.replace(/\/\d+\.mp3$/, `/${surahId}.mp3`);
  return {
    surahId,
    audioUrl: chapterUrl,
    reciter: ALQURAN_RECITER,
    format: "mp3",
  };
}

export async function getChapters(): Promise<QuranChapter[]> {
  return cached(`quran:chapters`, CHAPTERS_CACHE_MS, async () => {
    try {
      const payload = await getQuranJson<{ chapters: JsonRecord[] }>(
        "/chapters?language=ar",
        "Quran",
      );
      const chapters = (payload.chapters ?? [])
        .filter(isJsonRecord)
        .map(mapChapter)
        .filter((chapter) => chapter.id > 0 && chapter.nameArabic)
        .sort((a, b) => a.id - b.id);
      // QFC channel missing most of the Quran? Prefer the complete fallback.
      if (chapters.length >= 114) return chapters;
      return await alquranChapters();
    } catch (error) {
      if (error instanceof UpstreamError && !QURAN_CLIENT_ID) throw error;
      return await alquranChapters();
    }
  });
}

export async function getSurah(surahId: number): Promise<QuranSurah> {
  const chapters = await getChapters();
  const chapter = chapters.find((candidate) => candidate.id === surahId);
  if (!chapter) {
    throw new NotFoundError("SURAH_NOT_FOUND", "السورة غير موجودة");
  }

  const verses = await cached(
    `quran:surah:${surahId}`,
    SURAH_CACHE_MS,
    async () => {
      // QFC first (full metadata); fall back to alquran.cloud on any failure.
      try {
        const data = await getQuranJson<{ verses: JsonRecord[] }>(
          `/verses/by_chapter/${surahId}?language=ar&words=false&fields=text_uthmani,juz_number,page_number&per_page=300`,
          "Quran",
        );
        const raw = (data.verses ?? []).filter(isJsonRecord).map((verse) => mapVerse(verse, surahId));
        if (raw.length > 0) return raw;
        throw new UpstreamError("Quran");
      } catch {
        const fallback = await alquranSurah(surahId);
        if (!fallback || fallback.verses.length === 0) {
          throw new NotFoundError("SURAH_NOT_FOUND", "السورة غير موجودة");
        }
        return fallback.verses;
      }
    },
  );

  return { ...chapter, verses };
}

export async function getAudio(surahId: number): Promise<QuranAudio> {
  return cached(`quran:audio:${surahId}`, AUDIO_CACHE_MS, async () => {
    try {
      const payload = await getQuranJson<{ audio_file: JsonRecord }>(
        `/chapter_recitations/7/${surahId}?segments=false`,
        "Quran audio",
      );
      const audioFile = isJsonRecord(payload.audio_file) ? payload.audio_file : {};
      const audioUrl = String(audioFile.audio_url ?? "");
      if (audioUrl) {
        return {
          surahId,
          audioUrl,
          reciter: RECITER,
          format: String(audioFile.format ?? "mp3"),
        };
      }
      throw new UpstreamError("Quran audio");
    } catch {
      return alquranAudio(surahId);
    }
  });
}

export async function getTafsir(
  surahId: number,
  ayahNumber: number,
): Promise<QuranTafsir> {
  return cached(
    `quran:tafsir:${surahId}:${ayahNumber}`,
    TAFSIR_CACHE_MS,
    async () => {
      try {
        const payload = await getQuranJson<JsonRecord>(
          `/tafsirs/${TAFSIR_RESOURCE_ID}/by_ayah/${surahId}:${ayahNumber}`,
          "Quran tafsir",
        );
        const tafsir = (payload.tafsir ?? {}) as JsonRecord;
        const text = String(tafsir.text ?? "");
        if (text) {
          return {
            surahId,
            ayahNumber,
            resourceName: String(tafsir.resource_name ?? "Ibn Kathir"),
            text,
          };
        }
        throw new UpstreamError("Quran tafsir");
      } catch {
        // Fallback: alquran.cloud's Tafsir Muyassar edition (simplified Arabic).
        const payload = await fetchJson<{ data?: unknown }>(
          `${ALQURAN_API}/ayah/${surahId}:${ayahNumber}/ar.muyassar`,
          "Quran tafsir (fallback)",
        );
        const data = isJsonRecord(payload.data) ? payload.data : {};
        return {
          surahId,
          ayahNumber,
          resourceName: "التفسير الميسّر",
          text: String(data.text ?? ""),
        };
      }
    },
  );
}