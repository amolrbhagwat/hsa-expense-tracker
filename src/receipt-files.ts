import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".txt": "text/plain",
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function receiptFilesKey(
  receipt: { date: string; disambiguator: string },
  providerName: string,
): string {
  const dateNoHyphens = receipt.date.replace(/-/g, "");
  return `${dateNoHyphens}-${slugify(providerName)}-${slugify(receipt.disambiguator)}`;
}

export function receiptFilesDir(dataDir: string, key: string): string {
  return path.join(dataDir, "receipt-files", key);
}

// undefined means the folder doesn't exist; an array (possibly empty, or
// more than one file depicting the same document) means it does. See ADR
// 0007 — no locking needed since date/provider/disambiguator are immutable.
export function listReceiptFiles(
  dataDir: string,
  key: string,
): string[] | undefined {
  const dir = receiptFilesDir(dataDir, key);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return undefined;
  return readdirSync(dir)
    .filter((name) => statSync(path.join(dir, name)).isFile())
    .sort();
}

export function guessMimeType(filePath: string): string {
  return (
    MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream"
  );
}
