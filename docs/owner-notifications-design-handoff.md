# Notifications — design handoff

Prepared October 2, 2026. Repository: `/home/rox/Documents/Coding projects/mvp-jewelry-app2`.

## Brief for the next agent

Design the store-owner Notifications feature and its transactional email to fit Grow Jewelry's existing owner dashboard. Start from the implemented Settings card and email formatter, not a blank application. The owner should quickly understand when alerts are sent, where they go, what the customer requested, and how to review that request.

The user's latest design feedback is: **“include more details from the quote request, also make the design match the owner dashboard color theme and design language.”** This feedback has been applied in the current local email draft, but the next agent can refine its hierarchy, density and presentation.

Read `README.md`, `AGENTS.md` and `SAAS_PRODUCT_MAP.md` first. Use **Account** for account scoping in code. Preserve unrelated working-tree changes. The feature is locally implemented, uncommitted and not deployed. `.claude/launch.json` was already present as unrelated untracked work.

## Product context and users

Grow Jewelry lets a store's customers design jewelry and request quotes. The owner manages incoming requests and prepares quotes in a protected dashboard. Customer generation is asynchronous: images arrive progressively, and customer contact capture may happen before or after successful generation.

These are operational alerts for store owners, not marketing messages to customers. V1 consists of a Settings section and outbound email. An in-app inbox, notification bell, customer email confirmation, SMS integration, billing alerts and campaign management have not been requested.

## Confirmed requirements

- Notify when **at least one image succeeds and contact details are captured**, even when the customer never selects preferred images.
- Notifications default **on**, including when an existing Account has no preference record.
- Email defaults to the owner's **login email**. The owner can change the notification email in Settings without changing their login.
- Allow notifications to be turned on/off in owner Settings.
- Email is available now. Show **SMS disabled and gray**, labelled **Coming soon**.
- Future channel selection should support email, SMS or both; do not imply SMS works today.
- Include more of the quote's details in the email and match the dashboard's design language.
- Use the existing Resend account. The user added `RESEND_API_KEY` to Vercel Production and Preview.

## Current implementation assumptions and boundaries

These choices were made during implementation; do not present them as separate explicit user decisions:

- Exclude owner-generated work. Server-derived origin marks requests `owner` when an authenticated owner belongs to the resolved Account. This also excludes that owner's tests on their own public storefront. Signed-out customer testing is needed to trigger an alert.
- Include the customer-uploaded reference-image quote form as a new quote request.
- One alert per newly created quote/request, not per variant, revision, polling response or repeated contact submission.
- The current eligibility query requires **name, phone and email**, all nonempty. A design without these does not yet trigger an alert.
- Do not replay historical requests or skipped alerts when notifications are switched on later.
- Send to one active owner's address per Account. Multiple recipients/staff roles are future scope.
- Exclude catalog, review, media-job and billing events from this release.

## Settings design surface

Route: `/owner/settings`, inside the existing `OwnerFrame`.

The current card follows the design wizard theme card and precedes the internal VVS pipeline settings card. It replaces the visible legacy SMS notification card; previous SMS consent records and related legal evidence are preserved.

Current contents:

1. Gold uppercase eyebrow **Notifications**; title **Customer activity**.
2. Description explaining customer design and quote-request alerts.
3. **Customer activity notifications** master switch and “One notification per new customer request.”
4. **Send notifications by**: Email selected; SMS disabled with Coming soon badge. Channel controls disable when the master switch is off.
5. **Notification email** input showing the effective address.
6. Helper: “Defaults to your login email. Changing this won't change your login.”
7. **Use login email** appears when an override is being edited; it restores the default.
8. Trigger explanation: a design plus captured contact details is enough, with no favorite required.
9. **Save notification settings** action with pending, saved and error states.

Design states to cover: default/on, off, edited/unsaved, saving, saved, invalid address, server error, no login address available, email override, and restore default. Preserve semantic labels, keyboard access, switch state, visible focus, accessible errors and narrow-screen layout. The unavailable SMS option must remain unmistakably unavailable.

The current API does not return provider setup or delivery status. Do not show a live-delivery success badge merely because preferences saved. A disabled master switch does not prevent editing the recipient for future use.

## Dashboard visual references

Inspect these live source files as the authority for styling:

- `app/owner/OwnerFrame.tsx`: shell, navigation, account identity and existing typography.
- `app/owner/settings/page.tsx`: placement among existing settings sections.
- `app/owner/settings/NotificationSettingsForm.tsx`: current feature controls.
- `app/owner/settings/DesignWizardBrandingCard.tsx`: adjacent settings-card treatment.
- `app/owner/quotes/[quoteId]/prepare/QuotePreparationForm.tsx`: quote-review context and owner action language.

Current palette and geometry:

