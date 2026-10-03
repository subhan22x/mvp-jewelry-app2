import { writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { buildOwnerNotificationEmail } from "../src/lib/notifications/email";
import { loadEnvLocal } from "./env-local.mjs";

const environment = loadEnvLocal() as Record<string, string>;
if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required in .env.local.");

const prisma = new PrismaClient({ datasources: { db: { url: environment.DATABASE_URL } } });
const baseUrl = environment.APP_BASE_URL || environment.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
const outputPath = path.join(process.cwd(), "docs/owner-notification-historical-preview.html");
const productTypes = ["name", "picture", "necklace", "grillz"];

function attribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function text(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function localizeMedia(html: string) {
  return html
    .replaceAll(`${baseUrl}/generated/`, "../public/generated/")
    .replaceAll(`${baseUrl}/pendants/`, "../public/pendants/")
    .replaceAll(`${baseUrl}/email/`, "../public/email/");
}

async function main() {
try {
  const quotes = await Promise.all(productTypes.map(productType => prisma.quoteRequest.findFirst({
    where: { productType },
    orderBy: { createdAt: "asc" },
    include: {
      account: { select: { name: true } },
      request: {
        select: {
          Results: {
            where: { status: "succeeded", imageUrl: { not: null } },
            select: { imageUrl: true },
            orderBy: { variant: "asc" }
          }
        }
      }
    }
  })));

  const scenarios = quotes.filter((quote): quote is NonNullable<typeof quote> => quote !== null).map(quote => {
    const referenceUrls = (() => {
      try {
        const parsed: unknown = quote.referenceImageUrlsJson ? JSON.parse(quote.referenceImageUrlsJson) : [];
        return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string") : [];
      } catch { return []; }
    })();
    const generatedUrls = quote.request?.Results.map(result => result.imageUrl) ?? [];
    const imageUrls = generatedUrls.length ? generatedUrls : referenceUrls;
    const isReferenceRequest = !quote.requestId && referenceUrls.length > 0;
    const email = buildOwnerNotificationEmail({
      from: "Grow Jewelry <preview@example.invalid>",
      recipient: "owner@example.invalid",
      storeName: quote.account.name,
      quoteId: quote.id,
      productType: quote.productType ?? "general_quote",
      customerName: quote.customerName,
      customerPhone: quote.customerPhone,
      customerEmail: quote.customerEmail,
      designText: quote.text ?? "",
      imageUrl: quote.designedImageUrl,
      imageUrls,
      kind: isReferenceRequest ? "submitted_quote" : "generated_design",
      baseUrl,
      styleId: quote.styleId,
      pendantFinish: quote.pendantFinish,
      twoTone: quote.twoTone,
      primaryMetal: quote.primaryMetal,
      secondaryMetal: quote.secondaryMetal,
      emblem: quote.emblem,
      size: quote.size,
      metalType: quote.metalType,
      stoneType: quote.stoneType,
      plainMetal: quote.plainMetal,
      plainKarat: quote.plainKarat,
      plainChain: quote.plainChain,
      plainColor: quote.plainColor,
      diamondQuality: quote.diamondQuality,
      createdAt: quote.createdAt,
      status: quote.status,
      notes: quote.quoteNotes
    });
    return { productType: quote.productType ?? "Custom jewelry", createdAt: quote.createdAt, email };
  });

  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private historical owner notification previews</title><style>
:root{--bg:#0b0c0f;--panel:#14161b;--line:#2a2c34;--text:#e1e2ec;--muted:#8c909f;--gold:#f7bc5f}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 'Helvetica Neue',Helvetica,Arial,sans-serif}header,main{max-width:1320px;margin:auto;padding:24px}h1{margin:8px 0;font-size:28px}.eyebrow{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold);font-weight:bold}.warning{max-width:820px;padding:12px 14px;border:1px solid #654f1b;background:#242019;color:#e8d8b0;border-radius:10px}.lede{color:var(--muted);max-width:820px}.scenario{margin:24px 0 44px;padding-top:4px}.scenario h2{margin:0 0 4px;font-size:20px}.meta{margin:0 0 14px;color:var(--muted);font-size:13px}.meta b{color:var(--text)}.frames{display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap}.frame{display:flex;flex-direction:column;gap:8px}.frame span{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);font-weight:bold}iframe{display:block;border:1px solid var(--line);border-radius:14px;background:#0d0e12}.desktop iframe{width:660px;max-width:calc(100vw - 48px)}.mobile iframe{width:375px;max-width:calc(100vw - 48px);border-radius:28px;border-width:8px;border-color:#1c1e24}details{margin-top:18px;border:1px solid var(--line);border-radius:12px;padding:12px 16px;background:var(--panel)}summary{cursor:pointer;font-weight:600}pre{white-space:pre-wrap;color:var(--muted);font-size:12px;overflow-wrap:anywhere}@media(max-width:680px){header,main{padding:18px}}
</style></head><body><header><div class="eyebrow">Private review · owner notifications</div><h1>Historical quote-request email previews</h1><p class="warning"><b>Contains customer contact and request data from the local database.</b> Keep this file local; do not commit, publish, upload or share it.</p><p class="lede">One older request is shown for each product type available in the local database. The email comes from the same live formatter used by notifications, with no email sent and no database record changed.</p></header><main>${scenarios.map(scenario => {
    const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(scenario.createdAt);
    const html = attribute(localizeMedia(scenario.email.html));
    return `<section class="scenario"><h2>${text(scenario.email.subject)}</h2><p class="meta"><b>Product:</b> ${text(scenario.productType)} &nbsp;·&nbsp; <b>Original request:</b> ${text(date)} UTC</p><div class="frames"><div class="frame desktop"><span>Desktop</span><iframe title="${attribute(scenario.email.subject)} desktop" srcdoc="${html}" height="1480"></iframe></div><div class="frame mobile"><span>Phone · 375px</span><iframe title="${attribute(scenario.email.subject)} mobile" srcdoc="${html}" height="1480"></iframe></div></div><details><summary>Plain-text alternative</summary><pre>${text(scenario.email.text)}</pre></details></section>`;
  }).join("") || "<p>No historical quote requests were found.</p>"}</main></body></html>`;

  await writeFile(outputPath, page);
  console.log(`Wrote ${scenarios.length} historical scenarios to ${outputPath}.`);
} finally {
  await prisma.$disconnect();
}
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
