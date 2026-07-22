import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildApp } from "../app.js";
import { extractPanel, seedPatientAndProvider, seedVisit } from "./test-helpers.js";

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
  assert.doesNotMatch(withoutNotes.body, /No reimbursement recorded/);

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
