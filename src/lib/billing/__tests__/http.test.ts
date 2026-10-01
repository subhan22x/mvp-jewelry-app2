import { describe, expect, it, vi } from "vitest";
import { BillingActionError, billingActionFailure, billingRedirect, billingUnauthorized } from "../http";
const request = (json = true) => new Request("https://growjewelry.io/api/billing/checkout", { headers: { accept: json ? "application/json" : "text/html" } });
describe("billing action responses", () => {
  it("returns a JSON destination for enhanced forms and redirects ordinary forms", async () => {
    expect(await billingRedirect(request(), "https://checkout.stripe.com/test").json()).toEqual({ url: "https://checkout.stripe.com/test" });
    expect(billingRedirect(request(false), "https://checkout.stripe.com/test").status).toBe(303);
  });
  it("shows a refreshable conflict when the catalog price changes", async () => {
    const response = billingActionFailure(request(), new BillingActionError("Refresh the price.", 409));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Refresh the price." });
  });
  it("does not expose provider details and sends native-form failures back to the account view", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = billingActionFailure(request(), new Error("Private provider diagnostic"));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("Private provider");
    expect(billingActionFailure(request(false), new Error()).headers.get("location")).toBe("https://growjewelry.io/owner/account?billing=error");
    vi.restoreAllMocks();
  });
  it("allows expired sessions to recover through login", async () => {
    expect(billingUnauthorized(request()).status).toBe(401);
    expect(billingUnauthorized(request(false)).headers.get("location")).toContain("/login?next=/owner/account");
  });
});
