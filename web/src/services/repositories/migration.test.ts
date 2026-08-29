import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/202608290001_initial.sql",
);
const evidenceMigrationPath = resolve(
  process.cwd(),
  "supabase/migrations/202608290002_evidence.sql",
);

describe("initial Supabase migration", () => {
  it("defines every Role 1 persistence table", async () => {
    const sql = await readFile(migrationPath, "utf8");
    const tables = [
      "categories",
      "feature_definitions",
      "market_signals",
      "products",
      "product_claims",
      "evaluations",
      "interview_sessions",
      "interview_messages",
      "recommendation_runs",
    ];

    for (const table of tables) {
      expect(sql).toContain(`create table ${table}`);
      expect(sql).toContain(`alter table ${table} enable row level security`);
    }
  });

  it("defines vector, search, timestamp, and service-only access contracts", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("extensions.vector(1536)");
    expect(sql).toContain("products_created_at_idx");
    expect(sql).toContain("products_updated_at_idx");
    expect(sql).toContain("products_fts_idx");
    expect(sql).toContain("market_signals_fts_idx");
    expect(sql).toContain("hybrid_market_search");
    expect(sql).toContain("import_products");
    expect(sql).toContain("save_product_passport");
    expect(sql).toContain("save_product_evaluation");
    expect(sql).toContain("original_passport = coalesce(original_passport");
    expect(sql).toContain("to anon, authenticated");
    expect(sql).toContain("using (false)");
  });
});

describe("evidence Supabase migration", () => {
  it("keeps evidence access service-only", async () => {
    const sql = await readFile(evidenceMigrationPath, "utf8");

    expect(sql).toContain("create table evidence_records");
    expect(sql).toContain("alter table evidence_records enable row level security");
    expect(sql).toContain("evidence_records_block_client_access");
    expect(sql).toContain("to anon, authenticated");
    expect(sql).toContain("using (false)");
  });
});
