import { afterEach, describe, expect, it, vi } from "vitest";

describe("application dependency container", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("fails fast outside tests when Supabase configuration is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");

    const { getApplicationDependencies } = await import("./container");

    expect(() => getApplicationDependencies()).toThrow();
  });
});
