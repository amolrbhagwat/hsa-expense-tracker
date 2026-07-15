import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  guessMimeType,
  listReceiptFiles,
  receiptFilesDir,
  receiptFilesKey,
  slugify,
} from "./receipt-files.js";

test("slugify lowercases and collapses non-alphanumeric runs into single hyphens", () => {
  assert.equal(slugify("Dr. Sam Okafor"), "dr-sam-okafor");
  assert.equal(slugify("  Kavi  "), "kavi");
});

test("receiptFilesKey puts the date first (no hyphens), then provider, then disambiguator", () => {
  const key = receiptFilesKey(
    { date: "2026-07-12", disambiguator: "receipt" },
    "CVS Pharmacy",
  );
  assert.equal(key, "20260712-cvs-pharmacy-receipt");
});

test("receiptFilesKey does not embed the receipt id", () => {
  const key = receiptFilesKey(
    { date: "2026-07-12", disambiguator: "card-statement" },
    "CVS Pharmacy",
  );
  assert.equal(key, "20260712-cvs-pharmacy-card-statement");
});

test("receiptFilesDir joins the data dir under a receipt-files/ subfolder", () => {
  assert.equal(
    receiptFilesDir("/data", "20260712-cvs-pharmacy-receipt"),
    path.join("/data", "receipt-files", "20260712-cvs-pharmacy-receipt"),
  );
});

test("listReceiptFiles returns undefined when the folder doesn't exist", () => {
  const dataDir = mktemp();
  assert.equal(listReceiptFiles(dataDir, "no-such-key"), undefined);
  rmSync(dataDir, { recursive: true, force: true });
});

test("listReceiptFiles returns an empty array for a folder with no files", () => {
  const dataDir = mktemp();
  mkdirSync(receiptFilesDir(dataDir, "20260712-cvs-pharmacy-receipt"), {
    recursive: true,
  });
  assert.deepEqual(listReceiptFiles(dataDir, "20260712-cvs-pharmacy-receipt"), []);
  rmSync(dataDir, { recursive: true, force: true });
});

test("listReceiptFiles lists files sorted, ignoring subdirectories", () => {
  const dataDir = mktemp();
  const dir = receiptFilesDir(dataDir, "20260712-cvs-pharmacy-receipt");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "b.pdf"), "stub");
  writeFileSync(path.join(dir, "a.pdf"), "stub");
  mkdirSync(path.join(dir, "subfolder"));

  assert.deepEqual(listReceiptFiles(dataDir, "20260712-cvs-pharmacy-receipt"), [
    "a.pdf",
    "b.pdf",
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
