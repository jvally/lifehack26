import "server-only";

import OpenAI from "openai";

let client: OpenAI | undefined;

/**
 * Lazily create the server-only OpenAI client. Keeping construction lazy lets
 * unit tests import Role 2 modules without requiring an API key.
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }
  client ??= new OpenAI({ apiKey });
  return client;
}