| Role | Value |
| --- | --- |
| Main dark background / input | `#101114` |
| Email outer background | `#0d0e12` |
| Card surface | `#17191f` |
| Primary text | `#e1e2ec` |
| Secondary text | `#c2c6d6` |
| Muted labels | `#8c909f` |
| Primary gold / action | `#f7bc5f` |
| Gold action text | `#17100a` |
| Dashboard borders | white at roughly 5–10% opacity |
| Email borders | `#30323b` |
| Corners | generally 12px cards/controls; email outer card 16px |

Dashboard cards use restrained gold uppercase section labels, strong readable headings, dark inputs, soft borders and comfortable spacing. Avoid introducing a separate bright-white email brand or an unrelated visual system. Email uses Arial/Helvetica as a dependable fallback; the web dashboard's typography remains the existing application styling.

## Email content and design

Live formatter: `src/lib/notifications/email.ts`.

Review artifact: `docs/owner-notification-email-preview.html`. It was generated from the same formatter, with fictional sample data and a local Lexy style-reference image. That image says Lexy and **does not represent the sample customer's AVA design**. Do not use it as evidence of an actual generated quote. The sample link opens the general owner dashboard; real email links open the specific quote.

Generated-design title and subject: `New {product category} Design: Quote Request — {customer name}`. Reference uploads instead use `New Custom Jewelry Quote Request — {customer name}` because no design has been generated.

Current visual sequence:

1. Grow Jewelry identity and store name / Owner dashboard label.
2. Customer activity eyebrow, **New quote request** heading, short customer-action summary.
3. Image labelled **Generated preview** or **Customer reference image**.
4. Dark **Design specifications** card.
5. Dark **Customer details** card.
6. Dark **Request details** card.
7. Generated-design preference explanation when applicable.
8. Gold **Review request** action.
9. Footer explaining why the owner received it and **Manage notifications** link.

Available fields in the implemented email:

| Section | Fields |
| --- | --- |
| Design | Product category, design text, style, pendant finish, metal colors (including two-tone), material, karat, stones, diamond quality, size, emblem, color and chain. Budget and price are intentionally excluded because a quote request has no price yet. |
| Customer | Name, phone, email |
| Request | Quote reference, submitted timestamp labelled UTC, current status, notes |

Optional fields are omitted when absent. Never invent missing specifications, customer preferences, prices or completion states. Budgets are stored in cents and formatted as USD, including one-sided ranges. Quote submission time and generation completion time are different fields; the current email shows quote `createdAt` as Submitted (UTC).

For generated designs, retain the meaning of: **“Customer preference has not been recorded. This is a generated preview; all available designs are in your dashboard.”** The draft quote's image is automatically selected; it is not proof of a favorite. Favorite selection is not persisted in the current customer flow. Persisting it is a separate product change.

For uploaded-reference quotes, use the reference-submission summary and media label; omit the favorite explanation. Notes may be included for either event type.

Primary live link: `/owner/quotes/{quoteId}/prepare`, requiring owner authentication. Footer link: `/owner/settings`. No customer public quote token is used in the owner alert.

Email constraints: inline styles and presentation tables, approximately 600px maximum width, readable mobile layout, wrapping for long values, descriptive image alt text, safe HTTP(S) image URLs and a complete plain-text alternative. Escape all customer/store text. Retain the information hierarchy when an image is missing or images are blocked. Email-client rendering still needs real validation; browser appearance is not sufficient evidence of inbox behavior.

## Trigger and exception matrix

| Situation | Behavior |
| --- | --- |
| Image succeeds before contact capture | Wait; re-evaluate on contact capture. |
| Contact capture precedes successful image | Wait; re-evaluate when an image succeeds. |
| One image succeeds, another fails/is pending | One alert; later images remain in the dashboard. |
| All images fail or remain pending | No successful-design notification. |
| No favorite selected | Send once eligible; explicitly describe preview as unconfirmed. |
| Customer closes the page after eligibility | Persisted delivery survives the browser session. |
| Additional variants, revisions, repeated lead submission | No second new-request alert for the same quote. |
| A genuinely new customer request | Eligible for its own alert. |
| Owner dashboard generation / legacy request | Excluded. |
| Notifications off | New alerts are skipped; pending retries are skipped after preference recheck. |
| Notifications enabled later | Future events only. |
| Recipient changes before first attempt | Use current recipient. |
| Recipient changes after an attempted send | Stop retries; do not redirect an immutable attempted delivery. |
| Missing configuration | Fail closed; never report a successful send. |
| Provider outage/rate limit/timeout | Durable queue and bounded retries. |
| Bounce/complaint | Terminal status and address suppression. |

Turning notifications off cannot recall an email already accepted by Resend. Do not promise instant delivery or guaranteed cancellation of an in-flight email.

## Implementation map

