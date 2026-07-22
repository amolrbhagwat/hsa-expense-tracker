import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildApp } from "../app.js";

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
