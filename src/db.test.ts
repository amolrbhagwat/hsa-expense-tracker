import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { openDatabase } from "./db.js";

function tempDataDir(): string {
  return mkdtempSync(path.join(tmpdir(), "hsa-test-"));
}

test("openDatabase creates every table from the migrations", () => {
  const dataDir = tempDataDir();
  const db = openDatabase(dataDir);

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => (row as { name: string }).name);

  assert.deepEqual(tables, [
    "accounts",
    "patients",
    "payment_visits",
    "payments",
    "providers",
    "receipt_payments",
    "receipts",
    "reimbursement_payments",
    "reimbursements",
    "schema_migrations",
    "visit_documents",
    "visits",
  ]);

  db.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("openDatabase does not reapply migrations on reopen", () => {
  const dataDir = tempDataDir();

  openDatabase(dataDir).close();
  const db = openDatabase(dataDir);

  const { count } = db
    .prepare("SELECT COUNT(*) as count FROM schema_migrations")
    .get() as { count: number };

  assert.equal(count, 1);

  db.close();
  rmSync(dataDir, { recursive: true, force: true });
});
