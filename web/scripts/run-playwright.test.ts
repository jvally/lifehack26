import { describe, expect, it } from "vitest";
import { createServer } from "node:net";
import {
  assertLocalPortAvailable,
  createPlaywrightRunConfig,
  parsePlaywrightMode,
} from "./run-playwright";

describe("run-playwright configuration", () => {
  it("builds an explicit offline server environment", () => {
    const config = createPlaywrightRunConfig("offline", {});

    expect(config).toMatchObject({
      mode: "offline",
      baseURL: "http://127.0.0.1:3000",
      startLocalServer: true,
    });
    expect(config.environment).toMatchObject({
      PLAYWRIGHT_MODE: "offline",
      NEXT_PUBLIC_OFFLINE_DEMO: "true",
    });
  });

  it("builds an explicit live server environment", () => {
    const config = createPlaywrightRunConfig("live", {});

    expect(config.environment).toMatchObject({
      PLAYWRIGHT_MODE: "live",
      NEXT_PUBLIC_OFFLINE_DEMO: "false",
    });
  });

  it("uses an explicit base URL without starting a local server", () => {
    const config = createPlaywrightRunConfig("live", {
      PLAYWRIGHT_BASE_URL: "https://preview.example.test",
    });

    expect(config.baseURL).toBe("https://preview.example.test");
    expect(config.startLocalServer).toBe(false);
  });

  it("rejects an unsupported mode", () => {
    expect(() => parsePlaywrightMode("staging")).toThrow(
      "Playwright mode must be offline or live.",
    );
  });

  it("rejects a local port already owned by another process", async () => {
    const server = createServer();
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "0.0.0.0", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("The test server did not expose a TCP port.");
    }

    try {
      await expect(
        assertLocalPortAvailable(`http://127.0.0.1:${address.port}`),
      ).rejects.toThrow(`Port ${address.port} is already in use.`);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
