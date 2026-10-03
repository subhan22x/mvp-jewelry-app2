import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOwnerNotificationEmail, previewImageUrl } from "../email";

const mocks = vi.hoisted(() => ({ setting: vi.fn(), save: vi.fn(), membership: vi.fn(), notification: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { appSetting: { findUnique: mocks.setting, upsert: mocks.save }, accountMembership: { findFirst: mocks.membership } } }));
vi.mock("@/src/lib/platform/background", () => ({ scheduleBackgroundTask: vi.fn() }));
import { defaultPreferences, getNotificationPreferences, ownerNotificationRecipient, preferenceSchema, saveNotificationPreferences } from "../preferences";
import { enqueueOwnerNotification } from "../events";

const emailInput = { from: "Grow Jewelry <alerts@notifications.growjewelry.io>", recipient: "owner@example.com", storeName: "Example Store", quoteId: "quote-1", productType: "name", customerName: "Ava", customerPhone: "+12025550142", customerEmail: "ava@example.com", designText: "AVA", imageUrl: "/generated/ava.png", kind: "generated_design", baseUrl: "https://growjewelry.io" };

beforeEach(() => { vi.clearAllMocks(); mocks.setting.mockResolvedValue(null); mocks.membership.mockResolvedValue({ user: { email: "owner@example.com" } }); });

describe("notification preferences and event creation", () => {
  it("defaults existing and new Accounts to email enabled without SMS", async () => {
    expect(await getNotificationPreferences("a")).toEqual(defaultPreferences);
    expect(mocks.setting).toHaveBeenCalledWith({ where: { key: "a:owner_notifications_v1" } });
  });
  it("fails closed on corrupt preferences and rejects SMS or cross-Account input", async () => {
    mocks.setting.mockResolvedValue({ value: "bad-json" });
    expect((await getNotificationPreferences("a")).enabled).toBe(false);
    expect(preferenceSchema.safeParse({ ...defaultPreferences, smsEnabled: true }).success).toBe(false);
    expect(preferenceSchema.safeParse({ ...defaultPreferences, accountId: "victim" }).success).toBe(false);
  });
  it("saves only an Account-scoped preference and supports removing an override", async () => {
    await saveNotificationPreferences("a", defaultPreferences);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ create: { key: "a:owner_notifications_v1", accountId: "a", value: JSON.stringify(defaultPreferences) } }));
  });
  it("reads legacy preferences without a zone and validates named zones", async () => {
    mocks.setting.mockResolvedValue({ value: JSON.stringify({ enabled: true, emailOverride: null, smsEnabled: false }) });
    expect(await getNotificationPreferences("a")).toEqual(defaultPreferences);
    for (const timeZone of ["America/Chicago", "Asia/Karachi", "UTC"]) expect(preferenceSchema.safeParse({ ...defaultPreferences, timeZone }).success).toBe(true);
    for (const timeZone of ["Invalid/Zone", "+05:00", "CST", ""]) expect(preferenceSchema.safeParse({ ...defaultPreferences, timeZone }).success).toBe(false);
  });
  it("normalizes a cleared email override to the login-email default", () => {
    expect(preferenceSchema.parse({ ...defaultPreferences, emailOverride: "   " }).emailOverride).toBeNull();
  });
  it("uses the owner login email or override, never a customer email", async () => {
    expect(await ownerNotificationRecipient("a", defaultPreferences)).toBe("owner@example.com");
    expect(await ownerNotificationRecipient("a", { ...defaultPreferences, emailOverride: "alerts@example.com" })).toBe("alerts@example.com");
    expect(mocks.membership).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ accountId: "a", role: "owner", status: "active" }) }));
    mocks.membership.mockResolvedValue(null);
    expect(await ownerNotificationRecipient("a", { ...defaultPreferences, emailOverride: "alerts@example.com" })).toBeNull();
  });
  it("persists a skipped event when disabled so re-enabling does not replay it", async () => {
    mocks.setting.mockResolvedValue({ value: JSON.stringify({ ...defaultPreferences, enabled: false }) });
    const db = { appSetting: { findUnique: mocks.setting }, ownerNotification: { create: mocks.notification } };
    await enqueueOwnerNotification(db as never, { accountId: "a", quoteRequestId: "q", kind: "generated_design" });
    expect(mocks.notification).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "skipped", deduplicationKey: "new_customer_request:q:email" }) });
  });
});

