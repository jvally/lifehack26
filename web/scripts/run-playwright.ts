import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export type PlaywrightMode = "offline" | "live";

type EnvironmentSource = Record<string, string | undefined>;

export function parsePlaywrightMode(value: string | undefined): PlaywrightMode {
  if (value === "offline" || value === "live") return value;
  throw new Error("Playwright mode must be offline or live.");
}

export function createPlaywrightRunConfig(
  modeValue: string | undefined,
  source: EnvironmentSource,
) {
  const mode = parsePlaywrightMode(modeValue);
  const explicitBaseURL = source.PLAYWRIGHT_BASE_URL?.trim();
  const baseURL = explicitBaseURL || "http://127.0.0.1:3000";

  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    ...source,
    PLAYWRIGHT_MODE: mode,
    PLAYWRIGHT_BASE_URL: baseURL,
    NEXT_PUBLIC_OFFLINE_DEMO: mode === "offline" ? "true" : "false",
  };

  return {
    mode,
    baseURL,
    startLocalServer: !explicitBaseURL,
    environment,
  };
}

export async function assertLocalPortAvailable(baseURL: string) {
  const url = new URL(baseURL);
  const port = Number(url.port || (url.protocol === "https:" ? "443" : "80"));

  await new Promise<void>((resolveAvailable, reject) => {
    const probe = createServer();
    probe.unref();
    probe.once("error", (reason: NodeJS.ErrnoException) => {
      if (reason.code === "EADDRINUSE") {
        reject(new Error(`Port ${port} is already in use.`));
      } else {
        reject(reason);
      }
    });
    probe.listen({ host: "0.0.0.0", port, exclusive: true }, () => {
      probe.close((reason) => {
        if (reason) reject(reason);
        else resolveAvailable();
      });
    });
  });
}

function waitForExit(child: ChildProcess) {
  return new Promise<number>((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) resolveExit(1);
      else resolveExit(code ?? 1);
    });
  });
}

function runCommand(
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: environment,
    shell: false,
    stdio: "inherit",
    windowsHide: true,
  });
  return waitForExit(child);
}

async function waitForServer(
  baseURL: string,
  server: ChildProcess,
  timeoutMs = 60_000,
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next server exited with code ${server.exitCode}.`);
    }
    try {
      const response = await fetch(baseURL, {
        redirect: "manual",
        signal: AbortSignal.timeout(2_000),
      });
      if (response.status < 500) return;
    } catch {
      // The server has not started listening yet.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }

  throw new Error(`Next server did not become ready within ${timeoutMs}ms.`);
}

async function stopServer(server: ChildProcess) {
  if (!server.pid || server.exitCode !== null) return;

  if (process.platform === "win32") {
    const killer = spawn(
      "taskkill.exe",
      ["/PID", String(server.pid), "/T", "/F"],
      {
        shell: false,
        stdio: "ignore",
        windowsHide: true,
      },
    );
    await waitForExit(killer);
    return;
  }

  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    return;
  }

  await Promise.race([
    waitForExit(server),
    new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 5_000)),
  ]);
  if (server.exitCode === null) {
    try {
      process.kill(-server.pid, "SIGKILL");
    } catch {
      // The process group already exited.
    }
  }
}

async function main() {
  const config = createPlaywrightRunConfig(process.argv[2], process.env);
  const nextCli = resolve("node_modules/next/dist/bin/next");
  const playwrightCli = resolve("node_modules/@playwright/test/cli.js");
  let server: ChildProcess | null = null;

  try {
    if (config.startLocalServer) {
      await assertLocalPortAvailable(config.baseURL);
      const buildCode = await runCommand(
        process.execPath,
        [nextCli, "build"],
        config.environment,
      );
      if (buildCode !== 0) return buildCode;

      const url = new URL(config.baseURL);
      const port = url.port || "3000";
      server = spawn(
        process.execPath,
        [nextCli, "start", "-H", url.hostname, "-p", port],
        {
          cwd: process.cwd(),
          detached: process.platform !== "win32",
          env: config.environment,
          shell: false,
          stdio: "inherit",
          windowsHide: true,
        },
      );
      await waitForServer(config.baseURL, server);
    }

    return await runCommand(
      process.execPath,
      [playwrightCli, "test"],
      config.environment,
    );
  } finally {
    if (server) await stopServer(server);
  }
}

const entryURL = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";

if (import.meta.url === entryURL) {
  main()
    .then((code) => {
      process.exitCode = code ?? 0;
    })
    .catch((reason: unknown) => {
      console.error(reason instanceof Error ? reason.message : String(reason));
      process.exitCode = 1;
    });
}
