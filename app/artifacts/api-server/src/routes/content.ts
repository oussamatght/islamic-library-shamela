import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const QURAN_API = "https://api.quran.com/api/v4";
const ALADHAN_API = "https://api.aladhan.com/v1";
const HADEETH_API = "https://hadeethenc.com/api/v1";
const HISN_API = "https://www.hisnmuslim.com/api/ar";
const RECITER = "Mishari Alafasy";

type JsonRecord = Record<string, unknown>;

class UpstreamError extends Error {
  constructor(
    public readonly source: string,
    public readonly status = 502,
  ) {
    super(`Live ${source} content is temporarily unavailable.`);
  }
}

async function getJson<T>(url: string, source: string): Promise<T> {
  let response: globalThis.Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new UpstreamError(source);
  }

  if (!response.ok) {
    throw new UpstreamError(source, 502);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new UpstreamError(source);
  }
}

function handleError(error: unknown, response: Response) {
  if (error instanceof UpstreamError) {
    response.status(error.status).json({ message: error.message, source: error.source });
    return;
  }
  response.status(500).json({ message: "Unexpected content service error.", source: "api" });
}

function numberParam(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

router.get("/quran/surahs", async (_request, response) => {
  try {
    const payload = await getJson<{ chapters: JsonRecord[] }>(
      `${QURAN_API}/chapters?language=ar`,
      "Quran",
    );
    response.json({
      data: (payload.chapters ?? []).map((chapter) => ({
        id: Number(chapter.id),
        nameArabic: String(chapter.name_arabic ?? ""),
        nameEnglish: String(chapter.name_simple ?? ""),
        revelationPlace: String(chapter.revelation_place ?? ""),
        versesCount: Number(chapter.verses_count ?? 0),
      })),
    });
  } catch (error) {
    handleError(error, response);
  }
});

router.get("/quran/surahs/:surahId", async (request, response) => {
  const surahId = numberParam(request.params.surahId, 0);
  try {
    const [chapter, verses] = await Promise.all([
      getJson<JsonRecord>(`${QURAN_API}/chapters/${surahId}?language=ar`, "Quran"),
      getJson<{ verses: JsonRecord[] }>(
        `${QURAN_API}/verses/by_chapter/${surahId}?language=ar&words=false&fields=text_uthmani,juz_number,page_number&per_page=300`,
        "Quran",
      ),
    ]);
    const chapterData = (chapter.chapter ?? chapter) as JsonRecord;
    response.json({
      surah: {
        id: Number(chapterData.id),
        nameArabic: String(chapterData.name_arabic ?? ""),
        nameEnglish: String(chapterData.name_simple ?? ""),
        revelationPlace: String(chapterData.revelation_place ?? ""),
        versesCount: Number(chapterData.verses_count ?? 0),
      },
      verses: (verses.verses ?? []).map((verse) => ({
        id: Number(verse.id),
        verseNumber: Number(verse.verse_number),
        verseKey: String(verse.verse_key ?? `${surahId}:${verse.verse_number}`),
        text: String(verse.text_uthmani ?? ""),
        juz: Number(verse.juz_number ?? 0),
        page: Number(verse.page_number ?? 0),
      })),
    });
  } catch (error) {
    handleError(error, response);
  }
});

router.get("/quran/surahs/:surahId/audio", async (request, response) => {
  const surahId = numberParam(request.params.surahId, 0);
  try {
    const payload = await getJson<{ audio_file: JsonRecord }>(
      `${QURAN_API}/chapter_recitations/7/${surahId}?segments=false`,
      "Quran audio",
    );
    response.json({
      surahId,
      audioUrl: String(payload.audio_file?.audio_url ?? ""),
      reciter: RECITER,
      format: String(payload.audio_file?.format ?? "mp3"),
    });
  } catch (error) {
    handleError(error, response);
  }
});

router.get("/quran/tafsir/:surahId/:ayahNumber", async (request, response) => {
  const surahId = numberParam(request.params.surahId, 0);
  const ayahNumber = numberParam(request.params.ayahNumber, 0);
  try {
    const payload = await getJson<JsonRecord>(
      `${QURAN_API}/tafsirs/169/by_ayah/${surahId}:${ayahNumber}`,
      "Quran tafsir",
    );
    const tafsir = (payload.tafsir ?? {}) as JsonRecord;
    response.json({
      surahId,
      ayahNumber,
      resourceName: String(tafsir.resource_name ?? "Ibn Kathir"),
      text: String(tafsir.text ?? ""),
    });
  } catch (error) {
    handleError(error, response);
  }
});

router.get("/prayer-times", async (request, response) => {
  const latitude = numberParam(request.query.latitude, Number.NaN);
  const longitude = numberParam(request.query.longitude, Number.NaN);
  const date =
    typeof request.query.date === "string"
      ? request.query.date
      : new Intl.DateTimeFormat("en-GB").format(new Date()).replaceAll("/", "-");

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    response.status(400).json({ message: "Latitude and longitude are required.", source: "api" });
    return;
  }

  try {
    const payload = await getJson<JsonRecord>(
      `${ALADHAN_API}/timings/${encodeURIComponent(date)}?latitude=${latitude}&longitude=${longitude}&method=3`,
      "Prayer times",
    );
    const data = (payload.data ?? {}) as JsonRecord;
    const apiDate = (data.date ?? {}) as JsonRecord;
    const meta = (data.meta ?? {}) as JsonRecord;
    response.json({
      date: String(apiDate.readable ?? date),
      hijriDate: String(((apiDate.hijri ?? {}) as JsonRecord).date ?? ""),
      timezone: String(meta.timezone ?? "UTC"),
      location: { latitude, longitude },
      timings: (data.timings ?? {}) as Record<string, string>,
    });
  } catch (error) {
    handleError(error, response);
  }
});

