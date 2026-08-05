import type Database from "better-sqlite3";
import type { AccountType } from "./accounts.js";
import { listPayments, type PaymentListItem } from "./payments.js";

export type ReimbursementStatus = "initiated" | "completed";

// The core row: date, which account the money came from, status
// (initiated/completed), notes.
export interface Reimbursement {
  id: number;
  date: string;
  accountId: number;
  status: ReimbursementStatus;
  notes: string | null;
}

// Adds display fields for the table: the account's name/type, and
// totalCents (how much this reimbursement actually covers so far).
export interface ReimbursementListItem extends Reimbursement {
  accountName: string;
  accountType: AccountType;
  totalCents: number;
}

// One payment this reimbursement covers, carrying that link's own amount —
// not the payment's full amount, since a payment can be split across
// multiple reimbursements.
export interface LinkedReimbursementPayment {
  id: number;
  date: string;
  providerName: string;
  patientName: string;
  amountCents: number;
}

// The input shape when saving: {paymentId, amountCents} pairs from the
// picker form.
export interface PaymentAllocation {
  paymentId: number;
  amountCents: number;
}

// A Payment plus how much of it is still uncovered, used to build the
// picker list.
export interface ReimbursablePayment extends PaymentListItem {
  reimbursableAmountCents: number;
}

export type SaveReimbursementResult =
  | "saved"
  | "blank-date"
  | "no-payments"
  | "invalid-amount";

interface ReimbursementRow {
  id: number;
  date: string;
  account_id: number;
  status: ReimbursementStatus;
  notes: string | null;
}

interface ReimbursementListRow extends ReimbursementRow {
  account_name: string;
  account_type: AccountType;
  total_cents: number;
}

function fromRow(row: ReimbursementRow): Reimbursement {
  return {
    id: row.id,
    date: row.date,
    accountId: row.account_id,
    status: row.status,
    notes: row.notes,
  };
}

export function listReimbursements(
  db: Database.Database,
): ReimbursementListItem[] {
  return (
    db
      .prepare(
        `SELECT re.id, re.date, re.account_id, re.status, re.notes,
                a.name AS account_name, a.type AS account_type,
                (SELECT COALESCE(SUM(amount_cents), 0) FROM reimbursement_payments rp
                 WHERE rp.reimbursement_id = re.id) AS total_cents
         FROM reimbursements re
         JOIN accounts a ON a.id = re.account_id
         ORDER BY re.date DESC, re.id DESC`,
      )
      .all() as ReimbursementListRow[]
  ).map((row) => ({
    ...fromRow(row),
    accountName: row.account_name,
    accountType: row.account_type,
    totalCents: row.total_cents,
  }));
}

export function getReimbursement(
  db: Database.Database,
  id: number,
): Reimbursement | undefined {
  const row = db
    .prepare(
      "SELECT id, date, account_id, status, notes FROM reimbursements WHERE id = ?",
    )
    .get(id) as ReimbursementRow | undefined;
  return row ? fromRow(row) : undefined;
}

// Freely editable while `initiated` (money hasn't moved yet). Once marked
// `completed`, all fields but notes freeze — including status itself, so
// there's no flipping back to `initiated`. Correction path: delete and
// recreate, same as everywhere else in this app.
export function isReimbursementLocked(reimbursement: Reimbursement): boolean {
  return reimbursement.status === "completed";
}

export function getLinkedPayments(
  db: Database.Database,
  reimbursementId: number,
): LinkedReimbursementPayment[] {
  return db
    .prepare(
      `SELECT p.id, p.date, pr.name AS providerName, pt.name AS patientName,
              rp.amount_cents AS amountCents
       FROM reimbursement_payments rp
       JOIN payments p ON p.id = rp.payment_id
       JOIN providers pr ON pr.id = p.provider_id
       JOIN patients pt ON pt.id = p.patient_id
       WHERE rp.reimbursement_id = ?
       ORDER BY p.date DESC, p.id DESC`,
    )
    .all(reimbursementId) as LinkedReimbursementPayment[];
}

