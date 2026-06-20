# Authentication And Current System Handoff

This document is the implementation handoff for the current application. It is intentionally detailed so another engineer or coding agent can debug authentication behavior without reconstructing the project history first.

## Executive Summary

The application is a Next.js 15 App Router project for jewelry-store owners and their customers.

It currently has:

- A responsive marketing landing page at `/`.
- A customer pendant-design entry page at `/design`.
- Customer name-pendant and picture-pendant generation flows.
- Public store profiles at `/s/:accountSlug`.
- Public review and quote forms.
- An authenticated owner dashboard at `/owner`.
- Owner-facing profile, collections, reviews, quote review, video jobs, and VVS Studio pages.
- Supabase Postgres as the Prisma runtime database.
- Supabase Auth for owner email/password signup, email confirmation, login, session refresh, and logout.
- Cloudflare R2 support for media, with remaining local-disk fallback paths that still need production hardening.

The application is not fully production SaaS-ready yet. The most important remaining tenant gap is that customer pendant-generation endpoints still resolve the seeded demo account by default. Owner dashboard reads and writes are account-scoped correctly.

## Runtime Stack

| Area | Current implementation |
| --- | --- |
| Web framework | Next.js 15 App Router, React 18, TypeScript |
| Database ORM | Prisma 6 |
| Runtime database | Supabase Postgres |
| Authentication | Supabase Auth with cookie-backed SSR sessions |
| Auth client libraries | `@supabase/ssr`, `@supabase/supabase-js` |
| Generated image provider | Gemini |
| Video provider | Wavespeed / Seedance |
| Image processing | `sharp` |
| Durable media target | Cloudflare R2 |
| Development media fallback | Local `public/generated` or `GENERATED_IMAGE_DIR` |
| Production host direction | Vercel Node functions, Cloudflare DNS and R2, Supabase Postgres |

## Route Map

### Marketing And Customer Routes

| Route | Purpose |
| --- | --- |
| `/` | Responsive marketing landing page. |
| `/design` | Product-format entry page for the pendant design experience. |
| `/pendants` | Pendant format selection. |
| `/pendants/nameplates` | Nameplate design route. |
| `/name` | Main custom name-pendant builder. |
| `/picture-pendants` | Picture-pendant builder. |
| `/coming-soon` | Placeholder for unavailable formats. |
| `/onboarding` | Store-owner onboarding wizard, including email/password credentials as the last step. |
| `/login` | Owner email/password login. |
| `/auth/check-email` | Confirmation guidance after signup when email verification is required. |
| `/auth/callback` | Supabase PKCE/email-confirmation callback that exchanges the code and activates pending owner records. |
| `/s/:accountSlug` | MVP redirect into `/s/:accountSlug/design` after validating the store. |
| `/s/:accountSlug/design` | Public QR design entrypoint with tenant attribution. |
| `/s/:accountSlug/review` | Public customer review form. |
| `/s/:accountSlug/quote` | Public general quote form. |

### Owner Routes

All `/owner/**` pages are protected by `app/owner/layout.tsx`.

| Route | Purpose |
| --- | --- |
| `/owner` | Quote and generated-draft review dashboard. |
| `/owner/account` | Owner account settings, including prompt mode. |
| `/owner/profile` | Hidden-MVP store-profile editor. Direct URL still works. |
| `/owner/collections` | Hidden-MVP product-piece and collections manager. Direct URL still works. |
| `/owner/reviews` | Hidden-MVP review dashboard and request-review sharing pane. Direct URL still works. |
| `/owner/videos` | Owner-generated pendant video jobs. |
| `/owner/videos/:videoJobId` | Video status, download, and sharing page. |
| `/owner/vvs-studio` | VVS Studio multi-step jewelry asset workflow. |

### Internal Route

| Route | Purpose |
| --- | --- |
| `/internal/generations` | Raw generation-review page used during internal development. |

## Database Architecture

The runtime Prisma source of truth is `prisma/schema.prisma`. It uses Supabase Postgres.

Related schema files:

- `prisma/schema.postgres.prisma`: Postgres mirror used by `npm run supabase:push`.
- `src/server/db/schema.prisma`: compatibility mirror for earlier code paths.
- `prisma/schema.sqlite.prisma`: archived SQLite source schema used only by migration/audit utilities.
- `src/server/db/schema.sqlite.prisma`: archived SQLite compatibility mirror.
- `prisma/postgres-baseline/0001_initial.sql`: clean Postgres baseline for a fresh project.

