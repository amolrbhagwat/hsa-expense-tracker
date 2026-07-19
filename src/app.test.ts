import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";

test("GET /health returns ok", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  const response = await app.inject({ method: "GET", url: "/health" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: "ok" });

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("GET / renders the home page as HTML", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  const response = await app.inject({ method: "GET", url: "/" });

  assert.equal(response.statusCode, 200);
  assert.match(response.headers["content-type"] as string, /text\/html/);
  assert.match(response.body, /Hello, HSA Tracker/);
  assert.match(response.body, /<a href="\/" class="tab tab-active">Dashboard<\/a>/);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

for (const [url, heading] of [["/reimbursements", "Reimbursements"]] as const) {
  test(`GET ${url} renders the ${heading} placeholder with its tab active`, async () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
    const app = buildApp(dataDir, { logger: false });

    const response = await app.inject({ method: "GET", url });

    assert.equal(response.statusCode, 200);
    assert.match(response.body, new RegExp(`<h1>${heading}</h1>`));
    assert.match(
      response.body,
      new RegExp(`<a href="${url}" class="tab tab-active">${heading}</a>`),
    );

    await app.close();
    rmSync(dataDir, { recursive: true, force: true });
  });
}

test("GET /manage lists patients, and POST creates/deletes them", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  const empty = await app.inject({ method: "GET", url: "/manage" });
  assert.match(empty.body, /No patients yet\./);

  const create = await app.inject({
    method: "POST",
    url: "/manage/patients",
    payload: { name: "Kavi" },
  });
  assert.equal(create.statusCode, 302);
  assert.equal(create.headers.location, "/manage");

  const afterCreate = await app.inject({ method: "GET", url: "/manage" });
  assert.match(afterCreate.body, /<span class="manage-row-name">Kavi<\/span>/);

  const idMatch = afterCreate.body.match(/\/manage\/patients\/(\d+)\/delete/);
  assert.ok(idMatch, "expected a patient id in the rendered form action");
  const id = idMatch[1];

  await app.inject({
    method: "POST",
    url: `/manage/patients/${id}/delete`,
  });
  const afterDelete = await app.inject({ method: "GET", url: "/manage" });
  assert.match(afterDelete.body, /No patients yet\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("POST /manage/patients with a duplicate name redirects with an error, and GET /manage shows it", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  await app.inject({
    method: "POST",
    url: "/manage/patients",
    payload: { name: "Kavi" },
  });

  const duplicate = await app.inject({
    method: "POST",
    url: "/manage/patients",
    payload: { name: "Kavi" },
  });
  assert.equal(duplicate.statusCode, 302);
  assert.equal(duplicate.headers.location, "/manage?error=duplicate-patient-name");

  const withError = await app.inject({
    method: "GET",
    url: "/manage?error=duplicate-patient-name",
  });
  assert.match(withError.body, /A patient with that name already exists\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("GET /manage lists providers, and POST creates/deletes them", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  const empty = await app.inject({ method: "GET", url: "/manage" });
  assert.match(empty.body, /No providers yet\./);

  const create = await app.inject({
    method: "POST",
    url: "/manage/providers",
    payload: { name: "CVS Pharmacy", category: "pharmacy" },
  });
  assert.equal(create.statusCode, 302);
  assert.equal(create.headers.location, "/manage");

  const afterCreate = await app.inject({ method: "GET", url: "/manage" });
  assert.match(
    afterCreate.body,
    /<span class="manage-row-name">CVS Pharmacy<\/span>/,
  );
  assert.match(afterCreate.body, /<span class="badge">Pharmacy<\/span>/);

  const idMatch = afterCreate.body.match(/\/manage\/providers\/(\d+)\/delete/);
  assert.ok(idMatch, "expected a provider id in the rendered form action");
  const id = idMatch[1];

  await app.inject({
    method: "POST",
    url: `/manage/providers/${id}/delete`,
  });
  const afterDelete = await app.inject({ method: "GET", url: "/manage" });
  assert.match(afterDelete.body, /No providers yet\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("POST /manage/providers with a blank name redirects with an error, and GET /manage shows it", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  const blank = await app.inject({
    method: "POST",
    url: "/manage/providers",
    payload: { name: "  ", category: "medical" },
  });
  assert.equal(blank.statusCode, 302);
  assert.equal(blank.headers.location, "/manage?error=blank-provider-name");

  const withError = await app.inject({
    method: "GET",
    url: "/manage?error=blank-provider-name",
  });
  assert.match(withError.body, /Provider name can't be blank\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("POST /manage/providers with a duplicate name redirects with an error, and GET /manage shows it", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  await app.inject({
    method: "POST",
    url: "/manage/providers",
    payload: { name: "CVS Pharmacy", category: "pharmacy" },
  });

  const duplicate = await app.inject({
    method: "POST",
    url: "/manage/providers",
    payload: { name: "CVS Pharmacy", category: "pharmacy" },
  });
  assert.equal(duplicate.statusCode, 302);
  assert.equal(
    duplicate.headers.location,
    "/manage?error=duplicate-provider-name",
  );

  const withError = await app.inject({
    method: "GET",
    url: "/manage?error=duplicate-provider-name",
  });
  assert.match(withError.body, /A provider with that name already exists\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("GET /manage lists accounts, and POST creates/deletes them", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  const empty = await app.inject({ method: "GET", url: "/manage" });
  assert.match(empty.body, /No accounts yet\./);

  const create = await app.inject({
    method: "POST",
    url: "/manage/accounts",
    payload: { name: "Fidelity HSA", type: "hsa" },
  });
  assert.equal(create.statusCode, 302);
  assert.equal(create.headers.location, "/manage");

  const afterCreate = await app.inject({ method: "GET", url: "/manage" });
  assert.match(
    afterCreate.body,
    /<span class="manage-row-name">Fidelity HSA<\/span>/,
  );
  assert.match(afterCreate.body, /<span class="badge badge-accent">HSA<\/span>/);

  const idMatch = afterCreate.body.match(/\/manage\/accounts\/(\d+)\/delete/);
  assert.ok(idMatch, "expected an account id in the rendered form action");
  const id = idMatch[1];

  await app.inject({
    method: "POST",
    url: `/manage/accounts/${id}/delete`,
  });
  const afterDelete = await app.inject({ method: "GET", url: "/manage" });
  assert.match(afterDelete.body, /No accounts yet\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("account badges are accented for tax-advantaged types, plain for personal", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  await app.inject({
    method: "POST",
    url: "/manage/accounts",
    payload: { name: "Fidelity HSA", type: "hsa" },
  });
  await app.inject({
    method: "POST",
    url: "/manage/accounts",
    payload: { name: "Chase Sapphire", type: "personal" },
  });

  const response = await app.inject({ method: "GET", url: "/manage" });
  assert.match(response.body, /<span class="badge badge-accent">HSA<\/span>/);
  assert.match(response.body, /<span class="badge">Personal<\/span>/);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("POST /manage/accounts with a duplicate name redirects with an error, and GET /manage shows it", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  await app.inject({
    method: "POST",
    url: "/manage/accounts",
    payload: { name: "Fidelity HSA", type: "hsa" },
  });

  const duplicate = await app.inject({
    method: "POST",
    url: "/manage/accounts",
    payload: { name: "Fidelity HSA", type: "hsa" },
  });
  assert.equal(duplicate.statusCode, 302);
  assert.equal(duplicate.headers.location, "/manage?error=duplicate-account-name");

  const withError = await app.inject({
    method: "GET",
    url: "/manage?error=duplicate-account-name",
  });
  assert.match(withError.body, /An account with that name already exists\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

async function seedPatientAndProvider(app: FastifyInstance) {
  await app.inject({
    method: "POST",
    url: "/manage/patients",
    payload: { name: "Kavi" },
  });
  await app.inject({
    method: "POST",
    url: "/manage/providers",
    payload: { name: "Dr. Sam Okafor", category: "medical" },
  });
  const manage = await app.inject({ method: "GET", url: "/manage" });
  const patientId = manage.body.match(/\/manage\/patients\/(\d+)\/delete/)![1];
  const providerId = manage.body.match(/\/manage\/providers\/(\d+)\/delete/)![1];
  return { patientId, providerId };
}

test("GET /visits shows a message when no patients/providers exist yet", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });

  const response = await app.inject({ method: "GET", url: "/visits" });
  assert.match(response.body, /No visits yet\./);
  assert.match(response.body, /Add a patient and provider first, in Manage\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("GET /visits lists visits, and POST creates/updates/deletes them", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { patientId, providerId } = await seedPatientAndProvider(app);

  const create = await app.inject({
    method: "POST",
    url: "/visits",
    payload: { date: "2026-06-01", patientId, providerId },
  });
  assert.equal(create.statusCode, 302);
  assert.equal(create.headers.location, "/visits");

  const afterCreate = await app.inject({ method: "GET", url: "/visits" });
  assert.match(afterCreate.body, /Jun 1, 2026/);
  assert.match(afterCreate.body, /Kavi/);
  assert.match(afterCreate.body, /Dr\. Sam Okafor/);

  const idMatch = afterCreate.body.match(/\/visits\?edit=(\d+)/);
  assert.ok(idMatch, "expected a visit id in the rendered edit link");
  const id = idMatch[1];

  const editPage = await app.inject({ method: "GET", url: `/visits?edit=${id}` });
  assert.match(editPage.body, /<h2>Dr\. Sam Okafor<\/h2>/);
  assert.match(editPage.body, /<span class="ptsub">Kavi · Jun 1, 2026<\/span>/);
  assert.match(editPage.body, /value="2026-06-01"/);

  const update = await app.inject({
    method: "POST",
    url: `/visits/${id}/update`,
    payload: { date: "2026-06-15", patientId, providerId },
  });
  assert.equal(update.statusCode, 302);
  assert.equal(update.headers.location, "/visits");

  const afterUpdate = await app.inject({ method: "GET", url: "/visits" });
  assert.match(afterUpdate.body, /Jun 15, 2026/);
  assert.doesNotMatch(afterUpdate.body, /Jun 1, 2026/);

  await app.inject({ method: "POST", url: `/visits/${id}/delete` });
  const afterDelete = await app.inject({ method: "GET", url: "/visits" });
  assert.match(afterDelete.body, /No visits yet\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("POST /visits with a blank date redirects with an error, and GET /visits shows it", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { patientId, providerId } = await seedPatientAndProvider(app);

  const blank = await app.inject({
    method: "POST",
    url: "/visits",
    payload: { date: "  ", patientId, providerId },
  });
  assert.equal(blank.statusCode, 302);
  assert.equal(blank.headers.location, "/visits?error=blank-date");

  const withError = await app.inject({
    method: "GET",
    url: "/visits?error=blank-date",
  });
  assert.match(withError.body, /Visit date can't be blank\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("Visit cards only show a notes line once a visit has notes", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { patientId, providerId } = await seedPatientAndProvider(app);

  await app.inject({
    method: "POST",
    url: "/visits",
    payload: { date: "2026-06-01", patientId, providerId },
  });

  const withoutNotes = await app.inject({ method: "GET", url: "/visits" });
  assert.doesNotMatch(withoutNotes.body, /class="visit-notes"/);
  assert.match(withoutNotes.body, /No payment recorded for this visit yet/);
  assert.match(withoutNotes.body, /No reimbursement recorded for this visit yet/);

  await app.inject({
    method: "POST",
    url: "/visits",
    payload: {
      date: "2026-06-10",
      patientId,
      providerId,
      notes: "Discussed follow-up",
    },
  });

  const withNotes = await app.inject({ method: "GET", url: "/visits" });
  assert.match(withNotes.body, /class="visit-notes">Discussed follow-up</);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

async function seedVisit(app: FastifyInstance, dataDir: string) {
  const { patientId, providerId } = await seedPatientAndProvider(app);
  await app.inject({
    method: "POST",
    url: "/visits",
    payload: { date: "2026-06-01", patientId, providerId },
  });
  const visits = await app.inject({ method: "GET", url: "/visits" });
  const visitId = visits.body.match(/\/visits\?edit=(\d+)/)![1]!;

  const editPage = await app.inject({
    method: "GET",
    url: `/visits?edit=${visitId}`,
  });
  const filesKey = editPage.body.match(/visit-files\/([a-z0-9-]+)/)![1]!;

  return {
    visitId,
    filesKey,
    filesDir: path.join(dataDir, "visit-files", filesKey),
  };
}

function extractPanel(body: string): string {
  return body.match(/<aside class="panel">[\s\S]*?<\/aside>/)![0];
}

test("an unlocked visit shows the suggested folder key and editable fields", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { visitId, filesKey } = await seedVisit(app, dataDir);

  assert.equal(filesKey, `kavi-20260601-visit${visitId}-dr-sam-okafor`);

  const editPage = await app.inject({
    method: "GET",
    url: `/visits?edit=${visitId}`,
  });
  const panel = extractPanel(editPage.body);
  assert.match(panel, new RegExp(`visit-files/${filesKey}`));
  assert.match(panel, /<input type="date" name="date"/);
  assert.match(panel, /<select name="patientId">/);
  assert.doesNotMatch(panel, /class="lock-note"/);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("creating the convention folder locks date/patient/provider editing, even empty", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { visitId, filesDir } = await seedVisit(app, dataDir);

  mkdirSync(filesDir, { recursive: true });

  const editPage = await app.inject({
    method: "GET",
    url: `/visits?edit=${visitId}`,
  });
  const panel = extractPanel(editPage.body);
  assert.match(panel, /class="lock-note"/);
  assert.doesNotMatch(panel, /<input type="date" name="date"/);
  assert.doesNotMatch(panel, /<select name="patientId">/);
  assert.match(panel, /No files in this visit's folder yet\./);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("files dropped in the convention folder are listed and can be opened", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { visitId, filesDir } = await seedVisit(app, dataDir);

  mkdirSync(filesDir, { recursive: true });
  writeFileSync(path.join(filesDir, "receipt.pdf"), "stub-pdf-content");

  const editPage = await app.inject({
    method: "GET",
    url: `/visits?edit=${visitId}`,
  });
  assert.match(editPage.body, /<h3>Documents \(1\)<\/h3>/);
  assert.match(editPage.body, /class="lr-main">receipt\.pdf</);

  const open = await app.inject({
    method: "GET",
    url: `/visits/${visitId}/files/receipt.pdf/open`,
  });
  assert.equal(open.statusCode, 200);
  assert.equal(open.headers["content-type"], "application/pdf");
  assert.equal(open.body, "stub-pdf-content");

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("the server rejects changes to date/patient/provider while locked, but still saves notes", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { visitId, filesDir } = await seedVisit(app, dataDir);
  mkdirSync(filesDir, { recursive: true });

  await app.inject({
    method: "POST",
    url: "/manage/patients",
    payload: { name: "Priya" },
  });
  const manage = await app.inject({ method: "GET", url: "/manage" });
  const otherPatientId = manage.body.match(
    /Priya<\/span>\s*<form method="post" action="\/manage\/patients\/(\d+)\/delete"/,
  )?.[1];
  assert.ok(otherPatientId, "expected to find Priya's patient id");

  const update = await app.inject({
    method: "POST",
    url: `/visits/${visitId}/update`,
    payload: {
      date: "2026-12-25",
      patientId: otherPatientId!,
      providerId: "999",
      notes: "Locked but notes still saved",
    },
  });
  assert.equal(update.statusCode, 302);
  assert.equal(update.headers.location, "/visits");

  const editPage = await app.inject({
    method: "GET",
    url: `/visits?edit=${visitId}`,
  });
  const panel = extractPanel(editPage.body);
  assert.match(panel, /field-value-static">Jun 1, 2026</);
  assert.doesNotMatch(panel, /Dec 25, 2026/);
  assert.match(panel, /field-value-static">Kavi</);
  assert.match(panel, /Locked but notes still saved/);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("GET /visits/:id/files/:filename/open rejects filenames containing a slash", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  const app = buildApp(dataDir, { logger: false });
  const { visitId, filesDir } = await seedVisit(app, dataDir);
  mkdirSync(filesDir, { recursive: true });

  const open = await app.inject({
    method: "GET",
    url: `/visits/${visitId}/files/${encodeURIComponent("../secret.txt")}/open`,
  });
  assert.equal(open.statusCode, 400);

  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

async function seedPatientProviderAccount(app: FastifyInstance) {
  const { patientId, providerId } = await seedPatientAndProvider(app);
  await app.inject({
    method: "POST",
    url: "/manage/accounts",
    payload: { name: "Chase Sapphire", type: "personal" },
  });
  const manage = await app.inject({ method: "GET", url: "/manage" });
  const accountId = manage.body.match(/\/manage\/accounts\/(\d+)\/delete/)![1];
  return { patientId, providerId, accountId };
}

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

async function seedPayment(app: FastifyInstance) {
  const { patientId, providerId, accountId } = await seedPatientProviderAccount(app);
  await app.inject({
    method: "POST",
    url: "/payments",
    payload: { date: "2026-06-01", amount: "42.30", patientId, providerId, accountId },
  });
  const payments = await app.inject({ method: "GET", url: "/payments" });
  const paymentId = payments.body.match(/\/payments\?edit=(\d+)/)![1];
  return { patientId, providerId, accountId, paymentId };
}

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
