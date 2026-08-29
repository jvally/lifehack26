import { resolve } from "node:path";
import dotenv from "dotenv";
import {
  missingReleaseEnvironmentKeys,
  RELEASE_ENVIRONMENT_KEYS,
} from "../lib/release-env";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env") });

const missing = missingReleaseEnvironmentKeys(process.env);

if (missing.length > 0) {
  console.error("Missing release environment variables:");
  for (const key of missing) console.error(`  ${key}`);
  process.exitCode = 1;
} else {
  console.log(
    `Release environment is configured with ${RELEASE_ENVIRONMENT_KEYS.length} required variables.`,
  );
}
