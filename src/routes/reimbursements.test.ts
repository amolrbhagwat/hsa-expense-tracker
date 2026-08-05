import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildApp } from "../app.js";
import { extractPanel, seedReimbursablePayment } from "./test-helpers.js";

test("GET /reimbursements renders with its tab active, and shows a hint when nothing is recordable yet", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  const response = await app.inject({ method: "GET", url: "/reimbursements" });

  assert.equal(response.statusCode, 200);
  assert.match(response.body, /<h1>Reimbursements<\/h1>/);
  assert.match(
    response.body,
    /<a href="\/reimbursements" class="tab tab-active">Reimbursements<\/a>/,
  );
  assert.match(response.body, /No reimbursements yet\./);
  assert.match(
    response.body,
    /Add a tax-advantaged account, in Manage, and a reimbursable payment first\./,
  );
  assert.doesNotMatch(response.body, /Select payments/);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("the quickadd row carries date/account/status into the picker panel via ?new=1", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { hsaAccountId } = await seedReimbursablePayment(app);

  const listPage = await app.inject({ method: "GET", url: "/reimbursements" });
  assert.match(listPage.body, /class="quickadd-row"/);
  assert.match(listPage.body, /Select payments/);

  const opened = await app.inject({
    method: "GET",
    url: `/reimbursements?new=1&date=2026-07-01&accountId=${hsaAccountId}&status=completed`,
  });
  const panel = extractPanel(opened.body);
  assert.match(panel, /<input type="date" name="date" value="2026-07-01">/);
  assert.match(panel, new RegExp(`<option value="${hsaAccountId}" selected>`));
  assert.match(panel, /<option value="completed" selected>Completed<\/option>/);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("GET /reimbursements?new=1 shows a payment picker prefilled with the full reimbursable amount", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  await seedReimbursablePayment(app);

  const response = await app.inject({ method: "GET", url: "/reimbursements?new=1" });
  const panel = extractPanel(response.body);
  assert.match(panel, /Dr\. Sam Okafor/);
  assert.match(panel, /value="900\.00"/);
  assert.doesNotMatch(panel, /<input type="checkbox"[^>]*\schecked/);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("POST /reimbursements creates a partial reimbursement, and it shows up on both screens", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { hsaAccountId, paymentId } = await seedReimbursablePayment(app);

  const create = await app.inject({
    method: "POST",
    url: "/reimbursements",
    payload: {
      date: "2026-07-01",
      accountId: hsaAccountId,
      status: "initiated",
      paymentIds: [paymentId],
      [`amount_${paymentId}`]: "800.00",
    },
  });
  assert.equal(create.statusCode, 302);
  assert.equal(create.headers.location, "/reimbursements");

  const list = await app.inject({ method: "GET", url: "/reimbursements" });
  assert.match(list.body, /Jul 1, 2026/);
  assert.match(list.body, /Fidelity HSA/);
  assert.match(list.body, /\$800\.00/);
  assert.match(list.body, /Initiated/);
  assert.match(list.body, /Dr\. Sam Okafor · \$800\.00/);

  // $100 of the $900 payment is still reimbursable — it should still appear
  // in a fresh picker, capped at the remaining amount.
  const newPanel = await app.inject({ method: "GET", url: "/reimbursements?new=1" });
  assert.match(extractPanel(newPanel.body), /value="100\.00"/);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("POST /reimbursements rejects a blank date, zero payments, or an over-allocated amount", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { hsaAccountId, paymentId } = await seedReimbursablePayment(app);

  const blankDate = await app.inject({
    method: "POST",
    url: "/reimbursements",
    payload: {
      date: "  ",
      accountId: hsaAccountId,
      status: "initiated",
      paymentIds: [paymentId],
      [`amount_${paymentId}`]: "900.00",
    },
  });
  assert.equal(blankDate.headers.location, "/reimbursements?error=blank-date");

  const noPayments = await app.inject({
    method: "POST",
    url: "/reimbursements",
    payload: { date: "2026-07-01", accountId: hsaAccountId, status: "initiated" },
  });
  assert.equal(noPayments.headers.location, "/reimbursements?error=no-payments");

  const overAllocated = await app.inject({
    method: "POST",
    url: "/reimbursements",
    payload: {
      date: "2026-07-01",
      accountId: hsaAccountId,
      status: "initiated",
      paymentIds: [paymentId],
      [`amount_${paymentId}`]: "1000.00",
    },
  });
  assert.equal(overAllocated.headers.location, "/reimbursements?error=invalid-amount");

  const withError = await app.inject({
    method: "GET",
    url: "/reimbursements?error=invalid-amount",
  });
  assert.match(
    withError.body,
    /Each covered payment's amount must be greater than zero and no more than its remaining reimbursable amount\./,
  );

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("a reimbursement stays editable while initiated, locks (incl. status) once completed, and locking cascades to the Payment", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { hsaAccountId, paymentId } = await seedReimbursablePayment(app);

  await app.inject({
    method: "POST",
    url: "/reimbursements",
    payload: {
      date: "2026-07-01",
      accountId: hsaAccountId,
      status: "initiated",
      paymentIds: [paymentId],
      [`amount_${paymentId}`]: "800.00",
    },
  });
  const list = await app.inject({ method: "GET", url: "/reimbursements" });
  const reimbursementId = list.body.match(/\/reimbursements\?edit=(\d+)/)![1];

  const paymentBeforeLock = await app.inject({ method: "GET", url: `/payments?edit=${paymentId}` });
  assert.match(paymentBeforeLock.body, /Locked/);

  // Still initiated: free to change the date and the allocated amount.
  const editWhileInitiated = await app.inject({
    method: "GET",
    url: `/reimbursements?edit=${reimbursementId}`,
  });
  assert.match(extractPanel(editWhileInitiated.body), /<input type="date" name="date"/);

  const update = await app.inject({
    method: "POST",
    url: `/reimbursements/${reimbursementId}/update`,
    payload: {
      date: "2026-07-05",
      accountId: hsaAccountId,
      status: "completed",
      paymentIds: [paymentId],
      [`amount_${paymentId}`]: "800.00",
    },
  });
  assert.equal(update.statusCode, 302);

  const editWhileCompleted = await app.inject({
    method: "GET",
    url: `/reimbursements?edit=${reimbursementId}`,
  });
  const lockedPanel = extractPanel(editWhileCompleted.body);
  assert.match(lockedPanel, /class="lock-note"/);
  assert.doesNotMatch(lockedPanel, /<input type="date" name="date"/);
  assert.match(lockedPanel, /Jul 5, 2026/);

  // Locked, but notes still save.
  await app.inject({
    method: "POST",
    url: `/reimbursements/${reimbursementId}/update`,
    payload: { date: "2099-01-01", accountId: hsaAccountId, status: "initiated", notes: "Received via direct deposit" },
  });
  const afterNotesUpdate = await app.inject({ method: "GET", url: "/reimbursements" });
  assert.match(afterNotesUpdate.body, /Jul 5, 2026/);
  assert.doesNotMatch(afterNotesUpdate.body, /Jan 1, 2099/);
  const editAfterNotesUpdate = await app.inject({
    method: "GET",
    url: `/reimbursements?edit=${reimbursementId}`,
  });
  assert.match(extractPanel(editAfterNotesUpdate.body), /Received via direct deposit/);
  // Status itself did not flip back to initiated, despite the attempt above.
  assert.match(extractPanel(editAfterNotesUpdate.body), /Completed/);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("deleting a Reimbursement frees the Payment's reimbursable amount and unlocks it again", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { hsaAccountId, paymentId } = await seedReimbursablePayment(app);

  await app.inject({
    method: "POST",
    url: "/reimbursements",
    payload: {
      date: "2026-07-01",
      accountId: hsaAccountId,
      status: "initiated",
      paymentIds: [paymentId],
      [`amount_${paymentId}`]: "900.00",
    },
  });
  const list = await app.inject({ method: "GET", url: "/reimbursements" });
  const reimbursementId = list.body.match(/\/reimbursements\?edit=(\d+)/)![1];

  await app.inject({ method: "POST", url: `/reimbursements/${reimbursementId}/delete` });

  const afterDelete = await app.inject({ method: "GET", url: "/reimbursements" });
  assert.match(afterDelete.body, /No reimbursements yet\./);

  const paymentAfterDelete = await app.inject({ method: "GET", url: `/payments?edit=${paymentId}` });
  assert.doesNotMatch(paymentAfterDelete.body, /Locked/);

  const newPanel = await app.inject({ method: "GET", url: "/reimbursements?new=1" });
  assert.match(extractPanel(newPanel.body), /value="900\.00"/);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});
