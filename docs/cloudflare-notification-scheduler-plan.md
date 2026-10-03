# Cloudflare notification scheduler: implementation and test plan

Prepared October 3, 2026. This records the reviewed implementation plan. Implementation and deployment now exist; see `workers/owner-notification-scheduler/README.md` and `docs/owner-notifications.md` for current operations and validation status.

## Architecture and scope

Keep the existing flow: customer eligibility → transactional QuoteRequest + OwnerNotification → immediate background send. Add a Cloudflare scheduled Worker every five minutes that calls the existing protected Vercel notification processor. Postgres remains the queue; Vercel remains the email processor; Resend remains delivery and webhook tracking.

The scheduler recovers due notifications and expired leases. It cannot recover image generation that stopped before a quote/event existed. No change to email design, customer eligibility, chain-only necklace behavior, SMS, VVS Studio scheduling, or historical replay. No database migration is expected.

## 1. Isolated scheduler package

Proposed directory: `workers/owner-notification-scheduler/`, with its own `package.json`, lockfile, TypeScript config, `wrangler.jsonc`, `src/index.ts`, and runtime tests. Keep Workers dependencies isolated from Next.js. Exclude these tests from the root jsdom Vitest suite; add explicit root scripts for scheduler checks if helpful.

Use Wrangler configuration as the source of truth for cron. Production: `*/5 * * * *`; staging/local: no automatic cron initially. Disable workers.dev and preview URLs; the Worker needs a scheduled handler only. Enable Workers logs. Pin a compatibility date and compatible Wrangler/Vitest/plugin versions at implementation time.

Bindings:

- `NOTIFICATION_PROCESS_URL`: exact canonical HTTPS endpoint, initially `https://growjewelry.io/api/internal/notifications/process`.
- `NOTIFICATION_WORKER_SECRET`: encrypted Cloudflare secret matching Vercel's dedicated notification secret.

Cloudflare needs no Resend API key, database credentials, R2 binding, or customer payload. Validate the URL, require the exact processor path and a configured trusted origin, and reject credentials/query parameters. Reject redirects so the authorization token cannot follow an unexpected destination.

## 2. Scheduler execution

Await one POST per scheduled invocation with Bearer authentication, JSON `{ "limit": 5 }`, and a 180-second timeout. This timeout is a client bound, not a guarantee that Vercel stops processing when the request is aborted.

Validate both HTTP success and the response contract: `configured === true`, integer `processed` between zero and five. Treat missing configuration, non-2xx, redirects, malformed/unexpected JSON, and network/timeout failures as failed invocations. Log sanitized error codes and throw a sanitized error so failure remains visible in Cloudflare. Never log response bodies, authorization headers, secrets, email addresses, or quote data.

Log run time, duration, HTTP status, and processed count. `processed` means claimed deliveries, not delivered emails; provider delivery remains observable through notification states and Resend webhooks. Do not blindly retry the HTTP call in the same invocation. The next scheduled run and existing database leases/idempotency handle recovery.

Five items limits slow-provider exposure and normally drains a recovery backlog at up to 60 claims/hour in addition to immediate sends. Measure backlog before increasing frequency or batch size. Five minutes is a target recovery polling interval, not a delivery SLA.

## 3. Vercel endpoint changes

Extend authenticated POST to accept a strict optional batch limit, bounded to 1–5 when supplied. Reject invalid bodies with 400 before processing. Preserve the existing default and GET behavior for current callers. Cloudflare always supplies five; immediate background nudges already use five.

Retain constant-time secret authentication and configuration failure reporting. Add a batch execution deadline: stop claiming new deliveries when insufficient function time remains for another bounded provider request. Leave remaining rows for the next invocation. Keep existing per-delivery leases, frozen payload, Resend idempotency key, six-attempt cap, and 23-hour retry window.

The existing 20-item default can spend up to 400 seconds on provider requests alone, beyond the route's 300-second limit. Five items improves the scheduled path, while the execution deadline also bounds other callers. Database stalls still need operational monitoring; a deadline between claims cannot interrupt every database operation.

## 4. Tests

Use Cloudflare's current Workers Vitest integration (`@cloudflare/vitest-plugin`) in the isolated package, running locally in the Workers runtime with mocked outbound HTTP. Do not contact production from automated tests.

