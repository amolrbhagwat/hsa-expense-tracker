import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  guessMimeType,
  listVisitFiles,
  slugify,
  visitFilesDir,
  visitFilesKey,
} from "./visit-files.js";

test("slugify lowercases and collapses non-alphanumeric runs into single hyphens", () => {
  assert.equal(slugify("Dr. Sam Okafor"), "dr-sam-okafor");
  assert.equal(
    slugify("PCMG: Ali Alamar - Mandeep Kaur"),
    "pcmg-ali-alamar-mandeep-kaur",
  );
  assert.equal(slugify("  Kavi  "), "kavi");
});

test("visitFilesKey puts patient first, then the date with no hyphens, then visit<id>, then provider", () => {
  const key = visitFilesKey(
    { id: 4, date: "2026-07-12" },
    "Amol",
    "Labcorp",
  );
  assert.equal(key, "amol-20260712-visit4-labcorp");
});

test("visitFilesKey disambiguates visits that share a date/patient/provider via the id", () => {
  const visit = { date: "2026-07-12" };
  const keyA = visitFilesKey({ ...visit, id: 1 }, "Amol", "Labcorp");
  const keyB = visitFilesKey({ ...visit, id: 2 }, "Amol", "Labcorp");
  assert.notEqual(keyA, keyB);
});

test("visitFilesDir joins the data dir under a visit-files/ subfolder", () => {
  assert.equal(
    visitFilesDir("/data", "amol-20260712-visit4-labcorp"),
    path.join("/data", "visit-files", "amol-20260712-visit4-labcorp"),
  );
});

test("listVisitFiles returns undefined when the folder doesn't exist", () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "hsa-test-"));
  assert.equal(listVisitFiles(dataDir, "no-such-key"), undefined);
  rmSync(dataDir, { recursive: true, force: true });
});

test("listVisitFiles returns an empty array for a folder with no files", () => {
  const dataDir = mktemp();
  mkdirSync(visitFilesDir(dataDir, "amol-20260712-visit4-labcorp"), {
    recursive: true,
  });
  assert.deepEqual(
    listVisitFiles(dataDir, "amol-20260712-visit4-labcorp"),
    [],
  );
  rmSync(dataDir, { recursive: true, force: true });
});

test("listVisitFiles lists files sorted, ignoring subdirectories", () => {
  const dataDir = mktemp();
  const dir = visitFilesDir(dataDir, "amol-20260712-visit4-labcorp");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "receipt.pdf"), "stub");
  writeFileSync(path.join(dir, "eob.pdf"), "stub");
  mkdirSync(path.join(dir, "subfolder"));

  assert.deepEqual(listVisitFiles(dataDir, "amol-20260712-visit4-labcorp"), [
    "eob.pdf",
    "receipt.pdf",
  ]);
  rmSync(dataDir, { recursive: true, force: true });
});

test("guessMimeType maps common extensions, and falls back for unknown ones", () => {
  assert.equal(guessMimeType("receipt.pdf"), "application/pdf");
  assert.equal(guessMimeType("photo.JPG"), "image/jpeg");
  assert.equal(guessMimeType("notes.xyz"), "application/octet-stream");
});

function mktemp(): string {
  return mkdtempSync(path.join(tmpdir(), "hsa-test-"));
}
