import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { listAccounts } from "../accounts.js";
import { parseAmountCents } from "../payments.js";
import {
  createReimbursement,
  deleteReimbursement,
  getLinkedPayments,
  getReimbursement,
  isReimbursementLocked,
  listReimbursablePayments,
  listReimbursements,
  updateReimbursement,
  updateReimbursementNotes,
  type PaymentAllocation,
  type ReimbursementStatus,
} from "../reimbursements.js";
import { renderReimbursements } from "../views/reimbursements.js";
import { toIdArray } from "./util.js";

function parseAllocations(
  rawBody: Record<string, string | undefined>,
  paymentIds: number[],
): PaymentAllocation[] {
  return paymentIds.map((paymentId) => ({
    paymentId,
    amountCents: parseAmountCents(rawBody[`amount_${paymentId}`] ?? "") ?? 0,
  }));
}

function parseStatus(value: string | undefined): ReimbursementStatus {
  return value === "completed" ? "completed" : "initiated";
}

export function registerReimbursementRoutes(
  app: FastifyInstance,
  db: Database.Database,
): void {
  app.get<{
    Querystring: {
      new?: string;
      date?: string;
      accountId?: string;
      status?: string;
      edit?: string;
      error?: string;
    };
  }>("/reimbursements", async (request, reply) => {
    const editId = request.query.edit ? Number(request.query.edit) : undefined;
    const editingReimbursement = editId ? getReimbursement(db, editId) : undefined;
    const locked = editingReimbursement
      ? isReimbursementLocked(editingReimbursement)
      : false;
    const taxAdvantagedAccounts = listAccounts(db).filter(
      (a) => a.type !== "personal",
    );
    const reimbursablePayments = listReimbursablePayments(db, editId);

    const reimbursements = listReimbursements(db);
    const paymentsByReimbursementId = new Map(
      reimbursements.map((r) => [r.id, getLinkedPayments(db, r.id)]),
    );

    reply
      .type("text/html")
      .send(
        renderReimbursements(
          reimbursements,
          taxAdvantagedAccounts,
          reimbursablePayments,
          paymentsByReimbursementId,
          {
            creating: request.query.new === "1",
            newPrefill: {
              date: request.query.date,
              accountId: request.query.accountId ? Number(request.query.accountId) : undefined,
              status: parseStatus(request.query.status),
            },
            editingReimbursement,
            locked,
            errorCode: request.query.error,
          },
        ),
      );
  });

  app.post<{
    Body: {
      date: string;
      accountId: string;
      status?: string;
      paymentIds?: string | string[];
      notes?: string;
    };
  }>("/reimbursements", async (request, reply) => {
    const paymentIds = toIdArray(request.body.paymentIds);
    const allocations = parseAllocations(
      request.body as unknown as Record<string, string | undefined>,
      paymentIds,
    );
    const result = createReimbursement(
      db,
      request.body.date,
      Number(request.body.accountId),
      parseStatus(request.body.status),
      allocations,
      request.body.notes,
    );
    if (result === "saved") {
      reply.redirect("/reimbursements");
    } else {
      reply.redirect(`/reimbursements?error=${result}`);
    }
  });

  app.post<{
    Params: { id: string };
    Body: {
      date: string;
      accountId: string;
      status?: string;
      paymentIds?: string | string[];
      notes?: string;
    };
  }>("/reimbursements/:id/update", async (request, reply) => {
    const id = Number(request.params.id);
    const current = getReimbursement(db, id);
    if (!current) {
      reply.code(404).send("Reimbursement not found");
      return;
    }

    if (isReimbursementLocked(current)) {
      updateReimbursementNotes(db, id, request.body.notes);
      reply.redirect("/reimbursements");
      return;
    }

    const paymentIds = toIdArray(request.body.paymentIds);
    const allocations = parseAllocations(
      request.body as unknown as Record<string, string | undefined>,
      paymentIds,
    );
    const result = updateReimbursement(
      db,
      id,
      request.body.date,
      Number(request.body.accountId),
      parseStatus(request.body.status),
      allocations,
      request.body.notes,
    );
    if (result === "saved") {
      reply.redirect("/reimbursements");
    } else {
      reply.redirect(`/reimbursements?edit=${id}&error=${result}`);
    }
  });

  app.post<{ Params: { id: string } }>(
    "/reimbursements/:id/delete",
    async (request, reply) => {
      deleteReimbursement(db, Number(request.params.id));
      reply.redirect("/reimbursements");
    },
  );
}
