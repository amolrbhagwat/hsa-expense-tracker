import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { getPaymentsForVisit } from "../payments.js";
import { listPatients } from "../patients.js";
import { listProviders } from "../providers.js";
import {
  guessMimeType,
  listVisitFiles,
  visitFilesDir,
  visitFilesKey,
} from "../visit-files.js";
import {
  createVisit,
  deleteVisit,
  getVisit,
  listVisits,
  updateVisit,
  updateVisitNotes,
  type Visit,
} from "../visits.js";
import { renderVisits } from "../views/visits.js";

export function registerVisitRoutes(
  app: FastifyInstance,
  db: Database.Database,
  dataDir: string,
): void {
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
      const visits = listVisits(db);
      const paymentsByVisitId = new Map(
        visits.map((visit) => [visit.id, getPaymentsForVisit(db, visit.id)]),
      );
      reply
        .type("text/html")
        .send(
          renderVisits(
            visits,
            listPatients(db),
            listProviders(db),
            paymentsByVisitId,
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
}
