// Runs only against a disposable local database. No real email/provider calls.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";

async function main() {
  const connection = process.env.NOTIFICATION_TEST_DATABASE_URL;
  if (!connection) throw new Error("Set NOTIFICATION_TEST_DATABASE_URL to a disposable local notification_tests database.");
  const url = new URL(connection);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/notification_tests") {
    throw new Error("Refusing a non-local or non-test database.");
  }
  const prisma = new PrismaClient({ datasources: { db: { url: connection } } });
  (globalThis as unknown as { prisma: PrismaClient }).prisma = prisma;
  const prefix = `notification-test-${randomUUID()}`;
  const originalFetch = globalThis.fetch;
  const originalEnv = { key: process.env.RESEND_API_KEY, sender: process.env.NOTIFICATION_EMAIL_FROM, base: process.env.APP_BASE_URL };
  process.env.RESEND_API_KEY = "test-only-key";
  process.env.NOTIFICATION_EMAIL_FROM = "Test <notifications@example.com>";
  process.env.APP_BASE_URL = "https://growjewelry.io";
  const accepted = new Map<string, { id: string; body: string }>();
  let providerCalls = 0;
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "https://api.resend.com/emails");
    const headers = new Headers(init?.headers);
    const key = headers.get("Idempotency-Key")!;
    const body = init?.body as string;
    providerCalls++;
    if (accepted.has(key)) assert.equal(accepted.get(key)!.body, body, "retry must preserve payload");
    else accepted.set(key, { id: `provider-${key}`, body });
    return new Response(JSON.stringify({ id: accepted.get(key)!.id }), { status: 200 });
  };
  const { processOwnerNotifications } = await import("../src/lib/notifications/worker");
  const create = async (suffix: string, extra: object = {}) => {
    const id = `${prefix}-${suffix}`;
    await prisma.account.create({ data: { id, name: "Fixture store", slug: id } });
    await prisma.user.create({ data: { id, authUserId: id, email: `${suffix}@example.com`, storeName: "Fixture store" } });
    await prisma.accountMembership.create({ data: { accountId: id, userId: id } });
    await prisma.quoteRequest.create({ data: { id, accountId: id, customerName: "Fixture customer", customerEmail: "customer@example.com", customerPhone: "+12025550142", designedImageUrl: "https://example.com/design.png", productType: "general_quote" } });
    return prisma.ownerNotification.create({ data: { id, accountId: id, quoteRequestId: id, kind: "submitted_quote", deduplicationKey: id, ...extra } });
  };
  try {
    // Apply the committed additive SQL (schema already initialized with Prisma).
    // Prisma cannot execute multiple statements; the runner uses pg below.
    const { Client } = createRequire(import.meta.url)("pg");
    const client = new Client({ connectionString: connection });
    await client.connect();
    await client.query(readFileSync("prisma/postgres-migrations/20261002140000_add_owner_notifications.sql", "utf8"));
    await client.end();

    const race = await create("race");
    await Promise.all(Array.from({ length: 8 }, () => processOwnerNotifications(1)));
    assert.equal(accepted.size, 1);
    assert.equal(providerCalls, 1, "competing workers must not both send a claimed delivery");
    assert.equal((await prisma.ownerNotification.findUniqueOrThrow({ where: { id: race.id } })).status, "sent");
    console.log("PASS: 8 competing processors accept one delivery once.");

    const future = await create("future", { nextAttemptAt: new Date(Date.now() + 60_000) });
    const leased = await create("leased", { status: "processing", leaseUntil: new Date(Date.now() + 60_000), leaseToken: "active" });
    assert.equal((await processOwnerNotifications(5)).processed, 0);
    await prisma.ownerNotification.update({ where: { id: leased.id }, data: { leaseUntil: new Date(Date.now() - 1) } });
    await processOwnerNotifications(1);
    assert.equal((await prisma.ownerNotification.findUniqueOrThrow({ where: { id: leased.id } })).status, "sent");
    assert.equal((await prisma.ownerNotification.findUniqueOrThrow({ where: { id: future.id } })).status, "queued");
    console.log("PASS: future retries and active leases wait; expired leases recover.");

    const crash = await create("crash");
    const update = prisma.ownerNotification.updateMany.bind(prisma.ownerNotification);
    const findUnique = prisma.ownerNotification.findUnique.bind(prisma.ownerNotification);
    prisma.ownerNotification.updateMany = ((args: Parameters<typeof update>[0]) => {
      if (args?.data?.status === "sent") return Promise.reject(new Error("simulated database outage"));
      return update(args);
    }) as unknown as typeof prisma.ownerNotification.updateMany;
    prisma.ownerNotification.findUnique = (() => Promise.reject(new Error("simulated process failure"))) as unknown as typeof prisma.ownerNotification.findUnique;
    try { await assert.rejects(processOwnerNotifications(1), /simulated process failure/); }
    finally { prisma.ownerNotification.updateMany = update; prisma.ownerNotification.findUnique = findUnique; }
    const interrupted = await prisma.ownerNotification.findUniqueOrThrow({ where: { id: crash.id } });
    assert.equal(interrupted.status, "processing"); assert.ok(interrupted.payloadJson);
    await prisma.ownerNotification.update({ where: { id: crash.id }, data: { leaseUntil: new Date(Date.now() - 1) } });
    await processOwnerNotifications(1);
    const recovered = await prisma.ownerNotification.findUniqueOrThrow({ where: { id: crash.id } });
    assert.equal(recovered.status, "sent"); assert.equal(recovered.payloadJson, interrupted.payloadJson);
    assert.equal(accepted.get(crash.id)!.id, recovered.providerMessageId);
    console.log("PASS: crash after provider acceptance recovers the immutable idempotent delivery.");

    const baseline = accepted.size;
    const start = Date.now();
    await Promise.all(Array.from({ length: 50 }, (_, i) => create(`burst-${i}`)));
    await Promise.all(Array.from({ length: 10 }, () => processOwnerNotifications(20)));
    // Contention can consume a batch iteration; finish any remainder.
    while ((await processOwnerNotifications(20)).processed) { /* drain */ }
    assert.equal(accepted.size - baseline, 50);
    assert.equal(await prisma.ownerNotification.count({ where: { id: { startsWith: `${prefix}-burst` }, status: "sent" } }), 50);
    console.log(`PASS: 50 Account quote alerts processed without duplicates by 10 concurrent processors in ${Date.now() - start}ms (local DB, mocked provider; not a production throughput guarantee).`);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries({ RESEND_API_KEY: originalEnv.key, NOTIFICATION_EMAIL_FROM: originalEnv.sender, APP_BASE_URL: originalEnv.base })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await prisma.ownerNotification.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.quoteRequest.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.accountMembership.deleteMany({ where: { accountId: { startsWith: prefix } } });
    await prisma.account.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
