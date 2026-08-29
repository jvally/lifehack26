export const RELEASE_ENVIRONMENT_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "OPENAI_EXTRACTION_MODEL",
  "OPENAI_QUERY_MODEL",
  "OPENAI_EMBEDDING_MODEL",
] as const;

export function missingReleaseEnvironmentKeys(
  source: Record<string, string | undefined>,
) {
  return RELEASE_ENVIRONMENT_KEYS.filter((key) => !source[key]?.trim());
}
