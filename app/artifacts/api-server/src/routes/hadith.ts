import { Router, type IRouter } from "express";
import { fail, handleApiError, numberParam, ok } from "../lib/respond";
import {
  getHadith,
  getHadithCategoryList,
  listHadithCategories,
  listHadiths,
  searchHadiths,
} from "../services/hadithService";

const router: IRouter = Router();

router.get("/hadiths/categories", async (_request, response) => {
  try {
    ok(response, await listHadithCategories());
  } catch (error) {
    handleApiError(error, response);
  }
});

router.get("/hadiths/categories/:categoryId/children", async (request, response) => {
  try {
    ok(response, await getHadithCategoryList(String(request.params.categoryId)));
  } catch (error) {
    handleApiError(error, response);
  }
});

router.get("/hadiths/search", async (request, response) => {
  const phrase =
    typeof request.query.phrase === "string" ? request.query.phrase.trim() : "";
  if (!phrase) {
    fail(response, 400, "MISSING_PHRASE", "يرجى إدخال نص البحث");
    return;
  }
  const page = numberParam(request.query.page, 1);
  const perPage = numberParam(request.query.perPage, 10);
  try {
    const result = await searchHadiths(phrase, page, perPage);
    ok(
      response,
      result.items,
      { page: result.page, perPage: result.perPage, total: result.total, hasMore: result.hasMore },
    );
  } catch (error) {
    handleApiError(error, response);
  }
});



router.get("/hadiths/:hadithId", async (request, response) => {
  try {
    ok(response, await getHadith(String(request.params.hadithId)));
  } catch (error) {
    handleApiError(error, response);
  }
});

router.get("/hadiths", async (request, response) => {
  const categoryId =
    typeof request.query.categoryId === "string" && request.query.categoryId.trim()
      ? request.query.categoryId.trim()
      : "2";
  const page = Math.max(numberParam(request.query.page, 1), 1);
  const perPage = Math.min(Math.max(numberParam(request.query.perPage, 5), 1), 20);
  try {
    const result = await listHadiths(categoryId, page, perPage);
    ok(response, result.items, {
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      hasMore: result.hasMore,
    });
  } catch (error) {
    handleApiError(error, response);
  }
});

export default router;