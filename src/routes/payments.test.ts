import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildApp } from "../app.js";
import { seedPatientProviderAccount, seedPayment } from "./test-helpers.js";

test("GET /payments shows a message when no patients/providers/accounts exist yet", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  const response = await app.inject({ method: "GET", url: "/payments" });
  assert.match(response.body, /No payments yet\./);
  assert.match(response.body, /Add a patient, provider, and account first, in Manage\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("GET /payments lists payments, and POST creates/updates/deletes them", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { patientId, providerId, accountId } = await seedPatientProviderAccount(app);

  const create = await app.inject({
    method: "POST",
    url: "/payments",
    payload: { date: "2026-06-01", amount: "42.30", patientId, providerId, accountId },
  });
  assert.equal(create.statusCode, 302);
  assert.equal(create.headers.location, "/payments");

  const afterCreate = await app.inject({ method: "GET", url: "/payments" });
  assert.match(afterCreate.body, /Jun 1, 2026/);
  assert.match(afterCreate.body, /Kavi/);
  assert.match(afterCreate.body, /Dr\. Sam Okafor/);
  assert.match(afterCreate.body, /\$42\.30/);
  assert.match(afterCreate.body, /Reimbursable/);

  const idMatch = afterCreate.body.match(/\/payments\?edit=(\d+)/);
  assert.ok(idMatch, "expected a payment id in the rendered edit link");
  const id = idMatch[1];

  const editPage = await app.inject({ method: "GET", url: `/payments?edit=${id}` });
  assert.match(editPage.body, /<h2>Dr\. Sam Okafor<\/h2>/);
  assert.match(editPage.body, /<span class="ptsub">Kavi · Jun 1, 2026<\/span>/);
  assert.match(editPage.body, /value="42\.30"/);

  const update = await app.inject({
    method: "POST",
    url: `/payments/${id}/update`,
    payload: { date: "2026-06-15", amount: "50.00", patientId, providerId, accountId },
  });
  assert.equal(update.statusCode, 302);
  assert.equal(update.headers.location, "/payments");

  const afterUpdate = await app.inject({ method: "GET", url: "/payments" });
  assert.match(afterUpdate.body, /Jun 15, 2026/);
  assert.match(afterUpdate.body, /\$50\.00/);
  assert.doesNotMatch(afterUpdate.body, /Jun 1, 2026/);

  await app.inject({ method: "POST", url: `/payments/${id}/delete` });
  const afterDelete = await app.inject({ method: "GET", url: "/payments" });
  assert.match(afterDelete.body, /No payments yet\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("POST /payments with a blank date or invalid amount redirects with an error", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { patientId, providerId, accountId } = await seedPatientProviderAccount(app);

  const blankDate = await app.inject({
    method: "POST",
    url: "/payments",
    payload: { date: "  ", amount: "42.30", patientId, providerId, accountId },
  });
  assert.equal(blankDate.headers.location, "/payments?error=blank-date");

  const badAmount = await app.inject({
    method: "POST",
    url: "/payments",
    payload: { date: "2026-06-01", amount: "0", patientId, providerId, accountId },
  });
  assert.equal(badAmount.headers.location, "/payments?error=invalid-amount");

  const withError = await app.inject({
    method: "GET",
    url: "/payments?error=invalid-amount",
  });
  assert.match(withError.body, /Enter a valid amount greater than zero\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("a payment locks once a Receipt or Reimbursement references it, but notes stay editable", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { patientId, providerId, accountId } = await seedPatientProviderAccount(app);

  await app.inject({
    method: "POST",
    url: "/payments",
    payload: { date: "2026-06-01", amount: "42.30", patientId, providerId, accountId },
  });
  const afterCreate = await app.inject({ method: "GET", url: "/payments" });
  const id = afterCreate.body.match(/\/payments\?edit=(\d+)/)![1];

  app.db
    .prepare(
      "INSERT INTO receipts (id, date, provider_id, disambiguator) VALUES (1, '2026-06-02', ?, 'receipt')",
    )
    .run(Number(providerId));
  app.db
    .prepare("INSERT INTO receipt_payments (receipt_id, payment_id) VALUES (1, ?)")
    .run(Number(id));

  const editPage = await app.inject({ method: "GET", url: `/payments?edit=${id}` });
  assert.match(editPage.body, /Locked — a Receipt or Reimbursement references this payment\./);
  assert.match(editPage.body, /class="field-value-static">\$42\.30</);

  const update = await app.inject({
    method: "POST",
    url: `/payments/${id}/update`,
    payload: {
      date: "2026-09-01",
      amount: "999.00",
      patientId,
      providerId,
      accountId,
      notes: "Reviewed against the receipt",
    },
  });
  assert.equal(update.statusCode, 302);

  const afterUpdate = await app.inject({ method: "GET", url: "/payments" });
  assert.match(afterUpdate.body, /Jun 1, 2026/);
  assert.match(afterUpdate.body, /\$42\.30/);
  assert.doesNotMatch(afterUpdate.body, /\$999\.00/);

  const editAfterUpdate = await app.inject({ method: "GET", url: `/payments?edit=${id}` });
  assert.match(editAfterUpdate.body, /Reviewed against the receipt/);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("linking a Visit to a Payment shows up on both sides, and stays editable even when the payment is locked", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { patientId, providerId, accountId, paymentId } = await seedPayment(app);

  await app.inject({
    method: "POST",
    url: "/visits",
    payload: { date: "2026-05-20", patientId, providerId },
  });
  const visitsAfterCreate = await app.inject({ method: "GET", url: "/visits" });
  const visitId = visitsAfterCreate.body.match(/\/visits\?edit=(\d+)/)![1];
  assert.match(visitsAfterCreate.body, /No payment recorded for this visit yet/);

  const editBeforeLink = await app.inject({ method: "GET", url: `/payments?edit=${paymentId}` });
  assert.match(editBeforeLink.body, /<h3>Visits \(0\)<\/h3>/);

  const link = await app.inject({
    method: "POST",
    url: `/payments/${paymentId}/update`,
    payload: {
      date: "2026-06-01",
      amount: "42.30",
      patientId,
      providerId,
      accountId,
      visitIds: [visitId],
    },
  });
  assert.equal(link.statusCode, 302);

  const editAfterLink = await app.inject({ method: "GET", url: `/payments?edit=${paymentId}` });
  assert.match(editAfterLink.body, /<h3>Visits \(1\)<\/h3>/);

  const paymentsAfterLink = await app.inject({ method: "GET", url: "/payments" });
  assert.match(paymentsAfterLink.body, /<td class="row-links">1 visit<\/td>/);

  const visitsAfterLink = await app.inject({ method: "GET", url: "/visits" });
  assert.doesNotMatch(visitsAfterLink.body, /No payment recorded for this visit yet/);
  assert.match(visitsAfterLink.body, /class="chip">\$42\.30 · Jun 1, 2026/);

  // Lock the payment with a Receipt, and confirm the visit link still saves.
  await app.inject({
    method: "POST",
    url: "/receipts",
    payload: { date: "2026-06-02", providerId, paymentIds: paymentId },
  });
  const editLocked = await app.inject({ method: "GET", url: `/payments?edit=${paymentId}` });
  assert.match(editLocked.body, /Locked — a Receipt or Reimbursement references this payment\./);

  const unlink = await app.inject({
    method: "POST",
    url: `/payments/${paymentId}/update`,
    payload: { notes: "still locked" },
  });
  assert.equal(unlink.statusCode, 302);

  const editAfterUnlink = await app.inject({ method: "GET", url: `/payments?edit=${paymentId}` });
  assert.match(editAfterUnlink.body, /<h3>Visits \(0\)<\/h3>/);

  const visitsAfterUnlink = await app.inject({ method: "GET", url: "/visits" });
  assert.match(visitsAfterUnlink.body, /No payment recorded for this visit yet/);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});
