import "server-only";
import { z } from "zod";
export {
  missingReleaseEnvironmentKeys,
  RELEASE_ENVIRONMENT_KEYS,
} from "./release-env";

export const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  OPENAI_API_KEY: z.string().min(20),
  OPENAI_EXTRACTION_MODEL: z.string().min(1).default("gpt-5.6-luna"),
  OPENAI_QUERY_MODEL: z.string().min(1).default("gpt-5.6-luna"),
  OPENAI_EMBEDDING_MODEL: z
    .string()
    .min(1)
    .default("text-embedding-3-small"),
});

export type AppEnvironment = z.infer<typeof EnvSchema>;

export function parseEnv(
  source: Record<string, string | undefined>,
): AppEnvironment {
  return EnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: source.OPENAI_API_KEY,
    OPENAI_EXTRACTION_MODEL: source.OPENAI_EXTRACTION_MODEL,
    OPENAI_QUERY_MODEL: source.OPENAI_QUERY_MODEL,
    OPENAI_EMBEDDING_MODEL: source.OPENAI_EMBEDDING_MODEL,
  });
}

function currentEnv(): AppEnvironment {
  return parseEnv(process.env);
}

export const env: AppEnvironment = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    return currentEnv().NEXT_PUBLIC_SUPABASE_URL;
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return currentEnv().SUPABASE_SERVICE_ROLE_KEY;
  },
  get OPENAI_API_KEY() {
    return currentEnv().OPENAI_API_KEY;
  },
  get OPENAI_EXTRACTION_MODEL() {
    return currentEnv().OPENAI_EXTRACTION_MODEL;
  },
  get OPENAI_QUERY_MODEL() {
    return currentEnv().OPENAI_QUERY_MODEL;
  },
  get OPENAI_EMBEDDING_MODEL() {
    return currentEnv().OPENAI_EMBEDDING_MODEL;
  },
};
