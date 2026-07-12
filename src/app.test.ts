import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
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
  ["/visits", "Visits"],
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
  assert.match(afterCreate.body, /<span>Kavi<\/span>/);

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

test("GET /manage lists providers, and POST creates/updates/deletes them", async () => {
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
  assert.match(afterCreate.body, /value="CVS Pharmacy"/);
  assert.match(afterCreate.body, /<option value="pharmacy" selected>/);

  const idMatch = afterCreate.body.match(/\/manage\/providers\/(\d+)\/update/);
  assert.ok(idMatch, "expected a provider id in the rendered form action");
  const id = idMatch[1];

  await app.inject({
    method: "POST",
    url: `/manage/providers/${id}/update`,
    payload: { name: "CVS", category: "other" },
  });
  const afterUpdate = await app.inject({ method: "GET", url: "/manage" });
  assert.match(afterUpdate.body, /value="CVS"/);
  assert.match(afterUpdate.body, /<option value="other" selected>/);

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
  assert.match(afterCreate.body, /Fidelity HSA <span class="badge">HSA<\/span>/);

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
