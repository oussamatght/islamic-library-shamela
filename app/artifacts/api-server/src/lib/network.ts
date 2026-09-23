import { UpstreamError } from "./errors";

export type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function fetchJson<T>(
  url: string,
  source: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const { method = "GET", headers = {}, body, timeoutMs = 15_000 } = options;
  let response: globalThis.Response;
  try {
    response = await fetch(url, {
      method,
      headers: { Accept: "application/json", ...headers },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new UpstreamError(source);
  }

  if (!response.ok) {
    throw new UpstreamError(source, response.status >= 500 ? 503 : 502);
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

export function numberParam(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function httpsUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/^http:/, "https:");
}

export function intString(
  value: unknown,
  fallback?: number,
): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}