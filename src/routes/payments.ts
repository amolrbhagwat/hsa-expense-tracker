import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { listAccounts } from "../accounts.js";
import { listPatients } from "../patients.js";
import {
  createPayment,
  deletePayment,
  getPayment,
  getVisitIdsForPayment,
  isPaymentLocked,
  listPayments,
  setPaymentVisits,
  updatePayment,
  updatePaymentNotes,
} from "../payments.js";
import { listProviders } from "../providers.js";
import { getReceiptsForPayment } from "../receipts.js";
import { listVisits } from "../visits.js";
import { renderPayments } from "../views/payments.js";
import { toIdArray } from "./util.js";

export function registerPaymentRoutes(
  app: FastifyInstance,
  db: Database.Database,
): void {
  app.get<{ Querystring: { edit?: string; error?: string } }>(
    "/payments",
    async (request, reply) => {
      const editId = request.query.edit ? Number(request.query.edit) : undefined;
      const editingPayment = editId ? getPayment(db, editId) : undefined;
      const locked = editingPayment ? isPaymentLocked(db, editingPayment.id) : false;
      const linkedReceipts = editingPayment
        ? getReceiptsForPayment(db, editingPayment.id)
        : [];
      const linkedVisitIds = editingPayment
        ? getVisitIdsForPayment(db, editingPayment.id)
        : [];
      reply
        .type("text/html")
        .send(
          renderPayments(
            listPayments(db),
            listPatients(db),
            listProviders(db),
            listAccounts(db),
            editingPayment,
            locked,
            request.query.error,
            linkedReceipts,
            listVisits(db),
            linkedVisitIds,
          ),
        );
    },
  );

  app.post<{
    Body: {
      date: string;
      amount: string;
      patientId: string;
      providerId: string;
      accountId: string;
      notes?: string;
    };
  }>("/payments", async (request, reply) => {
    const result = createPayment(
      db,
      request.body.date,
      request.body.amount,
      Number(request.body.patientId),
      Number(request.body.providerId),
      Number(request.body.accountId),
      request.body.notes,
    );
    if (result === "saved") {
      reply.redirect("/payments");
    } else {
      reply.redirect(`/payments?error=${result}`);
    }
  });

  app.post<{
    Params: { id: string };
    Body: {
      date: string;
      amount: string;
      patientId: string;
      providerId: string;
      accountId: string;
      notes?: string;
      visitIds?: string | string[];
    };
  }>("/payments/:id/update", async (request, reply) => {
    const id = Number(request.params.id);
    const current = getPayment(db, id);
    if (!current) {
      reply.code(404).send("Payment not found");
      return;
    }
    const visitIds = toIdArray(request.body.visitIds);

    if (isPaymentLocked(db, id)) {
      updatePaymentNotes(db, id, request.body.notes);
      setPaymentVisits(db, id, visitIds);
      reply.redirect("/payments");
      return;
    }

    const result = updatePayment(
      db,
      id,
      request.body.date,
      request.body.amount,
      Number(request.body.patientId),
      Number(request.body.providerId),
      Number(request.body.accountId),
      request.body.notes,
    );
    if (result === "saved") {
      setPaymentVisits(db, id, visitIds);
      reply.redirect("/payments");
    } else {
      reply.redirect(`/payments?edit=${id}&error=${result}`);
    }
  });

  app.post<{ Params: { id: string } }>(
    "/payments/:id/delete",
    async (request, reply) => {
      deletePayment(db, Number(request.params.id));
      reply.redirect("/payments");
    },
  );
}