Do not add Postgres-only fields to the archived SQLite mirrors unless the archived SQLite database is migrated too. The archived database is retained as migration evidence, not as the application runtime.

### Tenant And Identity Models

The current identity boundary is:

```text
Supabase Auth user
  -> User.authUserId
  -> AccountMembership.userId
  -> AccountMembership.accountId
  -> Account
```

Relevant Prisma models:

| Model | Responsibility |
| --- | --- |
| `User` | Application-side user record. `authUserId` links to Supabase Auth. |
| `Account` | Store tenant. Owns storefront, generation, quotes, reviews, and VVS Studio rows. |
| `AccountMembership` | Joins a user to an account. Current role is `owner`; current active state is `status = "active"`. |
| `StoreProfile` | Public-facing store profile. |

`User.passwordHash` still exists as a legacy field but new authentication uses Supabase Auth. Do not write new passwords into Prisma.

### Main Business Domains

| Domain | Models |
| --- | --- |
| Pendant generation | `Request`, `Result`, `ResultRevision`, `Lead`, `VideoGeneration`, `QuoteRequest` |
| Public storefront | `StoreProfile`, `StoreService`, `ProductCollection`, `Product`, `StoreReview` |
| Owner configuration | `AppSetting` |
| VVS Studio | `VvsStudioShoot`, `VvsStudioUpload`, `VvsStudioImageGeneration`, `VvsStudioVideoGeneration` |

Every owner-facing query must use the authenticated `accountId`. Do not use a global account fallback in owner routes.

## Supabase Auth Implementation

### Environment Variables

Authentication requires:

```env
NEXT_PUBLIC_SUPABASE_URL="https://PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SECRET_KEY="sb_secret_..."
```

Rules:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is browser-safe.
- `SUPABASE_SECRET_KEY` is server-only. Never expose it through `NEXT_PUBLIC_`, client components, logs, docs with real values, or chat.
- `.env.local` is ignored by Git.
- `.env.example` contains placeholders only.

### Supabase Client Files

| File | Responsibility |
| --- | --- |
| `src/lib/supabase/env.ts` | Validates and reads Supabase environment values. |
| `src/lib/supabase/client.ts` | Creates the browser Supabase client used by login. |
| `src/lib/supabase/server.ts` | Creates cookie-backed SSR client and server-only admin client. |
| `src/lib/supabase/middleware.ts` | Refreshes Supabase sessions and writes updated cookies. |
| `middleware.ts` | Applies session refresh middleware outside static assets. |

The middleware calls `supabase.auth.getUser()` so expired access tokens can be refreshed using cookies before route code runs.

### Owner Context Resolution

`src/lib/auth/owner-context.ts` is the authorization boundary for owner pages and APIs.

`getOwnerContext()`:

1. Confirms Supabase Auth browser/server values exist.
2. Calls server-side `supabase.auth.getUser()`.
3. Reads `User` by `authUserId`.
4. Reads the oldest membership where both membership and account have `status = "active"`.
5. Returns `{ authUserId, userId, accountId, email }`.

`requireOwnerContext()` redirects to `/login?next=/owner` if no active owner context exists.

The deterministic oldest-membership rule is acceptable while the product is one-store-per-login. If multi-store switching is introduced, replace it with an explicit current-account selection.

### Page Protection

`app/owner/layout.tsx` runs for all owner pages:

```ts
if (!await getOwnerContext()) redirect("/login?next=/owner");
```

Owner APIs call `getOwnerContext()` and return `401` or `403` when missing. They scope reads and writes with `owner.accountId`.

### Email And Password Signup

Owner signup is integrated into the final step of `/onboarding`.

`POST /api/onboarding`:

1. Parses onboarding fields and uploads.
2. Checks Prisma for duplicate account slug and duplicate application email.
3. Constructs the Supabase admin client early so a missing secret fails before account persistence.
4. Saves uploaded profile/product media.
5. Calls Supabase browser-safe signup with email, password, and `emailRedirectTo = /auth/callback?next=/owner`.
6. Creates an `Account`, `StoreProfile`, owner `AccountMembership`, and `User.authUserId`.
7. Creates baseline services and product collections.
8. Creates initial products.
9. If Prisma persistence fails after Supabase signup, attempts to delete the Supabase Auth user so the signup can be retried.

