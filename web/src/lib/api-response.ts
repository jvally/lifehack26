import { NextResponse } from "next/server";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  requestId: string;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
};

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
) {
  return NextResponse.json<ApiFailure>(
    { ok: false, error: { code, message }, requestId },
    { status },
  );
}

export async function withApiErrors(
  operation: () => Promise<Response>,
): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "UNEXPECTED_SERVER_ERROR";
    const notFound = message.endsWith("_NOT_FOUND");
    const invalid =
      message.includes("INVALID") ||
      message.includes("REQUIRED") ||
      message.includes("TOO_SHORT");
    return apiFailure(
      message,
      invalid ? "The request is invalid." : notFound ? "The record was not found." : "The operation failed.",
      invalid ? 400 : notFound ? 404 : 500,
    );
  }
}