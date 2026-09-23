export class UpstreamError extends Error {
  readonly source: string;
  readonly status: number;
  readonly kind: "upstream";

  constructor(source: string, status = 502) {
    super(`Live ${source} content is temporarily unavailable.`);
    this.name = "UpstreamError";
    this.source = source;
    this.status = status;
    this.kind = "upstream";
  }
}

export class NotFoundError extends Error {
  readonly code: string;
  readonly kind = "notFound";

  constructor(code: string, message: string) {
    super(message);
    this.name = "NotFoundError";
    this.code = code;
  }
}