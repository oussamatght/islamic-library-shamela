import { Router, type IRouter } from "express";
import { fail, handleApiError, ok } from "../lib/respond";
import {
  getAdhkarItem,
  getCategory,
  listAdhkar,
  listCategories,
} from "../services/adhkarService";

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

export default router;