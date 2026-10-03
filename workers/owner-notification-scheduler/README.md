# Owner notification recovery scheduler

This scheduled-only Cloudflare Worker wakes the Vercel notification processor every five minutes. It does not send email or access Postgres. Immediate background delivery stays in the Next.js app.

## Local verification

From the repository root:

```sh
npm --prefix workers/owner-notification-scheduler ci
npm run test:notification-scheduler
npm run check:notification-scheduler
npm --prefix workers/owner-notification-scheduler run dry-run
```

Tests run locally in the Workers runtime with outbound requests mocked. Development has no cron, workers.dev endpoint, or preview URL.

For the app's real Postgres recovery tests, start a disposable local Postgres database named `notification_tests`, initialize it with the current Prisma schema, then run:

```sh
NOTIFICATION_TEST_DATABASE_URL=postgresql://postgres:local-test-only@127.0.0.1:55432/notification_tests npm run test:notification-recovery
```

The script refuses a non-local database or another database name. It applies the additive notification migration, creates fictional fixtures, exercises competing claims, future/expired leases, provider-acceptance crash recovery and a 50-Account burst, and cleans its records. It never calls real Resend. Provider deduplication is simulated; this is a correctness test, not a production throughput benchmark.

## Deployment

Use the existing Cloudflare account and `wrangler login`. `wrangler.jsonc` is the source of truth for the production schedule. Configure `NOTIFICATION_WORKER_SECRET` as an encrypted Worker secret matching Vercel Production's dedicated secret; never commit it or share it in chat. Cloudflare does not receive the Resend key, webhook secret, database URL, or customer data.

For a new installation, keep production `triggers.crons` temporarily empty and deploy code plus the secret atomically using Wrangler's `--secrets-file` with a local ignored file. Verify the Vercel endpoint before restoring the cron and deploying. On an existing Worker, use `wrangler secret put NOTIFICATION_WORKER_SECRET --env production` to update the secret. `wrangler secret put` can deploy a new version, so keep cron disabled during setup. Production declares this secret required. Non-secret bindings are the exact HTTPS processor URL and trusted origin.

```sh
npm --prefix workers/owner-notification-scheduler run deploy
```

The production processor is `https://growjewelry.io/api/internal/notifications/process`. Each scheduled invocation POSTs `{ "limit": 5 }` with Bearer authentication, refuses redirects, and waits up to 180 seconds. The app stops claiming new deliveries as its 150-second batch budget runs low. The database retains due work for the next run.

HTTP errors, invalid JSON/counts and `configured:false` are invocation failures. Logs contain only timing, HTTP status, claimed count or a sanitized error code. `processed` counts claimed rows, not delivered mail; inspect OwnerNotification states and signed Resend webhooks for delivery truth.

```sh
npx wrangler tail grow-jewelry-notification-scheduler-production --format json
```

## Operations and rollback

Check failed invocations, queued rows older than 15 minutes, expired processing leases, and `needs_review` deliveries. Provider quota failures can be permanent even when the scheduler invocation succeeds. These checks are a manual runbook; no external alerting service is provisioned.

At five claims per five-minute run, recovery has 1,440 theoretical claim slots/day; retries and contention consume slots. Immediate nudges also send. The current Resend account has a much lower 100-email/day and 3,000-email/month shared quota. See `docs/notification-capacity.md`.

Rollback by setting production `triggers.crons` to `[]` and redeploying. Leave queue records and the immediate sender intact. Cron updates may take up to 15 minutes to propagate, so one more safe invocation can occur. Rotate the dedicated secret in Vercel and Cloudflare together; Vercel requires a deployment to activate environment changes.

References: [Cron triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Workers testing](https://developers.cloudflare.com/workers/testing/vitest-integration/).
