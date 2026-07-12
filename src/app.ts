import formbody from "@fastify/formbody";
import Fastify, { type FastifyInstance } from "fastify";
import { openDatabase } from "./db.js";
import { createPatient, deletePatient, listPatients } from "./patients.js";
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
        .send(renderManage(listPatients(db), request.query.error));
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

  return app;
}
