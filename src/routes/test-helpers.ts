import path from "node:path";
import type { FastifyInstance } from "fastify";

export async function seedPatientAndProvider(app: FastifyInstance) {
  await app.inject({
    method: "POST",
    url: "/manage/patients",
    payload: { name: "Kavi" },
  });
  await app.inject({
    method: "POST",
    url: "/manage/providers",
    payload: { name: "Dr. Sam Okafor", category: "medical" },
  });
  const manage = await app.inject({ method: "GET", url: "/manage" });
  const patientId = manage.body.match(/\/manage\/patients\/(\d+)\/delete/)![1];
  const providerId = manage.body.match(/\/manage\/providers\/(\d+)\/delete/)![1];
  return { patientId, providerId };
}

export async function seedPatientProviderAccount(app: FastifyInstance) {
  const { patientId, providerId } = await seedPatientAndProvider(app);
  await app.inject({
    method: "POST",
    url: "/manage/accounts",
    payload: { name: "Chase Sapphire", type: "personal" },
  });
  const manage = await app.inject({ method: "GET", url: "/manage" });
  const accountId = manage.body.match(/\/manage\/accounts\/(\d+)\/delete/)![1];
  return { patientId, providerId, accountId };
}

export async function seedVisit(app: FastifyInstance, dataDir: string) {
  const { patientId, providerId } = await seedPatientAndProvider(app);
  await app.inject({
    method: "POST",
    url: "/visits",
    payload: { date: "2026-06-01", patientId, providerId },
  });
  const visits = await app.inject({ method: "GET", url: "/visits" });
  const visitId = visits.body.match(/\/visits\?edit=(\d+)/)![1]!;

  const editPage = await app.inject({
    method: "GET",
    url: `/visits?edit=${visitId}`,
  });
  const filesKey = editPage.body.match(/visit-files\/([a-z0-9-]+)/)![1]!;

  return {
    visitId,
    filesKey,
    filesDir: path.join(dataDir, "visit-files", filesKey),
  };
}

export async function seedPayment(app: FastifyInstance) {
  const { patientId, providerId, accountId } = await seedPatientProviderAccount(app);
  await app.inject({
    method: "POST",
    url: "/payments",
    payload: { date: "2026-06-01", amount: "42.30", patientId, providerId, accountId },
  });
  const payments = await app.inject({ method: "GET", url: "/payments" });
  const paymentId = payments.body.match(/\/payments\?edit=(\d+)/)![1];
  return { patientId, providerId, accountId, paymentId };
}

export function extractPanel(body: string): string {
  return body.match(/<aside class="panel">[\s\S]*?<\/aside>/)![0];
}

export async function seedReimbursablePayment(app: FastifyInstance) {
  const { patientId, providerId, accountId } = await seedPatientProviderAccount(app);
  await app.inject({
    method: "POST",
    url: "/payments",
    payload: { date: "2026-06-01", amount: "900.00", patientId, providerId, accountId },
  });
  const payments = await app.inject({ method: "GET", url: "/payments" });
  const paymentId = payments.body.match(/\/payments\?edit=(\d+)/)![1]!;

  await app.inject({
    method: "POST",
    url: "/manage/accounts",
    payload: { name: "Fidelity HSA", type: "hsa" },
  });
  const manage = await app.inject({ method: "GET", url: "/manage" });
  const hsaAccountId = [...manage.body.matchAll(/\/manage\/accounts\/(\d+)\/delete/g)]
    .map((m) => m[1]!)
    .find((id) => id !== accountId)!;

  return {
    patientId,
    providerId,
    personalAccountId: accountId,
    hsaAccountId,
    paymentId,
  };
}
