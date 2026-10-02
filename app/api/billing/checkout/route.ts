import { z } from "zod";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { getActiveBillingPlan } from "@/src/lib/billing/plans";
import { startAccountCheckout } from "@/src/lib/billing/checkout";
import { getStripe } from "@/src/lib/billing/stripe";
import { billingRedirect, billingUnauthorized, billingActionFailure, BillingActionError } from "@/src/lib/billing/http";

export const dynamic = "force-dynamic";

const Body = z.object({
  planKey: z.string().default("basic"),
  priceId: z.string().optional(),
  intent: z.enum(["subscribe", "trial"]).default("subscribe"),
});

async function parseBody(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return Body.parse(await req.json());
  const form = await req.formData();
  return Body.parse({ planKey: form.get("planKey") ?? "basic", priceId: form.get("priceId") ?? undefined, intent: form.get("intent") ?? "subscribe" });
}

function appBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_BASE_URL?.trim() || new URL(req.url).origin;
}

export async function POST(req: Request) {
  const owner = await getOwnerContext();
  if (!owner) return billingUnauthorized(req);

  try {
    let body: z.infer<typeof Body>;
    try { body = await parseBody(req); } catch { throw new BillingActionError("Choose an available plan and try again."); }
    const plan = getActiveBillingPlan(body.planKey);
    if (!plan) {
      throw new BillingActionError("Only the Basic plan is available.");
    }

    const url = await startAccountCheckout({
      stripe: getStripe(),
      accountId: owner.accountId,
      email: owner.email,
      plan,
      expectedPriceId: body.priceId,
      intent: body.intent,
      baseUrl: appBaseUrl(req),
    });
    return billingRedirect(req, url);
  } catch (error) {
    return billingActionFailure(req, error);
  }
}
