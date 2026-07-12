import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { openDatabase } from "./db.js";
import {
  createProvider,
  deleteProvider,
  listProviders,
  updateProvider,
} from "./providers.js";

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

test("createProvider and listProviders round-trip, sorted by name", () => {
  const { db, cleanup } = tempDb();

  assert.equal(createProvider(db, "CVS Pharmacy", "pharmacy"), "saved");
  assert.equal(createProvider(db, "Dr. Sam Okafor", "medical"), "saved");

  assert.deepEqual(listProviders(db), [
    { id: 1, name: "CVS Pharmacy", category: "pharmacy" },
    { id: 2, name: "Dr. Sam Okafor", category: "medical" },
  ]);

  cleanup();
});

test("createProvider rejects blank names", () => {
  const { db, cleanup } = tempDb();

  assert.equal(createProvider(db, "   ", "medical"), "blank");
  assert.deepEqual(listProviders(db), []);

  cleanup();
});

test("createProvider allows duplicate names", () => {
  const { db, cleanup } = tempDb();

  assert.equal(createProvider(db, "CVS Pharmacy", "pharmacy"), "saved");
  assert.equal(createProvider(db, "CVS Pharmacy", "pharmacy"), "saved");

  assert.equal(listProviders(db).length, 2);

  cleanup();
});

test("updateProvider changes name and category", () => {
  const { db, cleanup } = tempDb();

  createProvider(db, "Dr. Aiko Tanaka", "medical");
  const [provider] = listProviders(db);

  assert.equal(
    updateProvider(db, provider!.id, "Dr. Aiko Tanaka", "dental"),
    "saved",
  );

  assert.deepEqual(listProviders(db), [
    { id: provider!.id, name: "Dr. Aiko Tanaka", category: "dental" },
  ]);

  cleanup();
});

test("updateProvider rejects blank names", () => {
  const { db, cleanup } = tempDb();

  createProvider(db, "Dr. Aiko Tanaka", "medical");
  const [provider] = listProviders(db);

  assert.equal(updateProvider(db, provider!.id, "  ", "medical"), "blank");

  assert.deepEqual(listProviders(db), [provider]);

  cleanup();
});

test("deleteProvider removes the provider", () => {
  const { db, cleanup } = tempDb();

  createProvider(db, "CVS Pharmacy", "pharmacy");
  const [provider] = listProviders(db);

  deleteProvider(db, provider!.id);

  assert.deepEqual(listProviders(db), []);

  cleanup();
});
