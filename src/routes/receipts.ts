import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { listPayments } from "../payments.js";
import { listProviders } from "../providers.js";
import {
  guessMimeType,
  listReceiptFiles,
  receiptFilesDir,
  receiptFilesKey,
} from "../receipt-files.js";
import {
  createReceipt,
  deleteReceipt,
  getLinkedPayments,
  getReceipt,
  listReceipts,
  updateReceiptNotes,
} from "../receipts.js";
import { renderReceipts } from "../views/receipts.js";
import { toIdArray } from "./util.js";

export function registerReceiptRoutes(
  app: FastifyInstance,
  db: Database.Database,
  dataDir: string,
): void {
  function receiptFilesKeyFor(receipt: {
    date: string;
    disambiguator: string;
    providerId: number;
  }): string {
    const provider = listProviders(db).find((p) => p.id === receipt.providerId);
    return receiptFilesKey(receipt, provider?.name ?? "");
  }

  app.get<{ Querystring: { view?: string; error?: string } }>(
    "/receipts",
    async (request, reply) => {
      const viewId = request.query.view ? Number(request.query.view) : undefined;
      const viewingReceipt = viewId ? getReceipt(db, viewId) : undefined;
      const filesKey = viewingReceipt ? receiptFilesKeyFor(viewingReceipt) : undefined;
      reply
        .type("text/html")
        .send(
          renderReceipts(listReceipts(db), listPayments(db), listProviders(db), {
            viewingReceipt,
            linkedPayments: viewingReceipt
              ? getLinkedPayments(db, viewingReceipt.id)
              : undefined,
            filesKey,
            files: filesKey ? listReceiptFiles(dataDir, filesKey) : undefined,
            errorCode: request.query.error,
          }),
        );
    },
  );

  app.post<{
    Body: {
      date: string;
      providerId: string;
      disambiguator?: string;
      paymentIds?: string | string[];
      notes?: string;
    };
  }>("/receipts", async (request, reply) => {
    const result = createReceipt(
      db,
      request.body.date,
      Number(request.body.providerId),
      request.body.disambiguator,
      toIdArray(request.body.paymentIds),
      request.body.notes,
    );
    if (result === "saved") {
      reply.redirect("/receipts");
    } else {
      reply.redirect(`/receipts?error=${result}`);
    }
  });

  app.post<{ Params: { id: string }; Body: { notes?: string } }>(
    "/receipts/:id/update",
    async (request, reply) => {
      updateReceiptNotes(db, Number(request.params.id), request.body.notes);
      reply.redirect("/receipts");
    },
  );

  app.post<{ Params: { id: string } }>(
    "/receipts/:id/delete",
    async (request, reply) => {
      deleteReceipt(db, Number(request.params.id));
      reply.redirect("/receipts");
    },
  );

  app.get<{ Params: { id: string; filename: string } }>(
    "/receipts/:id/files/:filename/open",
    async (request, reply) => {
      const receipt = getReceipt(db, Number(request.params.id));
      if (!receipt) {
        reply.code(404).send("Receipt not found");
        return;
      }
      const filename = request.params.filename;
      if (filename.includes("/") || filename.includes("\\")) {
        reply.code(400).send("Invalid filename");
        return;
      }
      const filePath = path.join(
        receiptFilesDir(dataDir, receiptFilesKeyFor(receipt)),
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
