import { describe, expect, it } from "vitest";
import { missingReleaseEnvironmentKeys, parseEnv } from "./env";

const validEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project-id.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-with-more-than-20-characters",
  OPENAI_API_KEY: "openai-key-with-more-than-20-characters",
};

describe("parseEnv", () => {
  it("applies the documented model defaults", () => {
    expect(parseEnv(validEnvironment)).toMatchObject({
      OPENAI_EXTRACTION_MODEL: "gpt-5.6-luna",
      OPENAI_QUERY_MODEL: "gpt-5.6-luna",
      OPENAI_EMBEDDING_MODEL: "text-embedding-3-small",
    });
  });

  it("rejects missing server credentials", () => {
    expect(() =>
      parseEnv({ NEXT_PUBLIC_SUPABASE_URL: validEnvironment.NEXT_PUBLIC_SUPABASE_URL }),
    ).toThrow();
  });

  it("reports missing release variable names without returning values", () => {
    expect(
      missingReleaseEnvironmentKeys({ OPENAI_API_KEY: "secret-value" }),
    ).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_EXTRACTION_MODEL",
      "OPENAI_QUERY_MODEL",
      "OPENAI_EMBEDDING_MODEL",
    ]);
  });
});