// The remaining amount of a Payment still eligible for Reimbursement:
// payment amount minus the sum of amounts already claimed by *other*
// Reimbursement links. excludeReimbursementId lets an in-progress edit
// exclude its own current allocation, so re-saving the same amount doesn't
// falsely trip as over-allocated.
export function getReimbursableAmountCents(
  db: Database.Database,
  paymentId: number,
  excludeReimbursementId?: number,
): number {
  const payment = db
    .prepare("SELECT amount_cents FROM payments WHERE id = ?")
    .get(paymentId) as { amount_cents: number } | undefined;
  if (!payment) return 0;
  const claimed = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM reimbursement_payments
       WHERE payment_id = ? AND reimbursement_id != ?`,
    )
    .get(paymentId, excludeReimbursementId ?? -1) as { total: number };
  return payment.amount_cents - claimed.total;
}

// Payments eligible to appear in the "New reimbursement" / edit picker:
// paid from a personal account (i.e. actually reimbursable) with remaining
// reimbursable amount above zero.
export function listReimbursablePayments(
  db: Database.Database,
  excludeReimbursementId?: number,
): ReimbursablePayment[] {
  return listPayments(db)
    .filter((payment) => payment.accountType === "personal")
    .map((payment) => ({
      ...payment,
      reimbursableAmountCents: getReimbursableAmountCents(
        db,
        payment.id,
        excludeReimbursementId,
      ),
    }))
    .filter((payment) => payment.reimbursableAmountCents > 0);
}

function normalizeNotes(notes: string | undefined): string | null {
  if (!notes) return null;
  const trimmed = notes.trim();
  return trimmed === "" ? null : trimmed;
}

function allocationsValid(
  db: Database.Database,
  allocations: PaymentAllocation[],
  excludeReimbursementId?: number,
): boolean {
  return allocations.every((allocation) => {
    if (allocation.amountCents <= 0) return false;
    const reimbursable = getReimbursableAmountCents(
      db,
      allocation.paymentId,
      excludeReimbursementId,
    );
    return allocation.amountCents <= reimbursable;
  });
}

export function createReimbursement(
  db: Database.Database,
  date: string,
  accountId: number,
  status: ReimbursementStatus,
  allocations: PaymentAllocation[],
  notes?: string,
): SaveReimbursementResult {
  const trimmedDate = date.trim();
  if (trimmedDate === "") return "blank-date";
  if (allocations.length === 0) return "no-payments";
  if (!allocationsValid(db, allocations)) return "invalid-amount";

  db.transaction(() => {
    const { lastInsertRowid } = db
      .prepare(
        "INSERT INTO reimbursements (date, account_id, status, notes) VALUES (?, ?, ?, ?)",
      )
      .run(trimmedDate, accountId, status, normalizeNotes(notes));
    const linkPayment = db.prepare(
      "INSERT INTO reimbursement_payments (reimbursement_id, payment_id, amount_cents) VALUES (?, ?, ?)",
    );
    for (const allocation of allocations) {
      linkPayment.run(lastInsertRowid, allocation.paymentId, allocation.amountCents);
    }
  })();
  return "saved";
}

export function updateReimbursement(
  db: Database.Database,
  id: number,
  date: string,
  accountId: number,
  status: ReimbursementStatus,
  allocations: PaymentAllocation[],
  notes?: string,
): SaveReimbursementResult {
  const trimmedDate = date.trim();
  if (trimmedDate === "") return "blank-date";
  if (allocations.length === 0) return "no-payments";
  if (!allocationsValid(db, allocations, id)) return "invalid-amount";

  db.transaction(() => {
    db.prepare(
      "UPDATE reimbursements SET date = ?, account_id = ?, status = ?, notes = ? WHERE id = ?",
    ).run(trimmedDate, accountId, status, normalizeNotes(notes), id);
    db.prepare(
      "DELETE FROM reimbursement_payments WHERE reimbursement_id = ?",
    ).run(id);
    const linkPayment = db.prepare(
      "INSERT INTO reimbursement_payments (reimbursement_id, payment_id, amount_cents) VALUES (?, ?, ?)",
    );
    for (const allocation of allocations) {
      linkPayment.run(id, allocation.paymentId, allocation.amountCents);
    }
  })();
  return "saved";
}

export function updateReimbursementNotes(
  db: Database.Database,
  id: number,
  notes?: string,
): void {
  db.prepare("UPDATE reimbursements SET notes = ? WHERE id = ?").run(
    normalizeNotes(notes),
    id,
  );
}

export function deleteReimbursement(db: Database.Database, id: number): void {
  db.transaction(() => {
    db.prepare(
      "DELETE FROM reimbursement_payments WHERE reimbursement_id = ?",
    ).run(id);
    db.prepare("DELETE FROM reimbursements WHERE id = ?").run(id);
  })();
}
