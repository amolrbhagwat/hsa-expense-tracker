import type Database from "better-sqlite3";

export type ProviderCategory =
  | "medical"
  | "dental"
  | "vision"
  | "pharmacy"
  | "other";

export interface Provider {
  id: number;
  name: string;
  category: ProviderCategory;
}

export type CreateProviderResult = "created" | "blank" | "duplicate";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "SQLITE_CONSTRAINT_UNIQUE"
  );
}

export function listProviders(db: Database.Database): Provider[] {
  return db
    .prepare("SELECT id, name, category FROM providers ORDER BY name")
    .all() as Provider[];
}

export function createProvider(
  db: Database.Database,
  name: string,
  category: ProviderCategory,
): CreateProviderResult {
  const trimmed = name.trim();
  if (trimmed === "") return "blank";
  try {
    db.prepare("INSERT INTO providers (name, category) VALUES (?, ?)").run(
      trimmed,
      category,
    );
    return "created";
  } catch (error) {
    if (isUniqueConstraintError(error)) return "duplicate";
    throw error;
  }
}

export function deleteProvider(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM providers WHERE id = ?").run(id);
}
