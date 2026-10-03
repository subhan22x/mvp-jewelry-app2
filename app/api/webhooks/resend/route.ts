import { Resend } from "resend";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { reconcileNotificationWebhooks } from "@/src/lib/notifications/worker";

const eventSchema = z.object({ type: z.string().max(100), created_at: z.string().datetime({ offset: true }), data: z.object({ email_id: z.string().min(1).max(100) }) });

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const id = req.headers.get('svix-id');
  const timestamp = req.headers.get('svix-timestamp');
  const signature = req.headers.get('svix-signature');
  if (!id || !timestamp || !signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  let verified: unknown;
  try {
    verified = new Resend(process.env.RESEND_API_KEY || 'webhook-verification-only').webhooks.verify({ payload: await req.text(), headers: { id, timestamp, signature }, webhookSecret: secret });
  } catch { return NextResponse.json({ error: "Invalid signature." }, { status: 400 }); }
  const parsed = eventSchema.safeParse(verified);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email event." }, { status: 400 });
  await prisma.notificationWebhookEvent.upsert({ where: { id }, update: {}, create: { id, type: parsed.data.type, providerMessageId: parsed.data.data.email_id, occurredAt: new Date(parsed.data.created_at) } });
  await reconcileNotificationWebhooks();
  return NextResponse.json({ received: true });
}
