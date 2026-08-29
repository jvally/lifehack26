export type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { message?: string };
  requestId?: string;
};

export class ClientApiError extends Error {
  constructor(
    message: string,
    public readonly requestId: string | null = null,
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

export async function readApiData<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  let body: ApiEnvelope<T>;

  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ClientApiError(fallbackMessage);
  }

  if (!response.ok || !body.ok || body.data === undefined) {
    const message = body.error?.message ?? fallbackMessage;
    throw new ClientApiError(
      body.requestId ? `${message} Request ID: ${body.requestId}` : message,
      body.requestId ?? null,
    );
  }

  return body.data;
}