| Concern | Files |
| --- | --- |
| Settings UI and integration | `app/owner/settings/NotificationSettingsForm.tsx`, `app/owner/settings/page.tsx` |
| Account-scoped settings API | `app/api/owner/notifications/route.ts` |
| Preference defaults, overrides and recipient | `src/lib/notifications/preferences.ts` |
| Server-derived generation origin | `src/lib/notifications/origin.ts` |
| Transactional event and background nudge | `src/lib/notifications/events.ts` |
| Generated draft-quote convergence | `src/lib/quotes/ensure-draft-quote.ts` |
| Uploaded-reference quote hook | `app/api/storefront/[accountSlug]/quote/route.ts` |
| HTML/plain-text formatter | `src/lib/notifications/email.ts` |
| Atomic delivery worker and webhook reconciliation | `src/lib/notifications/worker.ts` |
| Protected recovery endpoint | `app/api/internal/notifications/process/route.ts` |
| Signed Resend callback | `app/api/webhooks/resend/route.ts` |
| Runtime schemas | `prisma/schema.prisma`, `prisma/schema.postgres.prisma` |
| Reviewed migration, not applied to production | `prisma/postgres-migrations/20261002140000_add_owner_notifications.sql` |
| Architecture and activation instructions | `docs/owner-notifications.md` |

Generation hooks cover `app/api/{requests,picture-requests,grillz-requests,bracelet-requests,necklace-requests}/route.ts`.

Chain-only necklace requests intentionally use their selected static chain reference as the quote preview; they remain eligible for the normal customer alert after contact capture.

Preferences are existing Account-scoped `AppSetting` JSON, keyed by `{accountId}:owner_notifications_v1`; defaults are `{enabled: true, emailOverride: null, smsEnabled: false}`. Malformed settings disable delivery.

`GET /api/owner/notifications` returns preferences, `loginEmail` and effective `email`. `POST` accepts only `{enabled, emailOverride, smsEnabled: false}`. It derives Account scope from authentication and rejects SMS/cross-Account payload fields. Keep these contracts unless explicitly changing backend behavior.

`OwnerNotification` combines event/delivery persistence: unique event key, recipient/content snapshot, provider ID, attempts, expiring lease and status. `NotificationWebhookEvent` deduplicates signed provider callbacks. Quote and notification creation happen in one database transaction; external email sending happens afterward.

Delivery uses Resend idempotency keys, atomic claims, exponential backoff, at most six attempts and a 23-hour automatic retry window within Resend's 24-hour key retention. Outcomes include queued, processing, sent, delivered, skipped, failed, bounced, complained and needs_review. These are operational storage states, not a requested new dashboard UI.

## Verified provider context and launch gaps

Resend MCP was added with `codex mcp add resend --url https://mcp.resend.com/mcp` and authenticated. Read-only MCP inspection confirmed:

- `growjewelry.io` is verified, in `us-east-1`, with sending enabled.
- Receiving, open tracking and click tracking are disabled.
- A recent authentication email uses `Grow Jewelry <auth@growjewelry.io>`.
- No Resend webhooks were configured at inspection.

The user questioned the initially assumed alert sender. `NOTIFICATION_EMAIL_FROM` was removed from Vercel Production and Preview. **No notification sender is selected/configured yet.** `notifications@growjewelry.io` was recommended, not approved or installed. Do not silently reuse the auth address or claim a proposed sender is an account setting. Domain verification establishes sending capability; it does not select a particular From address for this feature.

`RESEND_API_KEY` is present in Production and Preview. Other required server configuration includes a selected `NOTIFICATION_EMAIL_FROM`, `RESEND_WEBHOOK_SECRET`, `NOTIFICATION_WORKER_SECRET` or `CRON_SECRET`, and a trusted HTTPS application URL. Never copy credentials into design artifacts or chat.

Production migration, webhook registration, frequent recovery scheduling, deployment and an authorized real test email remain outstanding. The current Vercel project is Hobby and has a daily VVS cron; it cannot provide the desired minute-level notification recovery. The immediate background nudge exists but does not replace scheduled recovery. No paid upgrade, notification cron, production migration or real owner email was performed.

## Verification already completed and remaining

- Before the latest email refinement: repository suite passed 447 tests with 5 skipped; Prisma generation and TypeScript passed.
- Latest email refinement: 19 notification tests passed, TypeScript passed and `git diff --check` passed.
- Migration was verified in isolated PostgreSQL-compatible PGlite for historical defaults, uniqueness, Account foreign keys and RLS denial for browser roles. This is not a production DB check.
- Settings was opened under the development owner session, and an email override saved successfully; it was restored to the original login-email default.
- Updated email preview has not had automated desktop/mobile visual verification: the browser tool rejected the local `file://` URL. Do not bypass that restriction. The user can refresh the existing file preview manually. No inbox/client rendering or live-send verification has occurred.

Suggested next design deliverables: polished Settings default/off/override/error states; desktop/mobile email layouts for generated and reference-image quotes; missing-field/no-image/long-text variants; and a short rationale for information hierarchy. Keep the approved trigger, honest favorite wording, Account isolation and disabled SMS behavior intact. Seek clarification only for actual new product decisions, not routine visual choices.
