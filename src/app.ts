import Fastify, { type FastifyInstance } from "fastify";
import { openDatabase } from "./db.js";
import { renderHome } from "./views/home.js";
import { renderPlaceholder } from "./views/placeholder.js";

export function buildApp(
  dataDir: string,
  options: { logger?: boolean } = {},
): FastifyInstance {
  const db = openDatabase(dataDir);
  const app = Fastify({ logger: options.logger ?? true });
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

  app.get("/manage", async (_request, reply) => {
    reply.type("text/html").send(renderPlaceholder("manage", "Manage"));
  });

  return app;
}