| Layer | Cases and required result |
| --- | --- |
| Scheduled handler | Correct POST URL, token, limit and awaited completion; valid empty/busy responses succeed. |
| Scheduler failures | 401/403/429/5xx, redirect, timeout/network rejection, malformed JSON, invalid count, HTTP 200 with configured=false all fail visibly without leaking secrets or bodies. |
| Bindings/config | Missing secret/URL and invalid or unexpected destination reject before fetch; production schedule is five minutes; staging schedule absent; no public invocation route. |
| Processor route | Missing/wrong token rejects without DB/provider work; supplied limits 1–5 pass through; invalid limits/body reject; existing no-body/GET callers remain compatible. |
| Processing deadline | Fake time advances between deliveries; no new claim after the time budget, and unprocessed rows remain recoverable. |
| Durable recovery | Queued due item sends; future nextAttemptAt and active lease are skipped; expired lease is reclaimed. |
| Concurrency/crash | Two processors race on the same real Postgres row: one claim. Crash after provider acceptance before DB persistence: lease recovery reuses the exact payload and idempotency key. Assert one simulated provider acceptance. |
| Retry/terminal states | 429/5xx/timeouts queue with backoff; permanent rejection fails; exhausted attempts/window enter needs_review; disabled/changed recipient stops sending; skipped historical items remain skipped. |
| Trigger regressions | Image-before-contact and contact-before-image both enqueue once; partial success/no favorite sends once; all failed/pending does not; valid uploaded references enqueue once; dashboard/public owner work excluded; Account boundaries preserved. |
| Delivery tracking | Valid signed delivered event updates the matching delivery; duplicates and early webhooks reconcile; tampered signatures reject; bounce/complaint suppression stays Account-scoped. |

Reuse and extend existing notification, ensure-draft-quote, storefront quote, and webhook tests. Their mocks cover many behaviors already; use a disposable Postgres instance for new race/crash integration tests, applying the relevant schema/migrations there. Never mutate production data for integration testing.

Verification order: scheduler runtime tests → affected app tests → type checks for both packages → Worker deployment dry run → app production build → full suite once before rollout. Check actual installed APIs before writing test configuration.

## 5. Rollout and acceptance

1. Recheck live deployment/schema/env state. Earlier session work applied the production migration and configured sender/worker secret, but the existing owner-notifications document is stale. Verify rather than treating that document as live truth. Update it with confirmed state and this five-minute scheduler.
2. Deploy the Vercel endpoint changes first. Complete the Resend signed webhook/signing-secret setup before delivery acceptance testing.
3. Deploy Cloudflare with cron disabled and the dedicated secret. If the current secret cannot be retrieved securely, coordinate a rotation across Vercel and Cloudflare before enabling cron. Preview/staging uses a separate secret and target.
4. Run a manual scheduled smoke test against staging and an isolated test Account. Any real delivery uses only an explicitly authorized test address; do not replay historical requests.
5. Enable the production cron in Wrangler, allow propagation, then verify an actual scheduled invocation in Cloudflare and corresponding Vercel logs. Cloudflare documents up to 15 minutes for trigger configuration propagation.
6. Confirm one controlled eligible request creates one event, one Resend message, and a signed delivered webhook. Verify a deliberately deferred due event is recovered by a scheduled run and that opting out suppresses sending. Track old queued rows and needs_review separately; successful polling alone does not prove successful email delivery.

Acceptance: new eligible customer requests send promptly through the immediate path; persisted missed/retry work is picked up by the next successful scheduled run; concurrent workers do not duplicate provider acceptance within the idempotency window; no owner work/historical replay; configuration failures remain visible; no secrets/PII in scheduler logs.

Rollback: disable the cron in Wrangler and redeploy. Configuration removal can take time to propagate, so queue safety must tolerate an extra invocation. Keep immediate delivery and persisted queue intact. Resume later using the same records and retry policy.

## Official implementation references

- [Cron triggers and propagation](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Encrypted Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Current Workers Vitest integration](https://developers.cloudflare.com/workers/testing/vitest-integration/)

Before Vercel deployment work, upgrade the currently outdated CLI with `npm i -g vercel@latest` (installed 59.11.7; session advisory recommends 62.2.0 or newer).
