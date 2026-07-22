import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  type AccountType,
} from "../accounts.js";
import { createPatient, deletePatient, listPatients } from "../patients.js";
import {
  createProvider,
  deleteProvider,
  listProviders,
  type ProviderCategory,
} from "../providers.js";
import { renderManage } from "../views/manage.js";

export function registerManageRoutes(
  app: FastifyInstance,
  db: Database.Database,
): void {
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
}
