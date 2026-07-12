import type Database from "better-sqlite3";

export interface Patient {
  id: number;
  name: string;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "SQLITE_CONSTRAINT_UNIQUE"
  );
}

export function listPatients(db: Database.Database): Patient[] {
  return db
    .prepare("SELECT id, name FROM patients ORDER BY name")
    .all() as Patient[];
}

export type CreatePatientResult = "created" | "blank" | "duplicate";

export function createPatient(
  db: Database.Database,
  name: string,
): CreatePatientResult {
  const trimmed = name.trim();
  if (trimmed === "") return "blank";
  try {
    db.prepare("INSERT INTO patients (name) VALUES (?)").run(trimmed);
    return "created";
  } catch (error) {
    if (isUniqueConstraintError(error)) return "duplicate";
    throw error;
  }
}

export function deletePatient(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM patients WHERE id = ?").run(id);
}
