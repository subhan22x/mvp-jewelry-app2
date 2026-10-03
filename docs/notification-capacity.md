# Owner notification capacity

Measured/inspected October 3, 2026. Distinguish email notifications from end-to-end AI jewelry generation.

## Current hard limits

Live Resend MCP usage reported: 100 total emails/day, 3,000/month, and 10 API requests/second. Quotas are shared with authentication and any other email sent by the account. One eligible new customer quote normally requires one notification email. Account count does not itself consume email quota.

Maximum owner alerts/day is at most `100 - other emails sent that day`, also bounded by remaining monthly quota. These are provider ceilings, not guaranteed delivery throughput. Budgeting 80 alerts/day leaves 20 for authentication/other mail:

| Stores | Quotes per store per day | Owner alerts per day |
| --- | --- | --- |
| 10 | 5 | 50 |
| 20 | 4 | 80 |
| 40 | 2 | 80 |
| 80 | 1 | 80 |

The 80/day allocation is a planning assumption, not an enforced per-Account allowance. Busy signups can need more headroom. The current worker classifies permanent Resend rejections as failed; exceeding a quota does not guarantee automatic delivery on the next quota reset. Monitor failures and upgrade the sending quota before exceeding it.

The Cloudflare scheduler makes 288 calls/day, roughly 8,640 in a 30-day month. Five claims per call yields 1,440 theoretical recovery claim slots/day, including retries/skips/contention. Immediate nudges provide additional processing. This is not a 1,440-email/day promise; the current Resend quota is lower. Cloudflare's published Workers Free allowance is 100,000 requests/day; free CPU limits still apply. The scheduler performs a small HTTP call rather than model inference or database work.

Vercel inspection confirmed Hobby, Node 24, and 300-second function timeouts. Scheduled wake-ups consume Vercel function resources and database queries too. Choosing Cloudflare for scheduling does not remove those quotas or Vercel Hobby's restriction to personal non-commercial use.

## Concurrency evidence

Disposable local Postgres tests using the actual notification processor and a mocked Resend provider:

- Eight processors competing for one row produced one provider call.
- Future retries and active leases waited; expired leases recovered.
- A simulated crash after provider acceptance reused the same frozen payload and idempotency key after lease expiry.
- Fifty Accounts with one alert each were processed by ten concurrent processors without duplicate simulated provider acceptance, in approximately 3.3 seconds including fixture creation in this test environment.

This establishes tested notification safety under a 50-Account burst. It does not establish a maximum concurrent store-owner count, real Resend latency/rate tolerance, or full app production throughput. Concurrent immediate nudges can exceed Resend's shared request rate; the durable queue handles transient 429s with retries. It cannot bypass daily/monthly quota.

## Full jewelry app capacity

The production database reports `max_connections = 60`. The local configuration points Prisma at Supabase's transaction pooler on port 6543, with `pgbouncer=true`. Those are database connection facts, not a 60-owner limit: browsing sessions do not retain a database connection continuously, and all app routes share database capacity. The exact deployed connection configuration, pooler client allowance and sustainable DB latency need separate verification/load testing.

Typical name designs generate two images, so quote volume can require about twice as many model calls before revisions. Other product families differ. Google applies model/project limits for requests, images, tokens, daily usage and possibly spend. The active project's model quotas were not retrieved in this setup, and no production AI load test was run. Image latency, R2 media traffic and video/3D provider quotas also affect the full product.

Therefore there is no defensible exact maximum for simultaneous AI-generating owners yet. A production-like staging test should exercise browsing, quote writes and polling together, stub costly providers for app-only measurements, then run a small authorized real-provider test. Capture p95 latency, errors, DB pool waits, invocation use and actual model quotas before claiming a concurrent-generation capacity.

## Growth order

1. Increase Resend sending allowance before sustained notification demand exceeds the shared free quota.
2. Measure model limits and full app load before publishing a simultaneous-design target.
3. Monitor queue age and terminal failures. Increase cron frequency/batch limits only when measured backlog requires it, retaining time bounds and provider pacing.
4. Use a Vercel plan appropriate for commercial operation; no paid plan or upgrade was purchased during this implementation.

Official references: [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/), [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Resend usage limits](https://resend.com/docs/api-reference/rate-limit).
