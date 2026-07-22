import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildApp } from "../app.js";
import { seedPayment } from "./test-helpers.js";

test("GET /receipts shows a message when no providers/payments exist yet", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  const response = await app.inject({ method: "GET", url: "/receipts" });
  assert.match(response.body, /No receipts yet\./);
  assert.match(response.body, /Add a provider and at least one payment first\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("GET /receipts lists receipts, and POST creates/views/deletes them", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { providerId, paymentId } = await seedPayment(app);

  const listPage = await app.inject({ method: "GET", url: "/receipts" });
  assert.match(listPage.body, /New receipt/);
  assert.match(listPage.body, /Dr\. Sam Okafor/);

  const create = await app.inject({
    method: "POST",
    url: "/receipts",
    payload: { date: "2026-06-02", providerId, paymentIds: paymentId },
  });
  assert.equal(create.statusCode, 302);
  assert.equal(create.headers.location, "/receipts");

  const afterCreate = await app.inject({ method: "GET", url: "/receipts" });
  assert.match(afterCreate.body, /Jun 2, 2026/);
  assert.match(afterCreate.body, /Dr\. Sam Okafor/);
  assert.match(afterCreate.body, /receipt/);
  assert.match(afterCreate.body, /1 payment</);

  const idMatch = afterCreate.body.match(/\/receipts\?view=(\d+)/);
  assert.ok(idMatch, "expected a receipt id in the rendered view link");
  const id = idMatch[1];

  const viewPage = await app.inject({ method: "GET", url: `/receipts?view=${id}` });
  assert.match(viewPage.body, /<h2>Dr\. Sam Okafor<\/h2>/);
  assert.match(viewPage.body, /<span class="ptsub">receipt · Jun 2, 2026<\/span>/);
  assert.match(viewPage.body, /Kavi · Jun 1, 2026 · \$42\.30/);
  assert.match(viewPage.body, /20260602-dr-sam-okafor-receipt/);

  await app.inject({ method: "POST", url: `/receipts/${id}/delete` });
  const afterDelete = await app.inject({ method: "GET", url: "/receipts" });
  assert.match(afterDelete.body, /No receipts yet\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("linking a Receipt to a Payment shows up on the Payment side, in the table and its edit panel", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { providerId, paymentId } = await seedPayment(app);

  const beforeLink = await app.inject({ method: "GET", url: "/payments" });
  assert.match(beforeLink.body, /<td class="row-links">—<\/td>\s*<td><a href="\/payments\?edit=/);
  const editBeforeLink = await app.inject({ method: "GET", url: `/payments?edit=${paymentId}` });
  assert.match(editBeforeLink.body, /<h3>Receipts \(0\)<\/h3>\s*<p class="empty-note">No receipts linked\.<\/p>/);

  const create = await app.inject({
    method: "POST",
    url: "/receipts",
    payload: { date: "2026-06-02", providerId, disambiguator: "card-statement", paymentIds: paymentId },
  });
  const receiptsAfterCreate = await app.inject({ method: "GET", url: "/receipts" });
  const receiptId = receiptsAfterCreate.body.match(/\/receipts\?view=(\d+)/)![1];
  assert.equal(create.statusCode, 302);

  const afterLink = await app.inject({ method: "GET", url: "/payments" });
  assert.match(afterLink.body, /1 receipt/);

  const editPage = await app.inject({ method: "GET", url: `/payments?edit=${paymentId}` });
  assert.match(editPage.body, /<h3>Receipts \(1\)<\/h3>/);
  assert.match(editPage.body, /Dr\. Sam Okafor/);
  assert.match(editPage.body, /card-statement · Jun 2, 2026/);

  await app.inject({ method: "POST", url: `/receipts/${receiptId}/delete` });

  const afterDelete = await app.inject({ method: "GET", url: "/payments" });
  assert.match(afterDelete.body, /<td class="row-links">—<\/td>\s*<td><a href="\/payments\?edit=/);
  const editAfterDelete = await app.inject({ method: "GET", url: `/payments?edit=${paymentId}` });
  assert.match(editAfterDelete.body, /<h3>Receipts \(0\)<\/h3>\s*<p class="empty-note">No receipts linked\.<\/p>/);
  assert.doesNotMatch(editAfterDelete.body, /Locked — a Receipt or Reimbursement references this payment\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("POST /receipts rejects a blank date, zero payments, or a duplicate combination", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { providerId, paymentId } = await seedPayment(app);

  const blankDate = await app.inject({
    method: "POST",
    url: "/receipts",
    payload: { date: "  ", providerId, paymentIds: paymentId },
  });
  assert.equal(blankDate.headers.location, "/receipts?error=blank-date");

  const noPayments = await app.inject({
    method: "POST",
    url: "/receipts",
    payload: { date: "2026-06-02", providerId },
  });
  assert.equal(noPayments.headers.location, "/receipts?error=no-payments");

  await app.inject({
    method: "POST",
    url: "/receipts",
    payload: { date: "2026-06-02", providerId, paymentIds: paymentId },
  });
  const duplicate = await app.inject({
    method: "POST",
    url: "/receipts",
    payload: { date: "2026-06-02", providerId, paymentIds: paymentId },
  });
  assert.equal(duplicate.headers.location, "/receipts?error=duplicate");

  const withError = await app.inject({
    method: "GET",
    url: "/receipts?error=duplicate",
  });
  assert.match(
    withError.body,
    /A receipt with that date, provider, and disambiguator already exists\./,
  );

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("only notes can be changed on an existing receipt", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { providerId, paymentId } = await seedPayment(app);

  await app.inject({
    method: "POST",
    url: "/receipts",
    payload: { date: "2026-06-02", providerId, paymentIds: paymentId },
  });
  const afterCreate = await app.inject({ method: "GET", url: "/receipts" });
  const id = afterCreate.body.match(/\/receipts\?view=(\d+)/)![1];

  await app.inject({
    method: "POST",
    url: `/receipts/${id}/update`,
    payload: { notes: "Verified against the card statement" },
  });

  const viewPage = await app.inject({ method: "GET", url: `/receipts?view=${id}` });
  assert.match(viewPage.body, /Verified against the card statement/);
  assert.match(viewPage.body, /Jun 2, 2026/);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("GET /receipts shows the expected folder key, and lists files once the folder exists", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { providerId, paymentId } = await seedPayment(app);

  await app.inject({
    method: "POST",
    url: "/receipts",
    payload: { date: "2026-06-02", providerId, paymentIds: paymentId },
  });
  const afterCreate = await app.inject({ method: "GET", url: "/receipts" });
  const id = afterCreate.body.match(/\/receipts\?view=(\d+)/)![1];

  const beforeFolder = await app.inject({ method: "GET", url: `/receipts?view=${id}` });
  assert.match(beforeFolder.body, /20260602-dr-sam-okafor-receipt/);
  assert.match(beforeFolder.body, /Check for files/);
  assert.doesNotMatch(beforeFolder.body, /Files \(\d/);

  const folder = path.join(dataDir, "receipt-files", "20260602-dr-sam-okafor-receipt");
  mkdirSync(folder, { recursive: true });
  writeFileSync(path.join(folder, "receipt.pdf"), "stub");

  const afterFolder = await app.inject({ method: "GET", url: `/receipts?view=${id}` });
  assert.match(afterFolder.body, /Files \(1\)/);
  assert.match(afterFolder.body, /receipt\.pdf/);

  const open = await app.inject({
    method: "GET",
    url: `/receipts/${id}/files/${encodeURIComponent("receipt.pdf")}/open`,
  });
  assert.equal(open.statusCode, 200);
  assert.equal(open.body, "stub");

  // A second file depicting the same document (e.g. a blurry retake) is
  // expected to land in the same folder, not force a new Receipt. See ADR 0007.
  writeFileSync(path.join(folder, "receipt-retake.pdf"), "stub2");
  const afterSecondFile = await app.inject({ method: "GET", url: `/receipts?view=${id}` });
  assert.match(afterSecondFile.body, /Files \(2\)/);
  assert.match(afterSecondFile.body, /receipt\.pdf/);
  assert.match(afterSecondFile.body, /receipt-retake\.pdf/);

  const openSecond = await app.inject({
    method: "GET",
    url: `/receipts/${id}/files/${encodeURIComponent("receipt-retake.pdf")}/open`,
  });
  assert.equal(openSecond.statusCode, 200);
  assert.equal(openSecond.body, "stub2");

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});
