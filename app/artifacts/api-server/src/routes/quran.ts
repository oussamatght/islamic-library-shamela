import { Router, type IRouter } from "express";
import { fail, handleApiError, ok, isIntegerParam } from "../lib/respond";
import {
  getAudio,
  getChapters,
  getSurah,
  getTafsir,
} from "../services/quranService";

const router: IRouter = Router();

router.get("/quran/surahs", async (_request, response) => {
  try {
    ok(response, await getChapters());
  } catch (error) {
    handleApiError(error, response);
  }
});

router.get("/quran/surahs/:surahId", async (request, response) => {
  const surahId = isIntegerParam(request.params.surahId, 1, 114);
  if (surahId === null) {
    fail(response, 400, "INVALID_SURAH_ID", "رقم السورة غير صالح");
    return;
  }
  try {
    ok(response, await getSurah(surahId));
  } catch (error) {
    handleApiError(error, response);
  }
});

router.get("/quran/surahs/:surahId/audio", async (request, response) => {
  const surahId = isIntegerParam(request.params.surahId, 1, 114);
  if (surahId === null) {
    fail(response, 400, "INVALID_SURAH_ID", "رقم السورة غير صالح");
    return;
  }
  try {
    ok(response, await getAudio(surahId));
  } catch (error) {
    handleApiError(error, response);
  }
});

router.get("/quran/tafsir/:surahId/:ayahNumber", async (request, response) => {
  const surahId = isIntegerParam(request.params.surahId, 1, 114);
  const ayahNumber = isIntegerParam(request.params.ayahNumber, 1, 286);
  if (surahId === null || ayahNumber === null) {
    fail(response, 400, "INVALID_AYAH_ID", "رقم الآية غير صالح");
    return;
  }
  try {
    ok(response, await getTafsir(surahId, ayahNumber));
  } catch (error) {
    handleApiError(error, response);
  }
});

export default router;