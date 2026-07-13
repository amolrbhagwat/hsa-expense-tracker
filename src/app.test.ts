import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
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

for (const [url, heading] of [
  ["/payments", "Payments"],
  ["/reimbursements", "Reimbursements"],
] as const) {
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
