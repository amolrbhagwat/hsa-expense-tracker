import formbody from "@fastify/formbody";
import Fastify, { type FastifyInstance } from "fastify";
import { openDatabase } from "./db.js";
import { registerManageRoutes } from "./routes/manage.js";
import { registerMiscRoutes } from "./routes/misc.js";
import { registerPaymentRoutes } from "./routes/payments.js";
import { registerReceiptRoutes } from "./routes/receipts.js";
import { registerReimbursementRoutes } from "./routes/reimbursements.js";
import { registerVisitRoutes } from "./routes/visits.js";

export function buildApp(
  dataDir: string,
  options: { logger?: boolean } = {},
): FastifyInstance {
  const db = openDatabase(dataDir);
  const app = Fastify({ logger: options.logger ?? true });
  app.register(formbody);
  app.decorate("db", db);

  registerMiscRoutes(app);
  registerPaymentRoutes(app, db);
  registerVisitRoutes(app, db, dataDir);
  registerReceiptRoutes(app, db, dataDir);
  registerReimbursementRoutes(app, db);
  registerManageRoutes(app, db);

  return app;
}