describe("email contents", () => {
  it("includes an authenticated quote link and honest unselected-preview wording", () => {
    const email = buildOwnerNotificationEmail(emailInput);
    expect(email.to).toEqual(["owner@example.com"]);
    expect(email.subject).toBe("New Name Pendant Design: Quote Request — Ava");
    expect(email.html).toContain('New <span style="color:#f7bc5f">Name Pendant</span> Design: Quote Request');
    expect(email.text).toContain("New Name Pendant Design: Quote Request");
    expect(email.text).toContain("Customer preference has not been recorded");
    expect(email.html).toContain("https://growjewelry.io/owner/quotes/quote-1/prepare");
    expect(email.html).toContain("https://growjewelry.io/generated/ava.png");
    expect(email.text).toContain("https://growjewelry.io/owner/settings");
  });
  it("includes stored quote specifications, budget and request details in HTML and text", () => {
    const email = buildOwnerNotificationEmail({ ...emailInput, styleId: "lexy", pendantFinish: "iced", twoTone: true,
      primaryMetal: "yellow_gold", secondaryMetal: "white_gold", metalType: "gold", plainKarat: "14K",
      stoneType: "natural_diamonds", diamondQuality: "vvs", size: "2 inches", emblem: "crown",
      budgetMinCents: 150000, budgetMaxCents: 250000, createdAt: new Date("2026-10-02T18:30:00Z"),
      status: "pending", notes: "Call after 5 <script>" });
    for (const value of ["Lexy", "Yellow Gold + White Gold", "14K", "Natural Diamonds", "VVS", "2 inches", "Submitted (UTC)", "quote-1", "Pending"]) {
      expect(email.html).toContain(value);
      expect(email.text).toContain(value);
    }
    expect(email.html).toContain("Call after 5 &lt;script&gt;");
    expect(email.html).not.toContain("<script>");
  });
  it.each([
    ["2026-10-03T07:38:00Z", "America/Chicago", "2:38 AM", "CDT"],
    ["2026-01-03T07:38:00Z", "America/Chicago", "1:38 AM", "CST"],
    ["2026-10-03T07:38:00Z", "Asia/Karachi", "12:38 PM", "GMT+5"],
    ["2026-10-03T07:38:00Z", "Invalid/Zone", "7:38 AM", "UTC"],
  ])("formats %s in %s with the correct daylight saving offset", (date, timeZone, time, abbreviation) => {
    const email = buildOwnerNotificationEmail({ ...emailInput, createdAt: new Date(date), timeZone });
    for (const part of [email.html, email.text]) {
      expect(part).toContain(time);
      expect(part).toContain(`Submitted (${abbreviation})`);
    }
    expect(email.html).toContain(`${time} ${abbreviation}`);
  });
  it("omits absent specifications and never shows a budget or price", () => {
    // No price exists when a quote is requested, so stored budgets stay out of the alert.
    const email = buildOwnerNotificationEmail({ ...emailInput, budgetMinCents: 150000, budgetMaxCents: 250000 });
    for (const part of [email.html, email.text]) {
      expect(part).not.toMatch(/budget|\$\d/i);
    }
    expect(email.text).not.toContain("Diamond quality:");
    expect(email.text).not.toContain("undefined");
  });
  it("escapes customer content and omits unsafe images", () => {
    const email = buildOwnerNotificationEmail({ ...emailInput, customerName: '<script>alert(1)</script>', imageUrl: "javascript:alert(1)" });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).not.toContain('javascript:');
    expect(email.html).not.toContain('design preview"');
    expect(email.html).toContain('alt="Grow Jewelry"');
    expect(previewImageUrl('data:image/png;base64,AAA', emailInput.baseUrl)).toBeNull();
  });
  it("shows up to four generated variants, deduplicated, and says when more are still generating", () => {
    const email = buildOwnerNotificationEmail({ ...emailInput, imageUrls: ["/generated/ava.png", "/generated/ava-2.png", "javascript:alert(1)", "/generated/ava-3.png", null], pendingImageCount: 1 });
    expect(email.html.match(/<img /g)?.length).toBe(4); // logo + 3 unique safe designs
    expect(email.html).toContain("GENERATED PREVIEWS · 3");
    expect(email.html).not.toContain("javascript:");
    expect(email.text).toContain("Generated preview 3: https://growjewelry.io/generated/ava-3.png");
    expect(email.text).toContain("1 more design is still generating");
  });
  it("caps uploaded references at four and points to the rest in the dashboard", () => {
    const refs = Array.from({ length: 6 }, (_, index) => `/uploads/ref-${index}.png`);
    const email = buildOwnerNotificationEmail({ ...emailInput, kind: "submitted_quote", imageUrl: refs[0], imageUrls: refs, pendingImageCount: 3 });
    expect(email.html).toContain("CUSTOMER REFERENCE IMAGES · 4");
    expect(email.html).not.toContain("ref-4.png");
    expect(email.text).toContain("+2 more in your dashboard");
    expect(email.text).not.toContain("still generating");
  });
  it("labels uploaded quote media separately and includes notes without claiming a favorite", () => {
    const email = buildOwnerNotificationEmail({ ...emailInput, productType: "general_quote", kind: "submitted_quote", notes: "Silver ring" });
    expect(email.subject).toBe("New Custom Jewelry Quote Request — Ava");
    expect(email.html).toContain('New <span style="color:#f7bc5f">Custom Jewelry</span> Quote Request');
    expect(email.html).toContain('CUSTOMER REFERENCE IMAGE');
    expect(email.text).toContain('Notes: Silver ring');
    expect(email.text).not.toContain('Customer preference');
  });
});
