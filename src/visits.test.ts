import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createPatient, listPatients } from "./patients.js";
import { openDatabase } from "./db.js";
import { createProvider, listProviders } from "./providers.js";
import {
  createVisit,
  deleteVisit,
  getVisit,
  listVisits,
  updateVisit,
} from "./visits.js";

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

function seedPatientAndProvider(db: ReturnType<typeof openDatabase>) {
  createPatient(db, "Kavi");
  createProvider(db, "Dr. Sam Okafor", "medical");
  const [patient] = listPatients(db);
  const [provider] = listProviders(db);
  return { patientId: patient!.id, providerId: provider!.id };
}

test("createVisit and listVisits round-trip, sorted by date descending", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId } = seedPatientAndProvider(db);

  assert.equal(createVisit(db, "2026-06-01", patientId, providerId), "saved");
  assert.equal(createVisit(db, "2026-06-15", patientId, providerId), "saved");

  const visits = listVisits(db);
  assert.equal(visits.length, 2);
  assert.equal(visits[0]!.date, "2026-06-15");
  assert.equal(visits[1]!.date, "2026-06-01");
  assert.equal(visits[0]!.patientName, "Kavi");
  assert.equal(visits[0]!.providerName, "Dr. Sam Okafor");

  cleanup();
});

test("createVisit rejects a blank date", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId } = seedPatientAndProvider(db);

  assert.equal(createVisit(db, "  ", patientId, providerId), "blank-date");
  assert.deepEqual(listVisits(db), []);

  cleanup();
});

test("getVisit returns a single visit for editing", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId } = seedPatientAndProvider(db);

  createVisit(db, "2026-06-01", patientId, providerId);
  const [visit] = listVisits(db);

  assert.deepEqual(getVisit(db, visit!.id), {
    id: visit!.id,
    date: "2026-06-01",
    patientId,
    providerId,
    notes: null,
  });

  cleanup();
});

test("createVisit and updateVisit store trimmed notes, or null when blank", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId } = seedPatientAndProvider(db);

  createVisit(db, "2026-06-01", patientId, providerId, "  Follow-up needed  ");
  const [visit] = listVisits(db);
  assert.equal(visit!.notes, "Follow-up needed");

  updateVisit(db, visit!.id, "2026-06-01", patientId, providerId, "   ");
  assert.equal(getVisit(db, visit!.id)!.notes, null);

  cleanup();
});

test("updateVisit changes the date, patient, and provider", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId } = seedPatientAndProvider(db);

  createVisit(db, "2026-06-01", patientId, providerId);
  const [visit] = listVisits(db);

  createPatient(db, "Rosa");
  const otherPatient = listPatients(db).find((p) => p.name === "Rosa")!;

  assert.equal(
    updateVisit(db, visit!.id, "2026-06-20", otherPatient.id, providerId),
    "saved",
  );

  const updated = getVisit(db, visit!.id);
  assert.equal(updated!.date, "2026-06-20");
  assert.equal(updated!.patientId, otherPatient.id);

  cleanup();
});

test("updateVisit rejects a blank date", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId } = seedPatientAndProvider(db);

  createVisit(db, "2026-06-01", patientId, providerId);
  const [visit] = listVisits(db);

  assert.equal(
    updateVisit(db, visit!.id, "", patientId, providerId),
    "blank-date",
  );
  assert.equal(getVisit(db, visit!.id)!.date, "2026-06-01");

  cleanup();
});

test("deleteVisit removes the visit", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId } = seedPatientAndProvider(db);

  createVisit(db, "2026-06-01", patientId, providerId);
  const [visit] = listVisits(db);

  deleteVisit(db, visit!.id);

  assert.deepEqual(listVisits(db), []);

  cleanup();
});
