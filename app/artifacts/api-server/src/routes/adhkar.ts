import { Router, type IRouter } from "express";
import { fail, handleApiError, ok } from "../lib/respond";
import {
  getAdhkarItem,
  getCategory,
  listAdhkar,
  listCategories,
} from "../services/adhkarService";
import { buildDhikrCollection } from "./dhikrShapes";

const router: IRouter = Router();

router.get("/adhkar/categories", async (_request, response) => {
  try {
    ok(response, listCategories());
  } catch (error) {
    handleApiError(error, response);
  }
});

router.get("/adhkar/categories/:categoryId", async (request, response) => {
  try {
    ok(response, await getCategory(String(request.params.categoryId)));
  } catch (error) {
    handleApiError(error, response, "ADHKAR_CATEGORY_NOT_FOUND");
  }
});

router.get("/adhkar/items", async (request, response) => {
  const categoryId =
    typeof request.query.categoryId === "string" && request.query.categoryId.trim()
      ? request.query.categoryId.trim()
      : undefined;
  try {
    ok(response, await listAdhkar(categoryId));
  } catch (error) {
    handleApiError(error, response, "ADHKAR_CATEGORY_NOT_FOUND");
  }
});

router.get("/adhkar/items/:itemId", async (request, response) => {
  try {
    ok(response, await getAdhkarItem(String(request.params.itemId)));
  } catch (error) {
    handleApiError(error, response);
  }
});

/**
 * Contract route (OpenAPI `getAdhkar`): ?categoryId=hisn-N returns one category
 * hydrated with items; no categoryId returns the full category catalog with
 * metadata only. Backed by the same cache as the legacy routes above.
 */
router.get("/adhkar", async (request, response) => {
  const categoryId =
    typeof request.query.categoryId === "string" && request.query.categoryId.trim()
      ? request.query.categoryId.trim()
      : undefined;
  try {
    const collection = await buildDhikrCollection(categoryId);
    ok(response, collection.categories);
  } catch (error) {
    handleApiError(error, response, "ADHKAR_CATEGORY_NOT_FOUND");
  }
});

/**
 * Contract route (OpenAPI `getDuas`). Duas live in the same Hisn al-Muslim
 * manifest; the default points at a supplication-flavored category so the
 * client's "dua of the day" card has content out of the box.
 */
router.get("/duas", async (request, response) => {
  const categoryId =
    typeof request.query.categoryId === "string" && request.query.categoryId.trim()
      ? request.query.categoryId.trim()
      : "hisn-107";
  try {
    const collection = await buildDhikrCollection(categoryId);
    ok(response, collection.categories);
  } catch (error) {
    handleApiError(error, response, "ADHKAR_CATEGORY_NOT_FOUND");
  }
});

export default router;