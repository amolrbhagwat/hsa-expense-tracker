import formbody from "@fastify/formbody";
import Fastify, { type FastifyInstance } from "fastify";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  type AccountType,
} from "./accounts.js";
import { openDatabase } from "./db.js";
import { createPatient, deletePatient, listPatients } from "./patients.js";
import {
  createProvider,
  deleteProvider,
  listProviders,
  type ProviderCategory,
} from "./providers.js";
import { renderHome } from "./views/home.js";
import { renderManage } from "./views/manage.js";
import { renderPlaceholder } from "./views/placeholder.js";

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

  app.get("/payments", async (_request, reply) => {
    reply.type("text/html").send(renderPlaceholder("payments", "Payments"));
  });

  app.get("/visits", async (_request, reply) => {
    reply.type("text/html").send(renderPlaceholder("visits", "Visits"));
  });

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
