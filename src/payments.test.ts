import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createAccount, listAccounts } from "./accounts.js";
import { openDatabase } from "./db.js";
import {
  createPayment,
  deletePayment,
  getPayment,
  isPaymentLocked,
  listPayments,
  parseAmountCents,
  updatePayment,
} from "./payments.js";
import { createPatient, listPatients } from "./patients.js";
import { createProvider, listProviders } from "./providers.js";

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

function seed(db: ReturnType<typeof openDatabase>) {
  createPatient(db, "Kavi");
  createProvider(db, "Dr. Sam Okafor", "medical");
  createAccount(db, "Chase Sapphire", "personal");
  const [patient] = listPatients(db);
  const [provider] = listProviders(db);
  const [account] = listAccounts(db);
  return { patientId: patient!.id, providerId: provider!.id, accountId: account!.id };
}

test("parseAmountCents accepts dollars, dollars.cents, and a leading $, rejects invalid input", () => {
  assert.equal(parseAmountCents("900"), 90000);
  assert.equal(parseAmountCents("900.5"), 90050);
  assert.equal(parseAmountCents("900.50"), 90050);
  assert.equal(parseAmountCents("$42.30"), 4230);
  assert.equal(parseAmountCents(""), undefined);
  assert.equal(parseAmountCents("  "), undefined);
  assert.equal(parseAmountCents("0"), undefined);
  assert.equal(parseAmountCents("-5"), undefined);
  assert.equal(parseAmountCents("abc"), undefined);
  assert.equal(parseAmountCents("900.555"), undefined);
});

test("createPayment and listPayments round-trip, sorted by date descending", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId, accountId } = seed(db);

  assert.equal(
    createPayment(db, "2026-06-01", "42.30", patientId, providerId, accountId),
    "saved",
  );
  assert.equal(
    createPayment(db, "2026-06-15", "18.75", patientId, providerId, accountId),
    "saved",
  );

  const payments = listPayments(db);
  assert.equal(payments.length, 2);
  assert.equal(payments[0]!.date, "2026-06-15");
  assert.equal(payments[0]!.amountCents, 1875);
  assert.equal(payments[1]!.date, "2026-06-01");
  assert.equal(payments[0]!.patientName, "Kavi");
  assert.equal(payments[0]!.providerName, "Dr. Sam Okafor");
  assert.equal(payments[0]!.providerCategory, "medical");
  assert.equal(payments[0]!.accountName, "Chase Sapphire");
  assert.equal(payments[0]!.accountType, "personal");

  cleanup();
});

test("createPayment rejects a blank date or an invalid amount", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId, accountId } = seed(db);

  assert.equal(
    createPayment(db, "  ", "42.30", patientId, providerId, accountId),
    "blank-date",
  );
  assert.equal(
    createPayment(db, "2026-06-01", "0", patientId, providerId, accountId),
    "invalid-amount",
  );
  assert.deepEqual(listPayments(db), []);

  cleanup();
});

test("updatePayment changes fields, and rejects a blank date or invalid amount", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId, accountId } = seed(db);

  createPayment(db, "2026-06-01", "42.30", patientId, providerId, accountId);
  const [payment] = listPayments(db);

  assert.equal(
    updatePayment(db, payment!.id, "2026-06-20", "50.00", patientId, providerId, accountId),
    "saved",
  );
  const updated = getPayment(db, payment!.id);
  assert.equal(updated!.date, "2026-06-20");
  assert.equal(updated!.amountCents, 5000);

  assert.equal(
    updatePayment(db, payment!.id, "", "50.00", patientId, providerId, accountId),
    "blank-date",
  );
  assert.equal(
    updatePayment(db, payment!.id, "2026-06-20", "abc", patientId, providerId, accountId),
    "invalid-amount",
  );

  cleanup();
});

test("a payment is unlocked until a Receipt or Reimbursement links to it", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId, accountId } = seed(db);

  createPayment(db, "2026-06-01", "42.30", patientId, providerId, accountId);
  const [payment] = listPayments(db);
  assert.equal(isPaymentLocked(db, payment!.id), false);

  db.prepare("INSERT INTO receipts (id, file_path) VALUES (1, 'x')").run();
  db.prepare(
    "INSERT INTO receipt_payments (receipt_id, payment_id) VALUES (1, ?)",
  ).run(payment!.id);

  assert.equal(isPaymentLocked(db, payment!.id), true);

  cleanup();
});

test("a payment locks once a Reimbursement links to it", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId, accountId } = seed(db);

  createPayment(db, "2026-06-01", "42.30", patientId, providerId, accountId);
  const [payment] = listPayments(db);

  db.prepare(
    "INSERT INTO reimbursements (id, date, account_id, status) VALUES (1, '2026-07-01', ?, 'initiated')",
  ).run(accountId);
  db.prepare(
    "INSERT INTO reimbursement_payments (reimbursement_id, payment_id, amount_cents) VALUES (1, ?, 4230)",
  ).run(payment!.id);

  assert.equal(isPaymentLocked(db, payment!.id), true);

  cleanup();
});

test("deletePayment removes the payment", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId, accountId } = seed(db);

  createPayment(db, "2026-06-01", "42.30", patientId, providerId, accountId);
  const [payment] = listPayments(db);

  deletePayment(db, payment!.id);

  assert.deepEqual(listPayments(db), []);

  cleanup();
});