If Supabase returns an active session immediately:

- account status becomes `active`
- membership status becomes `active`
- storefront becomes published

If email confirmation is required:

- account status becomes `pending_verification`
- membership status becomes `pending_verification`
- storefront remains unpublished

### Email Confirmation Callback

`GET /auth/callback`:

1. Reads the `code` and optional `next` values.
2. Calls `exchangeCodeForSession(code)`.
3. Finds the application `User` by `authUserId`.
4. Activates all pending memberships for that user.
5. Activates their corresponding accounts.
6. Publishes their store profiles.
7. Redirects through `safeInternalPath(next)`.

`src/lib/auth/redirect.ts` rejects protocol-relative redirects such as `//evil.example` and falls back to `/owner`.

### Login

`app/login/LoginForm.tsx`:

1. Calls `supabase.auth.signInWithPassword({ email, password })` in the browser.
2. Fetches `/api/auth/session`.
3. `/api/auth/session` resolves `getOwnerContext()`.
4. If no active application membership is linked, the browser signs out again and shows a clear error.
5. Otherwise it redirects to a safe internal path, defaulting to `/owner`.

The login UI includes a disabled phone OTP tab. Phone OTP is intentionally not implemented until the SMS provider is configured.

### Logout

`POST /api/auth/logout` calls Supabase `signOut()` and redirects to `/`.

### Removed Legacy Auth

The old shared owner access-code gate was removed. Do not restore `OWNER_ACCESS_CODE`.

Deleted legacy files include:

- `app/api/owner-auth/route.ts`
- `app/owner/OwnerLoginForm.tsx`
- `app/owner/_auth.ts`
- `src/lib/owner-auth.ts`

## Development Owner Account

The seeded demo account is intentionally public-only. It exists to make `/s/demo` and customer demos usable. It is not a real Supabase login.

To create your own development owner login, use:

```bash
DEV_OWNER_EMAIL="you@example.com" \
DEV_OWNER_PASSWORD="choose-a-local-password" \
DEV_OWNER_ACCOUNT_SLUG="dev" \
DEV_OWNER_STORE_NAME="Your Development Store" \
npm run auth:provision-dev-owner
```

You can place these values in ignored `.env.local` instead:

```env
DEV_OWNER_EMAIL="you@example.com"
DEV_OWNER_PASSWORD="choose-a-local-password"
DEV_OWNER_ACCOUNT_SLUG="dev"
DEV_OWNER_STORE_NAME="Your Development Store"
```

Then run:

```bash
npm run auth:provision-dev-owner
```

The provisioning script:

1. Loads `.env.local`.
2. Requires `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `DEV_OWNER_EMAIL`.
3. Finds or creates the Supabase Auth identity.
4. Confirms email automatically for this development bootstrap path.
5. Updates the Supabase password only when `DEV_OWNER_PASSWORD` is supplied.
6. Finds or creates the matching Prisma `User`.
7. Links `User.authUserId`.
8. Finds or creates the account slug.
9. Activates the account and owner membership.
10. Creates or publishes a minimal `StoreProfile`.
11. Ensures baseline product collections exist.

The script is idempotent. Re-running it repairs the same linked owner instead of creating duplicate records.

Security notes:

- Use this script only against your development Supabase project.
- Do not commit a real development password.
- Do not paste the password into chat.
- This provisions a normal store owner, not a platform-wide superadmin.
- A future platform-admin console should use a separate authorization capability, not a magic development login.

An alternative is to use the real `/onboarding` flow with your email and confirm the email. That is closer to production behavior and should also be tested.

## Supabase Dashboard Setup

In the Supabase dashboard:

1. Open the target project.
2. Go to `Authentication`.
3. Go to `URL Configuration`.
4. Set the local Site URL to:

```text
http://localhost:3000
```

5. Add exact local redirect URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
```

6. Add the deployed callback URL when production is available:

```text
https://your-domain.example/auth/callback
```

The `3001` entry is useful when local port `3000` is occupied and development runs with `PORT=3001 ./run.sh`.

