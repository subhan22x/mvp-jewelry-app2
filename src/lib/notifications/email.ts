import { isValidTimeZone } from "./time-zone";
import { z } from "zod";

export const emailPayloadSchema = z.object({
  from: z.string().min(1), to: z.array(z.string().email()).length(1),
  subject: z.string(), html: z.string(), text: z.string()
});
export type NotificationEmail = z.infer<typeof emailPayloadSchema>;
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
export function notificationBaseUrl() {
  const value = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!value) throw new Error("notification_base_url_missing");
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error("notification_base_url_invalid");
  return url.origin;
}
export function previewImageUrl(value: string | null, baseUrl: string) {
  if (!value) return null;
  try {
    const url = new URL(value, baseUrl);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
const categories: Record<string, string> = { name: "Name pendant", picture: "Picture pendant", grillz: "Grillz", bracelet: "Bracelet", necklace: "Necklace", general_quote: "Custom jewelry" };

type QuoteDetails = {
  styleId?: string | null; pendantFinish?: string | null; twoTone?: boolean | null;
  primaryMetal?: string | null; secondaryMetal?: string | null; emblem?: string | null;
  size?: string | null; metalType?: string | null; stoneType?: string | null;
  plainMetal?: string | null; plainKarat?: string | null; plainChain?: string | null;
  plainColor?: string | null; diamondQuality?: string | null;
  // Accepted from callers but intentionally not shown: no price is known when a quote is requested.
  budgetMinCents?: number | null; budgetMaxCents?: number | null;
  timeZone?: string | null; createdAt?: Date | null; status?: string | null;
};
const displayValue = (value: string) => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

// Dashboard palette (see OwnerFrame / settings cards). Email-safe: tables, inline styles, bgcolor fallbacks.
const C = {
  page: '#0d0e12', card: '#17191f', well: '#101114', line: '#30323b', hair: '#24262e',
  text: '#e1e2ec', soft: '#c2c6d6', muted: '#8c909f', gold: '#f7bc5f', goldInk: '#17100a', goldTint: '#242019'
};
const MAX_IMAGES = 4;
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";
const eyebrow = (label: string, color = C.gold) => `<div style="font-family:${SANS};font-size:11px;line-height:16px;font-weight:bold;letter-spacing:0.8px;text-transform:uppercase;color:${color}">${label}</div>`;
const row = (cells: string, style = '') => `<tr><td class="px" style="${style}">${cells}</td></tr>`;

export function buildOwnerNotificationEmail(input: QuoteDetails & {
  from: string; recipient: string; storeName: string; quoteId: string;
  productType: string; customerName: string; customerPhone: string;
  customerEmail: string; designText: string; imageUrl: string | null;
  notes?: string | null; kind: string; baseUrl: string;
  /** Additional successful variants or uploaded references, in display order. */
  imageUrls?: readonly (string | null)[] | null;
  /** Variants still generating when the alert was built (generated designs only). */
  pendingImageCount?: number;
}): NotificationEmail {
  const category = categories[input.productType] ?? "Custom jewelry";
  const categoryTitle = displayValue(category);
  const submitted = input.kind === "submitted_quote";
  const reviewUrl = new URL(`/owner/quotes/${encodeURIComponent(input.quoteId)}/prepare`, input.baseUrl).href;
  const settingsUrl = new URL('/owner/settings', input.baseUrl).href;
  const safeImages = [...new Set([input.imageUrl, ...(input.imageUrls ?? [])].map(url => previewImageUrl(url ?? null, input.baseUrl)).filter((url): url is string => !!url))];
  const images = safeImages.slice(0, MAX_IMAGES);
  const hiddenImages = safeImages.length - images.length;
  const pendingImages = submitted ? 0 : Math.max(0, input.pendingImageCount ?? 0);
  const image = images[0] ?? null;
  const preference = `Customer preference has not been recorded. ${images.length > 1 ? 'These are generated previews' : 'This is a generated preview'}; all available designs are in your dashboard.`;
  const logoUrl = new URL('/email/growjewelry-logo.png', input.baseUrl).href;
  const body = submitted
    ? `${input.customerName} submitted reference images and requested a quote from ${input.storeName}.`
    : `${input.customerName} created a ${category.toLowerCase()} design through ${input.storeName}'s jewelry designer.`;


  const designRows: string[][] = [['Product', category]];
  const add = (label: string, value: string | null | undefined, format = true) => {
    if (value?.trim()) designRows.push([label, format ? displayValue(value) : value]);
  };
  add('Design text', input.designText, false);
  add('Style', input.styleId);
  add('Finish', input.pendantFinish);
  const metals = [input.primaryMetal, ...(input.twoTone ? [input.secondaryMetal] : [])].filter((value): value is string => !!value);
  const metalColors = metals.length ? [...new Set(metals)].map(displayValue).join(' + ') : null;
  if (metalColors) designRows.push(['Metal colors', metalColors]);
  add('Material', input.metalType ?? input.plainMetal);
  add('Karat', input.plainKarat, false);
  add('Stones', input.stoneType);
  add('Diamond quality', input.diamondQuality?.toUpperCase(), false);
  add('Size', input.size, false);
  add('Emblem', input.emblem);
  add('Color', input.plainColor);
  add('Chain', input.plainChain);
  const timeZone = input.timeZone && isValidTimeZone(input.timeZone) ? input.timeZone : 'UTC';
  const zoneLabel = input.createdAt ? new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(input.createdAt).find(part => part.type === 'timeZoneName')?.value ?? timeZone : timeZone;
  const submittedAt = input.createdAt ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(input.createdAt) : null;
  const tel = input.customerPhone.replace(/[^\d+]/g, '');
  const mail = /^[^\s@<>"']+@[^\s@<>"']+$/.test(input.customerEmail) ? input.customerEmail : '';
  type Row = [label: string, value: string, href?: string];
  const customerRows: Row[] = [['Customer', input.customerName], ['Phone', input.customerPhone, tel ? `tel:${tel}` : undefined], ...(input.customerEmail ? [['Email', input.customerEmail, mail ? `mailto:${mail}` : undefined] as Row] : [])];
  const requestRows: Row[] = [['Request reference', input.quoteId], ...(submittedAt ? [[`Submitted (${zoneLabel})`, submittedAt] as Row] : []), ...(input.status ? [['Status', displayValue(input.status)] as Row] : []), ...(input.notes ? [['Notes', input.notes] as Row] : [])];
  const sections = [['Design specifications', designRows as Row[]], ['Customer details', customerRows], ['Request details', requestRows]] as const;
  // Generated concepts and reference-only quote submissions need different
  // wording: a reference upload is a quote request, but not a "design" yet.
  const requestTitle = submitted
    ? `New ${categoryTitle} Quote Request`
    : `New ${categoryTitle} Design: Quote Request`;
  const productTitle = `<span style="color:${C.gold}">${escape(categoryTitle)}</span>`;
  const requestTitleHtml = submitted
    ? `New ${productTitle} Quote Request`
    : `New ${productTitle} Design: Quote Request`;
  const subject = `${requestTitle} — ${input.customerName}`.replace(/[\r\n]/g, ' ');
  const footer = `You're receiving this because customer activity notifications are enabled for ${input.storeName}.`;

  const labelStyle = `font-family:${SANS};font-size:12px;line-height:18px;color:${C.muted}`;
  const valueStyle = `font-family:${SANS};font-size:13px;line-height:18px;color:${C.text};overflow-wrap:anywhere;word-break:break-word;white-space:pre-wrap`;
  const value = (text: string, href?: string) => href ? `<a href="${escape(href)}" style="color:${C.text};text-decoration:none">${escape(text)}</a>` : escape(text);
  // Compact label/value list; notes and long values sit under their label instead of a cramped right column.
  const list = (rows: readonly Row[]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows.map(([label, text, href], index) => {
    const rule = index ? `border-top:1px solid ${C.hair};` : '';
    return label === 'Notes' || text.length > 28
      ? `<tr><td colspan="2" style="padding:7px 0;${rule}"><div style="${labelStyle}">${escape(label)}</div><div style="margin-top:2px;${valueStyle}">${value(text, href)}</div></td></tr>`
      : `<tr><td style="padding:7px 12px 7px 0;${rule}${labelStyle};vertical-align:top;white-space:nowrap">${escape(label)}</td><td align="right" style="padding:7px 0;${rule}${valueStyle};vertical-align:top;text-align:right">${value(text, href)}</td></tr>`;
  }).join('')}</table>`;
  const panelStyle = `border-collapse:separate;background:${C.well};border:1px solid ${C.line};border-radius:14px`;
  const column = (heading: string, rows: readonly Row[]) => `${eyebrow(heading)}<div style="height:6px;line-height:6px;font-size:0">&nbsp;</div>${list(rows)}`;
  const accentName = `<span style="font-family:${SERIF};font-style:italic;font-weight:normal;color:${C.gold}">${escape(input.customerName)}</span>`;
  const headline = submitted ? `${accentName} sent reference images` : `${accentName} designed a ${escape(category.toLowerCase())}`;
  const subline = `${submitted ? `Quote request to ${input.storeName}` : `Via ${input.storeName}'s jewelry designer`}${submittedAt ? ` · ${submittedAt} ${zoneLabel}` : ''}`;
  const mediaLabel = `${submitted ? 'CUSTOMER REFERENCE IMAGE' : 'GENERATED PREVIEW'}${images.length > 1 ? `S · ${images.length}` : ''}`;
  const mediaExtra = [hiddenImages ? `+${hiddenImages} more in your dashboard` : '', pendingImages ? `${pendingImages} more ${pendingImages === 1 ? 'design is' : 'designs are'} still generating` : ''].filter(Boolean).join(' · ');
  const altFor = (index: number) => submitted ? `Customer reference image ${index + 1}` : `Generated ${category.toLowerCase()} design preview ${index + 1}`;
  // Extra images sit in a thumbnail strip under the main image so the card stays the same height.
  const thumbs = images.slice(1).map((url, index) => `<td width="33%" valign="top" style="padding:${index ? '0 0 0 6px' : '0'}"><img src="${escape(url)}" alt="${escape(altFor(index + 1))}" width="70" style="display:block;width:100%;max-width:70px;height:auto;border:1px solid ${C.line};border-radius:6px"></td>`).join('');
  const thumbStrip = thumbs ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:6px;border-collapse:collapse"><tr>${thumbs}</tr></table>` : '';
  const preferenceNote = `<div style="margin-top:4px;font-family:${SANS};font-size:11px;line-height:16px;color:${C.muted}">${escape(preference)}</div>`;

  // Design card: image beside the specs on desktop, stacked on phones. Without an image the specs take the full width.
  const media = image ? `<td class="stack" width="46%" valign="top" style="padding:16px 8px 16px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background-color:#0b0c0f;background-image:radial-gradient(circle at 50% 40%,rgba(247,188,95,0.18) 0%,rgba(11,12,15,0) 65%);border-radius:10px"><tr><td align="center" style="padding:10px"><img src="${escape(image)}" alt="${escape(images.length > 1 ? altFor(0) : submitted ? 'Customer reference image' : `Generated ${category.toLowerCase()} design preview`)}" width="230" style="display:block;width:100%;max-width:230px;height:auto;border:0;border-radius:8px"></td></tr></table>${thumbStrip}<div style="margin-top:8px;font-family:${SANS};font-size:10px;line-height:14px;font-weight:bold;letter-spacing:0.8px;color:${C.muted}">${mediaLabel}</div>${mediaExtra ? `<div style="margin-top:2px;font-family:${SANS};font-size:11px;line-height:16px;color:${C.soft}">${escape(mediaExtra)}</div>` : ''}${submitted ? '' : preferenceNote}</td>` : '';
  const designCard = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.well}" style="${panelStyle}"><tr>${media}<td class="stack" valign="top" style="padding:16px">${column('Design specifications', designRows as Row[])}${!image && !submitted ? preferenceNote : ''}</td></tr></table>`;
  const peopleCard = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.well}" style="${panelStyle}"><tr><td class="stack" width="50%" valign="top" style="padding:16px 12px 16px 16px">${column('Customer details', customerRows)}</td><td class="stack" width="50%" valign="top" style="padding:16px 16px 16px 12px">${column('Request details', requestRows)}</td></tr></table>`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>Grow Jewelry — customer notification</title><style>@media (max-width:520px){.stack{display:block!important;width:auto!important;padding:14px 14px 0!important}.stack:last-child{padding-bottom:14px!important}.px{padding-left:16px!important;padding-right:16px!important}.hero{font-size:22px!important;line-height:28px!important}}</style></head><body style="margin:0;padding:0;background:${C.page};color:${C.text}"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(body)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="border-collapse:collapse;background:${C.page}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:100%;max-width:600px;border-collapse:separate;background:${C.card};border:1px solid ${C.line};border-radius:18px;overflow:hidden">
${row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-family:${SANS};font-size:16px;line-height:22px;font-weight:bold;color:${C.gold}"><img src="${escape(logoUrl)}" alt="Grow Jewelry" width="180" height="40" style="display:block;width:180px;max-width:100%;height:auto;border:0"><div style="margin-top:6px;font-size:12px;line-height:16px;font-weight:normal;color:${C.muted}">${escape(input.storeName)} · Owner dashboard</div></td><td align="right" valign="top" style="font-family:${SANS}"><span style="display:inline-block;padding:5px 10px;border:1px solid rgba(247,188,95,0.35);border-radius:999px;background:${C.goldTint};font-size:10px;line-height:13px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;white-space:nowrap;color:${C.gold}">&#9679;&nbsp;New request</span></td></tr></table>`, 'padding:20px 24px 16px')}
${row(`<div class="hero" style="font-family:${SANS};font-size:26px;line-height:32px;font-weight:bold;color:${C.text}">${requestTitleHtml}</div><div style="margin-top:10px;font-family:${SANS};font-size:15px;line-height:22px;color:${C.soft}">${headline}</div><div style="margin-top:7px;font-family:${SANS};font-size:13px;line-height:20px;color:${C.soft}">${escape(subline)}</div>`, 'padding:18px 24px 28px')}
${row(designCard, 'padding:0 24px 12px')}
${row(peopleCard, 'padding:0 24px 18px')}
${row(`<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${C.gold}" style="border-radius:12px;background:${C.gold}"><a href="${escape(reviewUrl)}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:14px;line-height:18px;font-weight:bold;color:${C.goldInk};text-decoration:none;border-radius:12px">Review request &rarr;</a></td></tr></table>`, 'padding:0 24px 22px')}
${row(`${escape(footer)} <a href="${escape(settingsUrl)}" style="color:${C.gold};text-decoration:underline">Manage notifications</a>`, `padding:14px 24px 18px;border-top:1px solid ${C.line};font-family:${SANS};font-size:11px;line-height:18px;color:${C.muted}`)}
</table></td></tr></table></body></html>`;
  const text = ['Grow Jewelry', requestTitle, '', body, '', ...sections.flatMap(([heading, rows]) => [heading, ...rows.map(([label, text]) => `${label}: ${text}`), '']), ...(!submitted ? [preference, ''] : []), ...(images.length ? [...images.map((url, index) => `${submitted ? 'Reference image' : 'Generated preview'}${images.length > 1 ? ` ${index + 1}` : ''}: ${url}`), ...(mediaExtra ? [mediaExtra] : []), ''] : []), `Review request: ${reviewUrl}`, '', footer, `Manage notifications: ${settingsUrl}`].join('\n');
  return emailPayloadSchema.parse({ from: input.from, to: [input.recipient], subject, html, text });
}
