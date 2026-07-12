import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { openDatabase } from "./db.js";
import { createPatient, deletePatient, listPatients } from "./patients.js";

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

test("createPatient and listPatients round-trip, sorted by name", () => {
  const { db, cleanup } = tempDb();

  assert.equal(createPatient(db, "Priya"), "created");
  assert.equal(createPatient(db, "Amol"), "created");

  const patients = listPatients(db);
  assert.deepEqual(
    patients.map((p) => p.name),
    ["Amol", "Priya"],
  );

  cleanup();
});

test("createPatient rejects blank names", () => {
  const { db, cleanup } = tempDb();

  assert.equal(createPatient(db, "   "), "blank");
  assert.deepEqual(listPatients(db), []);

  cleanup();
});

test("createPatient rejects duplicate names", () => {
  const { db, cleanup } = tempDb();

  assert.equal(createPatient(db, "Kavi"), "created");
  assert.equal(createPatient(db, "Kavi"), "duplicate");

  assert.deepEqual(
    listPatients(db).map((p) => p.name),
    ["Kavi"],
  );

  cleanup();
});

test("deletePatient removes the patient", () => {
  const { db, cleanup } = tempDb();

  createPatient(db, "Kavi");
  const [patient] = listPatients(db);

  deletePatient(db, patient!.id);

  assert.deepEqual(listPatients(db), []);

  cleanup();
});
