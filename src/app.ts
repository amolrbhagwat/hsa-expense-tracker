import formbody from "@fastify/formbody";
import Fastify, { type FastifyInstance } from "fastify";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  type AccountType,
} from "./accounts.js";
import { openDatabase } from "./db.js";
import { createPatient, deletePatient, listPatients } from "./patients.js";
import {
  createPayment,
  deletePayment,
  getPayment,
  isPaymentLocked,
  listPayments,
  updatePayment,
  updatePaymentNotes,
} from "./payments.js";
import {
  createProvider,
  deleteProvider,
  listProviders,
  type ProviderCategory,
} from "./providers.js";
import {
  guessMimeType,
  listVisitFiles,
  visitFilesDir,
  visitFilesKey,
} from "./visit-files.js";
import {
  createVisit,
  deleteVisit,
  getVisit,
  listVisits,
  updateVisit,
  updateVisitNotes,
  type Visit,
} from "./visits.js";
import { renderHome } from "./views/home.js";
import { renderManage } from "./views/manage.js";
import { renderPayments } from "./views/payments.js";
import { renderPlaceholder } from "./views/placeholder.js";
import { renderVisits } from "./views/visits.js";

export function buildApp(
  dataDir: string,
  options: { logger?: boolean } = {},
): FastifyInstance {
  const db = openDatabase(dataDir);
  const app = Fastify({ logger: options.logger ?? true });
  app.register(formbody);
  app.decorate("db", db);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/", async (_request, reply) => {
    reply.type("text/html").send(renderHome());
  });

  app.get<{ Querystring: { edit?: string; error?: string } }>(
    "/payments",
    async (request, reply) => {
      const editId = request.query.edit ? Number(request.query.edit) : undefined;
      const editingPayment = editId ? getPayment(db, editId) : undefined;
      const locked = editingPayment ? isPaymentLocked(db, editingPayment.id) : false;
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
    };
  }>("/payments/:id/update", async (request, reply) => {
    const id = Number(request.params.id);
    const current = getPayment(db, id);
    if (!current) {
      reply.code(404).send("Payment not found");
      return;
    }

    if (isPaymentLocked(db, id)) {
      updatePaymentNotes(db, id, request.body.notes);
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

  function filesKeyFor(visit: Visit): string {
    const patient = listPatients(db).find((p) => p.id === visit.patientId);
    const provider = listProviders(db).find((p) => p.id === visit.providerId);
    return visitFilesKey(visit, patient?.name ?? "", provider?.name ?? "");
  }

  app.get<{ Querystring: { edit?: string; error?: string } }>(
    "/visits",
    async (request, reply) => {
      const editId = request.query.edit ? Number(request.query.edit) : undefined;
      const editingVisit = editId ? getVisit(db, editId) : undefined;
      const filesKey = editingVisit ? filesKeyFor(editingVisit) : "";
      const files = editingVisit ? listVisitFiles(dataDir, filesKey) : undefined;
      reply
        .type("text/html")
        .send(
          renderVisits(
            listVisits(db),
            listPatients(db),
            listProviders(db),
            editingVisit,
            filesKey,
            files,
            request.query.error,
          ),
        );
    },
  );

  app.post<{
    Body: { date: string; patientId: string; providerId: string; notes?: string };
  }>("/visits", async (request, reply) => {
    const result = createVisit(
      db,
      request.body.date,
      Number(request.body.patientId),
      Number(request.body.providerId),
      request.body.notes,
    );
    if (result === "saved") {
      reply.redirect("/visits");
    } else {
      reply.redirect(`/visits?error=${result}`);
    }
  });

  app.post<{
    Params: { id: string };
    Body: { date: string; patientId: string; providerId: string; notes?: string };
  }>("/visits/:id/update", async (request, reply) => {
    const id = Number(request.params.id);
    const current = getVisit(db, id);
    if (!current) {
      reply.code(404).send("Visit not found");
      return;
    }
    const locked = listVisitFiles(dataDir, filesKeyFor(current)) !== undefined;

    if (locked) {
      updateVisitNotes(db, id, request.body.notes);
      reply.redirect("/visits");
      return;
    }

    const result = updateVisit(
      db,
      id,
      request.body.date,
      Number(request.body.patientId),
      Number(request.body.providerId),
      request.body.notes,
    );
    if (result === "saved") {
      reply.redirect("/visits");
    } else {
      reply.redirect(`/visits?edit=${id}&error=${result}`);
    }
  });

  app.post<{ Params: { id: string } }>(
    "/visits/:id/delete",
    async (request, reply) => {
      deleteVisit(db, Number(request.params.id));
      reply.redirect("/visits");
    },
  );

  app.get<{ Params: { id: string; filename: string } }>(
    "/visits/:id/files/:filename/open",
    async (request, reply) => {
      const visit = getVisit(db, Number(request.params.id));
      if (!visit) {
        reply.code(404).send("Visit not found");
        return;
      }
      const filename = request.params.filename;
      if (filename.includes("/") || filename.includes("\\")) {
        reply.code(400).send("Invalid filename");
        return;
      }
      const filePath = path.join(
        visitFilesDir(dataDir, filesKeyFor(visit)),
        filename,
      );
      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        reply.code(404).send("File not found");
        return;
      }
      reply.hijack();
      reply.raw.writeHead(200, { "content-type": guessMimeType(filename) });
      createReadStream(filePath).pipe(reply.raw);
    },
  );

  app.get("/reimbursements", async (_request, reply) => {
    reply.type("text/html").send(renderPlaceholder("reimbursements", "Reimbursements"));
  });

  app.get<{ Querystring: { error?: string } }>(
    "/manage",
    async (request, reply) => {
      reply
        .type("text/html")
        .send(
          renderManage(
            listPatients(db),
            listProviders(db),
            listAccounts(db),
            request.query.error,
          ),
        );
    },
  );

  app.post<{ Body: { name: string } }>(
    "/manage/patients",
    async (request, reply) => {
      const result = createPatient(db, request.body.name);
      if (result === "created") {
        reply.redirect("/manage");
      } else {
        reply.redirect(`/manage?error=${result}-patient-name`);
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/manage/patients/:id/delete",
    async (request, reply) => {
      deletePatient(db, Number(request.params.id));
      reply.redirect("/manage");
    },
  );

  app.post<{ Body: { name: string; category: ProviderCategory } }>(
    "/manage/providers",
    async (request, reply) => {
      const result = createProvider(
        db,
        request.body.name,
        request.body.category,
      );
      if (result === "created") {
        reply.redirect("/manage");
      } else {
        reply.redirect(`/manage?error=${result}-provider-name`);
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/manage/providers/:id/delete",
    async (request, reply) => {
      deleteProvider(db, Number(request.params.id));
      reply.redirect("/manage");
    },
  );

  app.post<{ Body: { name: string; type: AccountType } }>(
    "/manage/accounts",
    async (request, reply) => {
      const result = createAccount(db, request.body.name, request.body.type);
      if (result === "created") {
        reply.redirect("/manage");
      } else {
        reply.redirect(`/manage?error=${result}-account-name`);
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/manage/accounts/:id/delete",
    async (request, reply) => {
      deleteAccount(db, Number(request.params.id));
      reply.redirect("/manage");
    },
  );

  return app;
}
