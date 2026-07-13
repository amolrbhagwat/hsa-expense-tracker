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

export function visitFilesKey(
  visit: { id: number; date: string },
  patientName: string,
  providerName: string,
): string {
  const dateNoHyphens = visit.date.replace(/-/g, "");
  return `${slugify(patientName)}-${dateNoHyphens}-visit${visit.id}-${slugify(providerName)}`;
}

export function visitFilesDir(dataDir: string, key: string): string {
  return path.join(dataDir, "visit-files", key);
}

// undefined means the folder doesn't exist (visit stays editable); an array
// (possibly empty) means it does exist (visit locks).
export function listVisitFiles(
  dataDir: string,
  key: string,
): string[] | undefined {
  const dir = visitFilesDir(dataDir, key);
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
