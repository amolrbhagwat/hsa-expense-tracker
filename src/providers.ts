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

export type SaveProviderResult = "saved" | "blank";

export function listProviders(db: Database.Database): Provider[] {
  return db
    .prepare("SELECT id, name, category FROM providers ORDER BY name")
    .all() as Provider[];
}

export function createProvider(
  db: Database.Database,
  name: string,
  category: ProviderCategory,
): SaveProviderResult {
  const trimmed = name.trim();
  if (trimmed === "") return "blank";
  db.prepare("INSERT INTO providers (name, category) VALUES (?, ?)").run(
    trimmed,
    category,
  );
  return "saved";
}

export function updateProvider(
  db: Database.Database,
  id: number,
  name: string,
  category: ProviderCategory,
): SaveProviderResult {
  const trimmed = name.trim();
  if (trimmed === "") return "blank";
  db.prepare("UPDATE providers SET name = ?, category = ? WHERE id = ?").run(
    trimmed,
    category,
    id,
  );
  return "saved";
}

export function deleteProvider(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM providers WHERE id = ?").run(id);
}
