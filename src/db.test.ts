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
    "visits",
  ]);

  db.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("openDatabase adds notes columns to visits, payments, and reimbursements", () => {
  const dataDir = tempDataDir();
  const db = openDatabase(dataDir);

  for (const table of ["visits", "payments", "reimbursements"]) {
    const columns = db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((row) => (row as { name: string }).name);
    assert.ok(columns.includes("notes"), `${table} is missing a notes column`);
  }

  db.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("openDatabase does not reapply migrations on reopen", () => {
  const dataDir = tempDataDir();

  const first = openDatabase(dataDir);
  const { count: firstCount } = first
    .prepare("SELECT COUNT(*) as count FROM schema_migrations")
    .get() as { count: number };
  first.close();

  const second = openDatabase(dataDir);
  const { count: secondCount } = second
    .prepare("SELECT COUNT(*) as count FROM schema_migrations")
    .get() as { count: number };

  assert.equal(secondCount, firstCount);

  second.close();
  rmSync(dataDir, { recursive: true, force: true });
});