router.get("/hadiths", async (request, response) => {
  const categoryId = numberParam(request.query.categoryId, 2);
  const page = numberParam(request.query.page, 1);
  const perPage = Math.min(numberParam(request.query.perPage, 5), 20);
  try {
    const list = await getJson<{ data: JsonRecord[]; meta: JsonRecord }>(
      `${HADEETH_API}/hadeeths/list/?language=ar&category_id=${categoryId}&page=${page}&per_page=${perPage}`,
      "Hadith",
    );
    const data = await Promise.all(
      (list.data ?? []).map(async (item) => {
        const detail = await getJson<JsonRecord>(
          `${HADEETH_API}/hadeeths/one/?language=ar&id=${encodeURIComponent(String(item.id))}`,
          "Hadith",
        );
        return {
          id: String(item.id),
          title: String(detail.title ?? item.title ?? ""),
          text: String(detail.hadeeth ?? detail.title ?? item.title ?? ""),
          source: "HadeethEnc",
        };
      }),
    );
    response.json({
      data,
      page,
      totalPages: Number(list.meta?.last_page ?? page),
    });
  } catch (error) {
    handleError(error, response);
  }
});

async function getHisnCollection(categoryId: number, source: string) {
  const payload = await getJson<Record<string, JsonRecord[]>>(
    `${HISN_API}/${categoryId}.json`,
    source,
  );
  return {
    categories: Object.entries(payload).map(([title, items]) => ({
      id: categoryId,
      title,
      items: (items ?? []).map((item) => ({
        id: Number(item.ID),
        title,
        text: String(item.ARABIC_TEXT ?? ""),
        translation: String(item.LANGUAGE_ARABIC_TRANSLATED_TEXT ?? ""),
        repeat: Number(item.REPEAT ?? 1),
        audioUrl: item.AUDIO ? String(item.AUDIO).replace(/^http:/, "https:") : undefined,
      })),
    })),
  };
}

router.get("/adhkar", async (request, response) => {
  try {
    response.json(await getHisnCollection(numberParam(request.query.categoryId, 1), "Adhkar"));
  } catch (error) {
    handleError(error, response);
  }
});

router.get("/duas", async (request, response) => {
  try {
    response.json(await getHisnCollection(numberParam(request.query.categoryId, 6), "Duas"));
  } catch (error) {
    handleError(error, response);
  }
});

export default router;