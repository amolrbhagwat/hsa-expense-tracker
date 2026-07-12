import Fastify, { type FastifyInstance } from "fastify";
import { openDatabase } from "./db.js";

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

  return app;
}
