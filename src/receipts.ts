import type Database from "better-sqlite3";
import type { ProviderCategory } from "./providers.js";

export interface Receipt {
  id: number;
  date: string;
  providerId: number;
  disambiguator: string;
  notes: string | null;
}

export interface ReceiptListItem extends Receipt {
  providerName: string;
  providerCategory: ProviderCategory;
  paymentCount: number;
}

export interface LinkedPayment {
  id: number;
  date: string;
  amountCents: number;
  providerName: string;
  patientName: string;
}

export type CreateReceiptResult =
  | "saved"
  | "blank-date"
  | "no-payments"
  | "duplicate";

interface ReceiptRow {
  id: number;
  date: string;
  provider_id: number;
  disambiguator: string;
  notes: string | null;
}

interface ReceiptListRow extends ReceiptRow {
  provider_name: string;
  provider_category: ProviderCategory;
  payment_count: number;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "SQLITE_CONSTRAINT_UNIQUE"
  );
}

function fromRow(row: ReceiptRow): Receipt {
  return {
    id: row.id,
    date: row.date,
    providerId: row.provider_id,
    disambiguator: row.disambiguator,
    notes: row.notes,
  };
}

export function listReceipts(db: Database.Database): ReceiptListItem[] {
  return (
    db
      .prepare(
        `SELECT r.id, r.date, r.provider_id, r.disambiguator, r.notes,
                pr.name AS provider_name, pr.category AS provider_category,
                (SELECT COUNT(*) FROM receipt_payments rp WHERE rp.receipt_id = r.id) AS payment_count
         FROM receipts r
         JOIN providers pr ON pr.id = r.provider_id
         ORDER BY r.date DESC, r.id DESC`,
      )
      .all() as ReceiptListRow[]
  ).map((row) => ({
    ...fromRow(row),
    providerName: row.provider_name,
    providerCategory: row.provider_category,
    paymentCount: row.payment_count,
  }));
}

export function getReceipt(
  db: Database.Database,
  id: number,
): Receipt | undefined {
  const row = db
    .prepare(
      "SELECT id, date, provider_id, disambiguator, notes FROM receipts WHERE id = ?",
    )
    .get(id) as ReceiptRow | undefined;
  return row ? fromRow(row) : undefined;
}

export function getLinkedPayments(
  db: Database.Database,
  receiptId: number,
): LinkedPayment[] {
  return db
    .prepare(
      `SELECT p.id, p.date, p.amount_cents AS amountCents,
              pr.name AS providerName, pt.name AS patientName
       FROM receipt_payments rp
       JOIN payments p ON p.id = rp.payment_id
       JOIN providers pr ON pr.id = p.provider_id
       JOIN patients pt ON pt.id = p.patient_id
       WHERE rp.receipt_id = ?
       ORDER BY p.date DESC, p.id DESC`,
    )
    .all(receiptId) as LinkedPayment[];
}

function normalizeNotes(notes: string | undefined): string | null {
  if (!notes) return null;
  const trimmed = notes.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeDisambiguator(disambiguator: string | undefined): string {
  const trimmed = disambiguator?.trim() ?? "";
  return trimmed === "" ? "receipt" : trimmed;
}

// paymentIds are not required to share the receipt's providerId — one receipt (e.g. a card
// statement) can cover payments made to several different providers.
export function createReceipt(
  db: Database.Database,
  date: string,
  providerId: number,
  disambiguator: string | undefined,
  paymentIds: number[],
  notes?: string,
): CreateReceiptResult {
  const trimmedDate = date.trim();
  if (trimmedDate === "") return "blank-date";
  if (paymentIds.length === 0) return "no-payments";

  try {
    db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare(
          "INSERT INTO receipts (date, provider_id, disambiguator, notes) VALUES (?, ?, ?, ?)",
        )
        .run(
          trimmedDate,
          providerId,
          normalizeDisambiguator(disambiguator),
          normalizeNotes(notes),
        );
      const linkPayment = db.prepare(
        "INSERT INTO receipt_payments (receipt_id, payment_id) VALUES (?, ?)",
      );
      for (const paymentId of paymentIds) {
        linkPayment.run(lastInsertRowid, paymentId);
      }
    })();
    return "saved";
  } catch (error) {
    if (isUniqueConstraintError(error)) return "duplicate";
    throw error;
  }
}

export function updateReceiptNotes(
  db: Database.Database,
  id: number,
  notes?: string,
): void {
  db.prepare("UPDATE receipts SET notes = ? WHERE id = ?").run(
    normalizeNotes(notes),
    id,
  );
}

export function deleteReceipt(db: Database.Database, id: number): void {
  db.transaction(() => {
    db.prepare("DELETE FROM receipt_payments WHERE receipt_id = ?").run(id);
    db.prepare("DELETE FROM receipts WHERE id = ?").run(id);
  })();
}
