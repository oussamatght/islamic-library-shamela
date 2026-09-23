import type { Request, Response } from "express";
import { NotFoundError, UpstreamError } from "./errors";

export type Meta = Record<string, unknown>;

/**
 * Consistent success envelope for every content endpoint:
 *   { success: true, data, meta? }
 */
export function ok<T>(response: Response, data: T, meta?: Meta): void {
  response.json(
    meta === undefined ? { success: true, data } : { success: true, data, meta },
  );
}

/**
 * Consistent error envelope:
 *   { success: false, error: { code, message } }
 */
export function fail(
  response: Response,
  status: number,
  code: string,
  message: string,
): void {
  response.status(status).json({ success: false, error: { code, message } });
}

export function handleApiError(
  error: unknown,
  response: Response,
  notFoundCode = "NOT_FOUND",
): void {
  if (error instanceof NotFoundError) {
    fail(response, 404, error.code, error.message);
    return;
  }
  if (error instanceof UpstreamError) {
    fail(
      response,
      error.status,
      "UPSTREAM_UNAVAILABLE",
      "تعذر الوصول إلى مصدر المحتوى، يرجى المحاولة لاحقًا.",
    );
    return;
  }
  fail(response, 500, "INTERNAL_ERROR", "حدث خطأ غير متوقع.");
}

export function notFoundHandler(response: Response, code: string): void {
  fail(response, 404, code, "NotFound");
}

export function numberParam(
  value: unknown,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isIntegerParam(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export type RequestWithQuery = Request & { query: Record<string, unknown> };