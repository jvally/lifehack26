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

function isAiProviderUnavailable(error: unknown): boolean {
  if (error instanceof Error && /no credits remaining|billing|rate limit|insufficient_quota/i.test(error.message)) return true;
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { status?: unknown; code?: unknown; type?: unknown };
  return candidate.status === 429 || candidate.code === "insufficient_quota" || candidate.type === "insufficient_quota";
}

function apiErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }
  return typeof error.status === "number" ? error.status : null;
}

function aiProviderFailure(error: unknown): {
  code: string;
  message: string;
  status: number;
} | null {
  const status = apiErrorStatus(error);
  if (status === 401) {
    return {
      code: "AI_PROVIDER_AUTHENTICATION_FAILED",
      message: "OpenAI rejected the configured API key. Update OPENAI_API_KEY in the production environment.",
      status: 503,
    };
  }
  if (status === 403) {
    return {
      code: "AI_PROVIDER_ACCESS_DENIED",
      message: "The configured OpenAI project does not have access to the selected model. Check the API key project and model settings.",
      status: 503,
    };
  }
  if (status === 404) {
    return {
      code: "AI_PROVIDER_MODEL_UNAVAILABLE",
      message: "The configured OpenAI model is unavailable. Check OPENAI_EXTRACTION_MODEL and OPENAI_EMBEDDING_MODEL.",
      status: 503,
    };
  }
  if (status === 429 || isAiProviderUnavailable(error)) {
    return {
      code: "AI_PROVIDER_UNAVAILABLE",
      message: "The AI provider is unavailable. Check the OpenAI account credits and billing settings.",
      status: 503,
    };
  }
  if (status !== null && status >= 500) {
    return {
      code: "AI_PROVIDER_UNAVAILABLE",
      message: "The AI provider is temporarily unavailable. Please try again shortly.",
      status: 503,
    };
  }
  return null;
}

function logUnexpectedError(error: unknown, requestId: string) {
  const details = typeof error === "object" && error !== null
    ? error as { name?: unknown; message?: unknown; code?: unknown; status?: unknown }
    : {};
  console.error("Unhandled API operation failure", {
    requestId,
    name: typeof details.name === "string" ? details.name : "UnknownError",
    code: typeof details.code === "string" ? details.code : undefined,
    status: typeof details.status === "number" ? details.status : undefined,
  });
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
    const providerFailure = aiProviderFailure(error);
    if (providerFailure !== null) {
      return apiFailure(
        providerFailure.code,
        providerFailure.message,
        providerFailure.status,
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
    logUnexpectedError(error, requestId);
    return apiFailure(
      "INTERNAL_SERVER_ERROR",
      "The operation failed.",
      500,
      requestId,
    );
  }
}
