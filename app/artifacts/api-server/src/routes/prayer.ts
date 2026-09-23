import { Router, type IRouter } from "express";
import { fail, handleApiError, numberParam, ok } from "../lib/respond";
import { fetchJson, isJsonRecord, type JsonRecord } from "../lib/network";

const router: IRouter = Router();

const ALADHAN_API = "https://api.aladhan.com/v1";

router.get("/prayer-times", async (request, response) => {
  const latitude = numberParam(request.query.latitude, Number.NaN);
  const longitude = numberParam(request.query.longitude, Number.NaN);
  const date =
    typeof request.query.date === "string"
      ? request.query.date
      : new Intl.DateTimeFormat("en-GB").format(new Date()).replaceAll("/", "-");

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    fail(response, 400, "INVALID_COORDINATES", "خط العرض وخط الطول مطلوبان");
    return;
  }

  try {
    const payload = await fetchJson<{ data?: unknown }>(
      `${ALADHAN_API}/timings/${encodeURIComponent(date)}?latitude=${latitude}&longitude=${longitude}&method=3`,
      "Prayer times",
    );
    const data = (payload.data ?? {}) as JsonRecord;
    const apiDate = (data.date ?? {}) as JsonRecord;
    const meta = (data.meta ?? {}) as JsonRecord;
    ok(response, {
      date: String(apiDate.readable ?? date),
      hijriDate: String(((apiDate.hijri ?? {}) as JsonRecord).date ?? ""),
      timezone: String(meta.timezone ?? "UTC"),
      location: { latitude, longitude },
      timings: (data.timings ?? {}) as Record<string, string>,
    });
  } catch (error) {
    handleApiError(error, response);
  }
});

export default router;