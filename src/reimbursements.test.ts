import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createAccount, listAccounts } from "./accounts.js";
import { openDatabase } from "./db.js";
import { createPatient, listPatients } from "./patients.js";
import { createPayment, listPayments } from "./payments.js";
import { createProvider, listProviders } from "./providers.js";
import {
  createReimbursement,
  deleteReimbursement,
  getLinkedPayments,
  getReimbursableAmountCents,
  getReimbursement,
  isReimbursementLocked,
  listReimbursablePayments,
  listReimbursements,
  updateReimbursement,
  updateReimbursementNotes,
} from "./reimbursements.js";

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
  createAccount(db, "Fidelity HSA", "hsa");
  const [patient] = listPatients(db);
  const [provider] = listProviders(db);
  const personalAccount = listAccounts(db).find((a) => a.type === "personal")!;
  const hsaAccount = listAccounts(db).find((a) => a.type === "hsa")!;
  createPayment(db, "2026-06-01", "900.00", patient!.id, provider!.id, personalAccount.id);
  const [payment] = listPayments(db);
  return {
    patientId: patient!.id,
    providerId: provider!.id,
    personalAccountId: personalAccount.id,
    hsaAccountId: hsaAccount.id,
    paymentId: payment!.id,
  };
}

test("createReimbursement and listReimbursements round-trip, sorted by date descending", () => {
  const { db, cleanup } = tempDb();
  const { hsaAccountId, paymentId } = seed(db);

  assert.equal(
    createReimbursement(db, "2026-06-10", hsaAccountId, "initiated", [
      { paymentId, amountCents: 90000 },
    ]),
    "saved",
  );

  const reimbursements = listReimbursements(db);
  assert.equal(reimbursements.length, 1);
  assert.equal(reimbursements[0]!.date, "2026-06-10");
  assert.equal(reimbursements[0]!.accountName, "Fidelity HSA");
  assert.equal(reimbursements[0]!.accountType, "hsa");
  assert.equal(reimbursements[0]!.status, "initiated");
  assert.equal(reimbursements[0]!.totalCents, 90000);

  cleanup();
});

test("createReimbursement rejects a blank date, zero payments, or an invalid amount", () => {
  const { db, cleanup } = tempDb();
  const { hsaAccountId, paymentId } = seed(db);

  assert.equal(
    createReimbursement(db, "  ", hsaAccountId, "initiated", [
      { paymentId, amountCents: 90000 },
    ]),
    "blank-date",
  );
  assert.equal(
    createReimbursement(db, "2026-06-10", hsaAccountId, "initiated", []),
    "no-payments",
  );
  assert.equal(
    createReimbursement(db, "2026-06-10", hsaAccountId, "initiated", [
      { paymentId, amountCents: 0 },
    ]),
    "invalid-amount",
  );
  assert.equal(
    createReimbursement(db, "2026-06-10", hsaAccountId, "initiated", [
      { paymentId, amountCents: 90001 },
    ]),
    "invalid-amount",
  );
  assert.deepEqual(listReimbursements(db), []);

  cleanup();
});

test("a payment can be split across two Reimbursements, matching the $800+$100 CONTEXT.md example", () => {
  const { db, cleanup } = tempDb();
  const { hsaAccountId, paymentId } = seed(db);
  createAccount(db, "Optum LPFSA", "lpfsa");
  const lpfsaAccountId = listAccounts(db).find((a) => a.type === "lpfsa")!.id;

  assert.equal(getReimbursableAmountCents(db, paymentId), 90000);

  assert.equal(
    createReimbursement(db, "2026-06-10", lpfsaAccountId, "completed", [
      { paymentId, amountCents: 80000 },
    ]),
    "saved",
  );
  assert.equal(getReimbursableAmountCents(db, paymentId), 10000);

  assert.equal(
    createReimbursement(db, "2026-06-11", hsaAccountId, "initiated", [
      { paymentId, amountCents: 10000 },
    ]),
    "saved",
  );
  assert.equal(getReimbursableAmountCents(db, paymentId), 0);

  // A third reimbursement now has nothing left to claim.
  assert.equal(
    createReimbursement(db, "2026-06-12", hsaAccountId, "initiated", [
      { paymentId, amountCents: 1 },
    ]),
    "invalid-amount",
  );

  cleanup();
});

test("getLinkedPayments returns each link's own allocated amount, not the payment's full amount", () => {
  const { db, cleanup } = tempDb();
  const { hsaAccountId, paymentId } = seed(db);

  createReimbursement(db, "2026-06-10", hsaAccountId, "initiated", [
    { paymentId, amountCents: 30000 },
  ]);
  const [reimbursement] = listReimbursements(db);

  const linked = getLinkedPayments(db, reimbursement!.id);
  assert.equal(linked.length, 1);
  assert.equal(linked[0]!.id, paymentId);
  assert.equal(linked[0]!.amountCents, 30000);
  assert.equal(linked[0]!.providerName, "Dr. Sam Okafor");
  assert.equal(linked[0]!.patientName, "Kavi");

  cleanup();
});

