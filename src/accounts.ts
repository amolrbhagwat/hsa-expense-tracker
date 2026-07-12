import type Database from "better-sqlite3";

export type AccountType = "hsa" | "fsa" | "lpfsa" | "personal";

export interface Account {
  id: number;
  name: string;
  type: AccountType;
}

export type CreateAccountResult = "created" | "blank" | "duplicate";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "SQLITE_CONSTRAINT_UNIQUE"
  );
}

export function listAccounts(db: Database.Database): Account[] {
  return db
    .prepare("SELECT id, name, type FROM accounts ORDER BY name")
    .all() as Account[];
}

export function createAccount(
  db: Database.Database,
  name: string,
  type: AccountType,
): CreateAccountResult {
  const trimmed = name.trim();
  if (trimmed === "") return "blank";
  try {
    db.prepare("INSERT INTO accounts (name, type) VALUES (?, ?)").run(
      trimmed,
      type,
    );
    return "created";
  } catch (error) {
    if (isUniqueConstraintError(error)) return "duplicate";
    throw error;
  }
}

export function deleteAccount(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
}
