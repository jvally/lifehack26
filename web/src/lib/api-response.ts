import { NextResponse } from "next/server";
import { z } from "zod";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  requestId: string;
};

export type ApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
};

export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}
export function apiSuccess<T>(
  data: T,
  status = 200,
  requestId = crypto.randomUUID(),
) {
  return NextResponse.json<ApiSuccess<T>>(
    { ok: true, data, requestId },
    { status },
  );
}

export function apiFailure(
  code: string,
  message: string,
  status: number,
  requestId = crypto.randomUUID(),
  details?: unknown,
) {
  const error: ApiError["error"] = { code, message };
  if (details !== undefined) error.details = details;
  return NextResponse.json<ApiError>(
    { ok: false, error, requestId },
    { status },
  );
}

function catalogIssues(error: unknown): unknown | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "CATALOG_VALIDATION_FAILED" &&
    "issues" in error
  ) {
    return error.issues;
  }
  return undefined;
}

export async function withApiErrors(
  operation: () => Promise<Response>,
  requestId = crypto.randomUUID(),
): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return apiFailure(
        error.code,
        error.message,
        error.status,
        requestId,
        error.details,
      );
    }
    if (error instanceof z.ZodError) {
      return apiFailure(
        "VALIDATION_FAILED",
        "The request is invalid.",
        400,
        requestId,
        error.issues,
      );
    }
    if (error instanceof SyntaxError) {
      return apiFailure(
        "MALFORMED_JSON",
        "The request body is not valid JSON.",
        400,
        requestId,
      );
    }
    if (
      error instanceof Error &&
      /no credits remaining|billing|rate limit/i.test(error.message)
    ) {
      return apiFailure(
        "AI_PROVIDER_UNAVAILABLE",
        "The AI provider is unavailable. Check the OpenAI account credits and billing settings.",
        503,
        requestId,
      );
    }
    const issues = catalogIssues(error);
    if (issues !== undefined) {
      return apiFailure(
        "CATALOG_VALIDATION_FAILED",
        "Catalog input validation failed.",
        400,
        requestId,
        issues,
      );
    }
    if (error instanceof Error && error.message.endsWith("_NOT_FOUND")) {
      return apiFailure(
        error.message,
        "The requested record was not found.",
        404,
        requestId,
      );
    }
    return apiFailure(
      "INTERNAL_SERVER_ERROR",
      "The operation failed.",
      500,
      requestId,
    );
  }
}