Use exact production callback URLs. Broad wildcards are useful for local previews but should not replace exact production configuration.

## Google And Apple Social Login

Social OAuth is not wired into the application UI yet. Supabase provider configuration alone is not enough because this application must also create or link Prisma tenant records.

### Recommended OAuth Architecture

For both Google and Apple:

1. Add social buttons to `/login` and the onboarding credential step.
2. Start OAuth with `supabase.auth.signInWithOAuth`.
3. Redirect to an application callback such as `/auth/oauth-callback?next=/owner`.
4. Exchange the PKCE code for a Supabase session.
5. Resolve `User.authUserId`.
6. If an active membership exists, continue to `/owner`.
7. If there is a Supabase Auth identity but no Prisma `User` or account, continue to onboarding completion.
8. At onboarding completion, create `Account`, `StoreProfile`, `User`, and `AccountMembership` using the authenticated Supabase user ID. Do not create a password signup.
9. Check for existing application users by both `authUserId` and normalized email before creating anything.

The current `/auth/callback` assumes the Prisma onboarding records already exist because it was built for email confirmation. Do not reuse it unchanged for a brand-new OAuth signup. Either generalize it carefully or add `/auth/oauth-callback`.

Example browser call:

```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/auth/oauth-callback?next=/owner`
  }
});
```

Apple uses the same shape with `provider: "apple"`.

### Google Provider Setup

1. Create or select a Google Cloud project.
2. Configure Google Auth Platform branding, audience, and scopes.
3. Create a Web application OAuth client.
4. Add authorized JavaScript origins such as:

```text
http://localhost:3000
https://your-domain.example
```

5. Add the Supabase callback URL shown on the Supabase Google provider page:

```text
https://PROJECT_REF.supabase.co/auth/v1/callback
```

6. In Supabase dashboard, go to `Authentication` -> `Providers` -> `Google`.
7. Enable Google and enter the Google client ID and client secret.
8. Add your application OAuth callback URL to Supabase `Authentication` -> `URL Configuration`.

### Apple Provider Setup

Apple web OAuth requires an Apple Developer account.

1. Create an App ID in Apple Developer Console and enable Sign in with Apple.
2. Create a Services ID for the web app.
3. Configure Website URLs on the Services ID.
4. Use the Supabase-hosted domain and callback:

```text
Domain: PROJECT_REF.supabase.co
Callback: https://PROJECT_REF.supabase.co/auth/v1/callback
```

5. Create a signing key and securely retain the `.p8` file.
6. Generate the Apple client secret.
7. In Supabase dashboard, go to `Authentication` -> `Providers` -> `Apple`.
8. Enable Apple and enter the Services ID and generated secret.
9. Add your application OAuth callback URL to Supabase `Authentication` -> `URL Configuration`.

Apple requires web OAuth secret rotation every six months. Put this on a recurring operational calendar. If the rotation is missed, Apple login stops working.

Apple also only provides the full name during the first authorization in some flows. Do not rely on Apple metadata as the store name; onboarding should still ask for the business name.

### Identity Linking Caution

Test these cases before launch:

- Existing email/password owner signs in with Google using the same email.
- Existing Google owner later uses email/password recovery.
- Apple private-relay email creates a distinct identity.
- OAuth identity returns an email already attached to a different application user.
- User abandons OAuth onboarding after the Supabase identity exists but before `AccountMembership` is created.

Do not silently merge accounts based only on an email string unless the Supabase identity and application state are unambiguous.

## Current Tenant Safety

### Correctly Scoped Owner Behavior

Owner pages and owner APIs resolve `owner.accountId` through Supabase session context. This includes:

- profile editor
- collections manager
- reviews dashboard
- owner settings
- quote updates
- owner video jobs
- VVS Studio shoots, uploads, image generations, and videos

Prompt mode settings use an account-prefixed `AppSetting.key` because the current schema still makes `AppSetting.key` globally unique:

```text
${accountId}:name_prompt_mode
```

### Remaining Demo-Account Behavior

The following customer-generation endpoints still use `getDefaultAccountId()` and typically resolve `demo-account`:

- `POST /api/requests`
- `POST /api/picture-requests`
- `POST /api/leads` when no linked request determines the account

This means owner auth is tenant-aware, but customer design links are not fully storefront-aware yet. Production fails closed unless `DEFAULT_ACCOUNT_ID` is configured explicitly.

Before paid SaaS launch:

1. Add an account/storefront identifier to public design entry URLs.
2. Resolve and validate the storefront account server-side.
3. Persist that account through requests, results, leads, quote snapshots, revisions, and videos.
4. Add tests proving one store cannot see or mutate another store's records.
5. Remove production reliance on `DEFAULT_ACCOUNT_ID`.

## Public Storefront

`/s/:accountSlug` reads an active account with a published profile.

Public profile data includes:

- profile image
- display name
- headline and bio
- phone and WhatsApp number
- Instagram handle
- website
- address
- two optional extra links
- status and verification labels
- products grouped by category
- reviews link

Products use a single cover image today. `Product.isActive` is the draft/published switch.

`StoreReview` persists public reviews. Review submitters provide their name, review text, rating, and at least one contact path.

## Quote Flow

Customer pendant flows create `QuoteRequest` snapshots. The owner dashboard displays generated images and quote-relevant selections.

Owner quote overrides include:

- estimated delivery
- quote material
- quote material karat
- quote stone type
- quoted price
- quote notes

Manual delivery is intentional for now:

- copy prepared message
- open device share sheet

Twilio and email delivery are not wired yet. A manual share action must not claim confirmed SMS delivery.

## Media Storage

Current durable media references are URL strings on owning rows.

R2 support exists, but local-disk fallback paths remain. Production hardening still needs:

1. Require R2 credentials in production.
2. Route all durable profile uploads, product images, generated images, revisions, VVS Studio output, and videos to R2.
3. Keep local filesystem use only for temporary `sharp` processing.
4. Add a custom R2 media domain.
5. Add cleanup rules for replaced/orphaned objects.
6. Consider a centralized `MediaAsset` table when ownership and lifecycle rules are implemented.

## Operational Commands

```bash
npm install
npm run prisma:generate
npm run supabase:push
npm run db:seed
npm run auth:provision-dev-owner
./run.sh
PORT=3001 ./run.sh
KILL_PORT=1 ./run.sh
npm test
npm run build
npm run supabase:audit
npm run supabase:audit-rls
```

`db:seed` is safe to rerun and maintains `/s/demo`. It does not create a Supabase Auth login.

## Debugging Checklist

### Login Redirects Back To Login

Check:

1. Supabase auth cookies exist.
2. `NEXT_PUBLIC_SUPABASE_URL` and publishable key are loaded by the dev server.
3. Supabase user exists.
4. Prisma `User.authUserId` matches Supabase user ID.
5. `AccountMembership.status = "active"`.
6. `Account.status = "active"`.
7. `/api/auth/session` returns `200`.

### Confirmation Link Fails

Check:

1. Supabase `Authentication` -> `URL Configuration`.
2. Local or production `/auth/callback` URL is allow-listed.
3. Email template respects `redirectTo` if customized.
4. Application user exists with the Supabase `authUserId`.
5. Membership is `pending_verification`.

### Onboarding Creates Supabase User But No App Account

The route attempts cleanup if Prisma persistence fails. Check server logs, media-storage configuration, uniqueness conflicts, and whether cleanup itself failed. Supabase dashboard user list can reveal orphaned identities.

### Owner Sees Another Store's Data

Treat this as a release-blocking bug. Find the route and verify every Prisma query includes `owner.accountId`. Do not patch by changing the seeded default account.

### Customer Generation Lands Under Demo Store

That is currently expected for the remaining unscoped design APIs. Implement storefront-aware design links before onboarding paying stores.

## Known Product Gaps Before Paid Launch

- Password reset and account recovery.
- Google and Apple OAuth UI and OAuth onboarding completion path.
- Storefront-aware customer design links.
- Stripe checkout, seven-day trial state, webhooks, entitlement gating, and billing portal.
- R2-only durable writes in production.
- Normal Postgres migration workflow after early `prisma db push` iteration.
- Account-level authorization tests across public and owner APIs.
- Error tracking, uptime monitoring, backup verification, and restore drills.
- A deliberate platform-admin authorization model if a SaaS operator console is needed.

## External References

- Supabase SSR client setup: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase Google login: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase Apple login: https://supabase.com/docs/guides/auth/social-login/auth-apple
