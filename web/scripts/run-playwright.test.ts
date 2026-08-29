import { describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
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
    const port = 43123;
    const probe = Object.assign(new EventEmitter(), {
      unref: () => undefined,
      close: (listener: (reason?: Error) => void) => listener(),
      listen: () => {
        queueMicrotask(() => probe.emit("error", { code: "EADDRINUSE" }));
      },
    });

    await expect(
      assertLocalPortAvailable(`http://127.0.0.1:${port}`, () => probe),
    ).rejects.toThrow(`Port ${port} is already in use.`);
  });
});
