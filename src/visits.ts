import type Database from "better-sqlite3";
import type { ProviderCategory } from "./providers.js";

export interface Visit {
  id: number;
  date: string;
  patientId: number;
  providerId: number;
  notes: string | null;
}

export interface VisitListItem extends Visit {
  patientName: string;
  providerName: string;
  providerCategory: ProviderCategory;
}

export type SaveVisitResult = "saved" | "blank-date";

interface VisitRow {
  id: number;
  date: string;
  patient_id: number;
  provider_id: number;
  notes: string | null;
}

interface VisitListRow extends VisitRow {
  patient_name: string;
  provider_name: string;
  provider_category: ProviderCategory;
}

export function listVisits(db: Database.Database): VisitListItem[] {
  return (
    db
      .prepare(
        `SELECT v.id, v.date, v.patient_id, v.provider_id, v.notes,
                p.name AS patient_name, pr.name AS provider_name, pr.category AS provider_category
         FROM visits v
         JOIN patients p ON p.id = v.patient_id
         JOIN providers pr ON pr.id = v.provider_id
         ORDER BY v.date DESC, v.id DESC`,
      )
      .all() as VisitListRow[]
  ).map((row) => ({
    id: row.id,
    date: row.date,
    patientId: row.patient_id,
    providerId: row.provider_id,
    notes: row.notes,
    patientName: row.patient_name,
    providerName: row.provider_name,
    providerCategory: row.provider_category,
  }));
}

export function getVisit(db: Database.Database, id: number): Visit | undefined {
  const row = db
    .prepare(
      "SELECT id, date, patient_id, provider_id, notes FROM visits WHERE id = ?",
    )
    .get(id) as VisitRow | undefined;
  if (!row) return undefined;
  return {
    id: row.id,
    date: row.date,
    patientId: row.patient_id,
    providerId: row.provider_id,
    notes: row.notes,
  };
}

function normalizeNotes(notes: string | undefined): string | null {
  if (!notes) return null;
  const trimmed = notes.trim();
  return trimmed === "" ? null : trimmed;
}

export function createVisit(
  db: Database.Database,
  date: string,
  patientId: number,
  providerId: number,
  notes?: string,
): SaveVisitResult {
  const trimmed = date.trim();
  if (trimmed === "") return "blank-date";
  db.prepare(
    "INSERT INTO visits (date, patient_id, provider_id, notes) VALUES (?, ?, ?, ?)",
  ).run(trimmed, patientId, providerId, normalizeNotes(notes));
  return "saved";
}

export function updateVisit(
  db: Database.Database,
  id: number,
  date: string,
  patientId: number,
  providerId: number,
  notes?: string,
): SaveVisitResult {
  const trimmed = date.trim();
  if (trimmed === "") return "blank-date";
  db.prepare(
    "UPDATE visits SET date = ?, patient_id = ?, provider_id = ?, notes = ? WHERE id = ?",
  ).run(trimmed, patientId, providerId, normalizeNotes(notes), id);
  return "saved";
}

export function updateVisitNotes(
  db: Database.Database,
  id: number,
  notes?: string,
): void {
  db.prepare("UPDATE visits SET notes = ? WHERE id = ?").run(
    normalizeNotes(notes),
    id,
  );
}

export function deleteVisit(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM visits WHERE id = ?").run(id);
}
