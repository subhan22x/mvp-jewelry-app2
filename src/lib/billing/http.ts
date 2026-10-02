import { NextResponse } from "next/server";

export class BillingActionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function billingRedirect(req: Request, url: string) {
  return req.headers.get("accept")?.includes("application/json")
    ? NextResponse.json({ url })
    : NextResponse.redirect(url, { status: 303 });
}

export function billingUnauthorized(req: Request) {
  return req.headers.get("accept")?.includes("application/json")
    ? NextResponse.json({ error: "Please sign in again to manage billing." }, { status: 401 })
    : NextResponse.redirect(new URL("/login?next=/owner/account", req.url), { status: 303 });
}

export function billingActionFailure(req: Request, error: unknown) {
  const known = error instanceof BillingActionError;
  const message = known ? error.message : "Billing is temporarily unavailable. Please try again or contact support.";
  if (!known) console.error("Billing action failed", { type: error instanceof Error ? error.name : "UnknownError" });
  if (req.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ error: message }, { status: known ? error.status : 503 });
  }
  return NextResponse.redirect(new URL("/owner/account?billing=error", req.url), { status: 303 });
}
