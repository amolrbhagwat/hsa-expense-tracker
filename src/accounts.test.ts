import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createAccount, deleteAccount, listAccounts } from "./accounts.js";
import { openDatabase } from "./db.js";

function tempDb() {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const db = openDatabase(dataDir);
  return {
    db,
    cleanup: () => {
      db.close();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

test("createAccount and listAccounts round-trip, sorted by name", () => {
  const { db, cleanup } = tempDb();

  assert.equal(createAccount(db, "Fidelity HSA", "hsa"), "created");
  assert.equal(createAccount(db, "Chase Sapphire", "personal"), "created");

  assert.deepEqual(listAccounts(db), [
    { id: 2, name: "Chase Sapphire", type: "personal" },
    { id: 1, name: "Fidelity HSA", type: "hsa" },
  ]);

  cleanup();
});

test("createAccount rejects blank names", () => {
  const { db, cleanup } = tempDb();

  assert.equal(createAccount(db, "   ", "hsa"), "blank");
  assert.deepEqual(listAccounts(db), []);

  cleanup();
});

test("createAccount rejects duplicate names", () => {
  const { db, cleanup } = tempDb();

  assert.equal(createAccount(db, "Fidelity HSA", "hsa"), "created");
  assert.equal(createAccount(db, "Fidelity HSA", "hsa"), "duplicate");

  assert.deepEqual(
    listAccounts(db).map((a) => a.name),
    ["Fidelity HSA"],
  );

  cleanup();
});

test("deleteAccount removes the account", () => {
  const { db, cleanup } = tempDb();

  createAccount(db, "Fidelity HSA", "hsa");
  const [account] = listAccounts(db);

  deleteAccount(db, account!.id);

  assert.deepEqual(listAccounts(db), []);

  cleanup();
});
