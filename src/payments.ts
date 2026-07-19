import type Database from "better-sqlite3";
import type { AccountType } from "./accounts.js";
import type { ProviderCategory } from "./providers.js";

export interface Payment {
  id: number;
  date: string;
  amountCents: number;
  patientId: number;
  providerId: number;
  accountId: number;
  notes: string | null;
}

export interface PaymentListItem extends Payment {
  patientName: string;
  providerName: string;
  providerCategory: ProviderCategory;
  accountName: string;
  accountType: AccountType;
  receiptCount: number;
}

export type SavePaymentResult = "saved" | "blank-date" | "invalid-amount";

interface PaymentRow {
  id: number;
  date: string;
  amount_cents: number;
  patient_id: number;
  provider_id: number;
  account_id: number;
  notes: string | null;
}

interface PaymentListRow extends PaymentRow {
  patient_name: string;
  provider_name: string;
  provider_category: ProviderCategory;
  account_name: string;
  account_type: AccountType;
  receipt_count: number;
}

function fromRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    date: row.date,
    amountCents: row.amount_cents,
    patientId: row.patient_id,
    providerId: row.provider_id,
    accountId: row.account_id,
    notes: row.notes,
  };
}

export function listPayments(db: Database.Database): PaymentListItem[] {
  return (
    db
      .prepare(
        `SELECT pay.id, pay.date, pay.amount_cents, pay.patient_id, pay.provider_id, pay.account_id, pay.notes,
                pt.name AS patient_name, pr.name AS provider_name, pr.category AS provider_category,
                a.name AS account_name, a.type AS account_type,
                (SELECT COUNT(*) FROM receipt_payments rp WHERE rp.payment_id = pay.id) AS receipt_count
         FROM payments pay
         JOIN patients pt ON pt.id = pay.patient_id
         JOIN providers pr ON pr.id = pay.provider_id
         JOIN accounts a ON a.id = pay.account_id
         ORDER BY pay.date DESC, pay.id DESC`,
      )
      .all() as PaymentListRow[]
  ).map((row) => ({
    ...fromRow(row),
    patientName: row.patient_name,
    providerName: row.provider_name,
    providerCategory: row.provider_category,
    accountName: row.account_name,
    accountType: row.account_type,
    receiptCount: row.receipt_count,
  }));
}

export function getPayment(
  db: Database.Database,
  id: number,
): Payment | undefined {
  const row = db
    .prepare(
      "SELECT id, date, amount_cents, patient_id, provider_id, account_id, notes FROM payments WHERE id = ?",
    )
    .get(id) as PaymentRow | undefined;
  return row ? fromRow(row) : undefined;
}

// A locked Payment has all fields but notes frozen, because a Receipt's
// proof or a Reimbursement's allocation was fixed against its details at
// linking time. Unlock by deleting the Receipt/Reimbursement that links it.
export function isPaymentLocked(db: Database.Database, id: number): boolean {
  const receiptLink = db
    .prepare("SELECT 1 FROM receipt_payments WHERE payment_id = ? LIMIT 1")
    .get(id);
  if (receiptLink) return true;
  const reimbursementLink = db
    .prepare(
      "SELECT 1 FROM reimbursement_payments WHERE payment_id = ? LIMIT 1",
    )
    .get(id);
  return reimbursementLink !== undefined;
}

function normalizeNotes(notes: string | undefined): string | null {
  if (!notes) return null;
  const trimmed = notes.trim();
  return trimmed === "" ? null : trimmed;
}

// Accepts "900", "900.5", or "900.50" (an optional leading "$" is ignored).
// Returns undefined for blank, non-numeric, zero, or negative input.
export function parseAmountCents(input: string): number | undefined {
  const trimmed = input.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return undefined;
  const [dollars, cents = ""] = trimmed.split(".");
  const centsPart = (cents + "00").slice(0, 2);
  const amountCents = Number(dollars) * 100 + Number(centsPart);
  return amountCents > 0 ? amountCents : undefined;
}

export function createPayment(
  db: Database.Database,
  date: string,
  amount: string,
  patientId: number,
  providerId: number,
  accountId: number,
  notes?: string,
): SavePaymentResult {
  const trimmedDate = date.trim();
  if (trimmedDate === "") return "blank-date";
  const amountCents = parseAmountCents(amount);
  if (amountCents === undefined) return "invalid-amount";
  db.prepare(
    `INSERT INTO payments (date, amount_cents, patient_id, provider_id, account_id, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    trimmedDate,
    amountCents,
    patientId,
    providerId,
    accountId,
    normalizeNotes(notes),
  );
  return "saved";
}

export function updatePayment(
  db: Database.Database,
  id: number,
  date: string,
  amount: string,
  patientId: number,
  providerId: number,
  accountId: number,
  notes?: string,
): SavePaymentResult {
  const trimmedDate = date.trim();
  if (trimmedDate === "") return "blank-date";
  const amountCents = parseAmountCents(amount);
  if (amountCents === undefined) return "invalid-amount";
  db.prepare(
    `UPDATE payments
     SET date = ?, amount_cents = ?, patient_id = ?, provider_id = ?, account_id = ?, notes = ?
     WHERE id = ?`,
  ).run(
    trimmedDate,
    amountCents,
    patientId,
    providerId,
    accountId,
    normalizeNotes(notes),
    id,
  );
  return "saved";
}

export function updatePaymentNotes(
  db: Database.Database,
  id: number,
  notes?: string,
): void {
  db.prepare("UPDATE payments SET notes = ? WHERE id = ?").run(
    normalizeNotes(notes),
    id,
  );
}

export function deletePayment(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM payments WHERE id = ?").run(id);
}
