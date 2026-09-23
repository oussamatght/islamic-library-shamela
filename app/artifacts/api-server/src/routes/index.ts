import { Router, type IRouter } from "express";
import { fail } from "../lib/respond";
import healthRouter from "./health";
import quranRouter from "./quran";
import adhkarRouter from "./adhkar";
import hadithRouter from "./hadith";
import prayerRouter from "./prayer";

const router: IRouter = Router();

router.use(healthRouter);
router.use(quranRouter);
router.use(adhkarRouter);
router.use(hadithRouter);
router.use(prayerRouter);

router.use((_request, response) => {
  fail(response, 404, "NOT_FOUND", "المورد غير موجود");
});

export default router;