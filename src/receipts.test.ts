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
  createReceipt,
  deleteReceipt,
  getLinkedPayments,
  getReceipt,
  getReceiptsForPayment,
  listReceipts,
  updateReceiptNotes,
} from "./receipts.js";

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
  createProvider(db, "CVS Pharmacy", "pharmacy");
  createAccount(db, "Chase Sapphire", "personal");
  const [patient] = listPatients(db);
  const [provider] = listProviders(db);
  const [account] = listAccounts(db);
  createPayment(db, "2026-06-01", "42.30", patient!.id, provider!.id, account!.id);
  const [payment] = listPayments(db);
  return { patientId: patient!.id, providerId: provider!.id, paymentId: payment!.id };
}

test("createReceipt and listReceipts round-trip, sorted by date descending", () => {
  const { db, cleanup } = tempDb();
  const { providerId, paymentId } = seed(db);

  assert.equal(
    createReceipt(db, "2026-06-02", providerId, "receipt", [paymentId]),
    "saved",
  );

  const receipts = listReceipts(db);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0]!.date, "2026-06-02");
  assert.equal(receipts[0]!.providerName, "CVS Pharmacy");
  assert.equal(receipts[0]!.providerCategory, "pharmacy");
  assert.equal(receipts[0]!.disambiguator, "receipt");
  assert.equal(receipts[0]!.paymentCount, 1);

  cleanup();
});

test("createReceipt defaults a blank disambiguator to 'receipt'", () => {
  const { db, cleanup } = tempDb();
  const { providerId, paymentId } = seed(db);

  createReceipt(db, "2026-06-02", providerId, "  ", [paymentId]);
  const [receipt] = listReceipts(db);
  assert.equal(receipt!.disambiguator, "receipt");

  cleanup();
});

test("createReceipt rejects a blank date or zero payments", () => {
  const { db, cleanup } = tempDb();
  const { providerId, paymentId } = seed(db);

  assert.equal(
    createReceipt(db, "  ", providerId, "receipt", [paymentId]),
    "blank-date",
  );
  assert.equal(
    createReceipt(db, "2026-06-02", providerId, "receipt", []),
    "no-payments",
  );
  assert.deepEqual(listReceipts(db), []);

  cleanup();
});

test("createReceipt rejects a duplicate date/provider/disambiguator combination", () => {
  const { db, cleanup } = tempDb();
  const { providerId, paymentId } = seed(db);

  assert.equal(
    createReceipt(db, "2026-06-02", providerId, "receipt", [paymentId]),
    "saved",
  );
  assert.equal(
    createReceipt(db, "2026-06-02", providerId, "receipt", [paymentId]),
    "duplicate",
  );
  assert.equal(listReceipts(db).length, 1);

  cleanup();
});

test("a different disambiguator avoids the duplicate collision", () => {
  const { db, cleanup } = tempDb();
  const { providerId, paymentId } = seed(db);

  assert.equal(
    createReceipt(db, "2026-06-02", providerId, "receipt", [paymentId]),
    "saved",
  );
  assert.equal(
    createReceipt(db, "2026-06-02", providerId, "card-statement", [paymentId]),
    "saved",
  );
  assert.equal(listReceipts(db).length, 2);

  cleanup();
});

test("createReceipt allows linked payments from a provider other than the receipt's own", () => {
  const { db, cleanup } = tempDb();
  const { providerId, paymentId } = seed(db);

  createProvider(db, "Walgreens", "pharmacy");
  const otherProvider = listProviders(db).find((p) => p.id !== providerId)!;
  createPatient(db, "Priya");
  createAccount(db, "HSA Bank", "hsa");
  const patient = listPatients(db).find((p) => p.name === "Priya")!;
  const account = listAccounts(db).find((a) => a.type === "hsa")!;
  createPayment(db, "2026-06-03", "15.00", patient.id, otherProvider.id, account.id);
  const otherPayment = listPayments(db).find((p) => p.id !== paymentId)!;

  assert.equal(
    createReceipt(db, "2026-06-04", providerId, "statement", [paymentId, otherPayment.id]),
    "saved",
  );

  const [receipt] = listReceipts(db);
  assert.equal(receipt!.paymentCount, 2);
  const linkedProviderIds = getLinkedPayments(db, receipt!.id)
    .map((p) => p.providerName)
    .sort();
  assert.deepEqual(linkedProviderIds, ["CVS Pharmacy", "Walgreens"]);

  cleanup();
});

test("getLinkedPayments returns the payments a receipt covers", () => {
  const { db, cleanup } = tempDb();
  const { providerId, paymentId } = seed(db);

  createReceipt(db, "2026-06-02", providerId, "receipt", [paymentId]);
  const [receipt] = listReceipts(db);

  const linked = getLinkedPayments(db, receipt!.id);
  assert.equal(linked.length, 1);
  assert.equal(linked[0]!.id, paymentId);
  assert.equal(linked[0]!.amountCents, 4230);
  assert.equal(linked[0]!.providerName, "CVS Pharmacy");
  assert.equal(linked[0]!.patientName, "Kavi");

  cleanup();
});

test("getReceiptsForPayment returns the receipts covering a payment", () => {
  const { db, cleanup } = tempDb();
  const { providerId, paymentId } = seed(db);

  createReceipt(db, "2026-06-02", providerId, "receipt", [paymentId]);
  createReceipt(db, "2026-06-05", providerId, "card-statement", [paymentId]);
  assert.deepEqual(getReceiptsForPayment(db, paymentId + 999), []);

  const linked = getReceiptsForPayment(db, paymentId);
  assert.equal(linked.length, 2);
  assert.equal(linked[0]!.date, "2026-06-05");
  assert.equal(linked[0]!.disambiguator, "card-statement");
  assert.equal(linked[0]!.providerName, "CVS Pharmacy");
  assert.equal(linked[1]!.disambiguator, "receipt");

  cleanup();
});

test("updateReceiptNotes stores trimmed notes, or null when blank", () => {
  const { db, cleanup } = tempDb();
  const { providerId, paymentId } = seed(db);

  createReceipt(db, "2026-06-02", providerId, "receipt", [paymentId], "  Original  ");
  const [receipt] = listReceipts(db);
  assert.equal(getReceipt(db, receipt!.id)!.notes, "Original");

  updateReceiptNotes(db, receipt!.id, "  Updated note  ");
  assert.equal(getReceipt(db, receipt!.id)!.notes, "Updated note");

  updateReceiptNotes(db, receipt!.id, "   ");
  assert.equal(getReceipt(db, receipt!.id)!.notes, null);

  cleanup();
});

test("deleteReceipt removes the receipt and its payment links", () => {
  const { db, cleanup } = tempDb();
  const { providerId, paymentId } = seed(db);

  createReceipt(db, "2026-06-02", providerId, "receipt", [paymentId]);
  const [receipt] = listReceipts(db);

  deleteReceipt(db, receipt!.id);

  assert.deepEqual(listReceipts(db), []);
  const remainingLinks = db
    .prepare("SELECT COUNT(*) AS n FROM receipt_payments WHERE receipt_id = ?")
    .get(receipt!.id) as { n: number };
  assert.equal(remainingLinks.n, 0);

  cleanup();
});
