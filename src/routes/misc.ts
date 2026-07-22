import type { FastifyInstance } from "fastify";
import { renderHome } from "../views/home.js";
import { renderPlaceholder } from "../views/placeholder.js";

export function registerMiscRoutes(app: FastifyInstance): void {
  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/", async (_request, reply) => {
    reply.type("text/html").send(renderHome());
  });

  app.get("/reimbursements", async (_request, reply) => {
    reply.type("text/html").send(renderPlaceholder("reimbursements", "Reimbursements"));
  });
}