test("isReimbursementLocked is true only once status is completed", () => {
  const { db, cleanup } = tempDb();
  const { hsaAccountId, paymentId } = seed(db);

  createReimbursement(db, "2026-06-10", hsaAccountId, "initiated", [
    { paymentId, amountCents: 90000 },
  ]);
  const [reimbursement] = listReimbursements(db);
  assert.equal(isReimbursementLocked(reimbursement!), false);

  updateReimbursement(db, reimbursement!.id, "2026-06-10", hsaAccountId, "completed", [
    { paymentId, amountCents: 90000 },
  ]);
  const updated = getReimbursement(db, reimbursement!.id);
  assert.equal(isReimbursementLocked(updated!), true);

  cleanup();
});

test("updateReimbursement can re-save the same allocation without tripping over-allocation on itself", () => {
  const { db, cleanup } = tempDb();
  const { hsaAccountId, paymentId } = seed(db);

  createReimbursement(db, "2026-06-10", hsaAccountId, "initiated", [
    { paymentId, amountCents: 90000 },
  ]);
  const [reimbursement] = listReimbursements(db);

  assert.equal(
    updateReimbursement(db, reimbursement!.id, "2026-06-15", hsaAccountId, "initiated", [
      { paymentId, amountCents: 90000 },
    ]),
    "saved",
  );
  const updated = getReimbursement(db, reimbursement!.id);
  assert.equal(updated!.date, "2026-06-15");

  cleanup();
});

test("updateReimbursementNotes only touches notes", () => {
  const { db, cleanup } = tempDb();
  const { hsaAccountId, paymentId } = seed(db);

  createReimbursement(
    db,
    "2026-06-10",
    hsaAccountId,
    "completed",
    [{ paymentId, amountCents: 90000 }],
    "Original",
  );
  const [reimbursement] = listReimbursements(db);

  updateReimbursementNotes(db, reimbursement!.id, "Updated");
  const updated = getReimbursement(db, reimbursement!.id);
  assert.equal(updated!.notes, "Updated");
  assert.equal(updated!.date, "2026-06-10");
  assert.equal(updated!.status, "completed");

  cleanup();
});

test("deleteReimbursement removes its payment links and frees the reimbursable amount again", () => {
  const { db, cleanup } = tempDb();
  const { hsaAccountId, paymentId } = seed(db);

  createReimbursement(db, "2026-06-10", hsaAccountId, "initiated", [
    { paymentId, amountCents: 90000 },
  ]);
  const [reimbursement] = listReimbursements(db);
  assert.equal(getReimbursableAmountCents(db, paymentId), 0);

  deleteReimbursement(db, reimbursement!.id);

  assert.deepEqual(listReimbursements(db), []);
  assert.equal(getReimbursableAmountCents(db, paymentId), 90000);
  const remainingLinks = db
    .prepare("SELECT COUNT(*) AS n FROM reimbursement_payments WHERE reimbursement_id = ?")
    .get(reimbursement!.id) as { n: number };
  assert.equal(remainingLinks.n, 0);

  cleanup();
});

test("listReimbursablePayments excludes non-personal-account payments and fully-claimed payments", () => {
  const { db, cleanup } = tempDb();
  const { patientId, providerId, personalAccountId, hsaAccountId, paymentId } = seed(db);

  createPayment(db, "2026-06-02", "50.00", patientId, providerId, hsaAccountId);

  const beforeClaim = listReimbursablePayments(db);
  assert.equal(beforeClaim.length, 1);
  assert.equal(beforeClaim[0]!.id, paymentId);
  assert.equal(beforeClaim[0]!.reimbursableAmountCents, 90000);

  createReimbursement(db, "2026-06-10", hsaAccountId, "initiated", [
    { paymentId, amountCents: 90000 },
  ]);
  assert.deepEqual(listReimbursablePayments(db), []);

  const [reimbursement] = listReimbursements(db);
  const excludingSelf = listReimbursablePayments(db, reimbursement!.id);
  assert.equal(excludingSelf.length, 1);
  assert.equal(excludingSelf[0]!.reimbursableAmountCents, 90000);

  createPayment(db, "2026-06-03", "20.00", patientId, providerId, personalAccountId);
  const afterSecondPersonalPayment = listReimbursablePayments(db);
  assert.equal(afterSecondPersonalPayment.length, 1);
  assert.equal(afterSecondPersonalPayment[0]!.amountCents, 2000);

  cleanup();
});
