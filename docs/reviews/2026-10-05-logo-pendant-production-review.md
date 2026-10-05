# Logo pendant production review

Date: 2026-10-05. Scope: current uncommitted logo feature and the shared paths it uses. This is a local code review and test run, not a deployed-production audit.

## Architecture alignment

- Customer settings are validated with Zod. Prompt prose stays in `src/lib/logo-pendants/pendant.prompt`; shape/context snippets and attachment mappings stay in YAML.
- Shape values are an enum and map to repository-owned reference paths. No client-supplied local attachment paths are accepted.
- Initial generation uses the existing signed R2 upload helper, multipart fallback, shared Google connector, R2 output storage, and background scheduler. The scheduler uses Vercel `waitUntil` in production.
- Two original Results store their exact prompt and attachment paths. Pro/2K and Flash/1K run concurrently through shared variant routing. Polling waits for both, displays completed images progressively, and retains compatibility with earlier single-draft requests. Shared logo files remain available until both model tasks settle. Custom sends one image; named shapes send the uploaded logo and matching example.
- Storefront routes use `requirePublicTenantPage`; generation uses existing Account resolution and billing/signup-credit services. QR attribution, contact intake, automatic draft quotes, and owner notification delivery reuse shared code.
- Loading/contact and results use the same components as name pendants. Revisions use the existing request revision APIs and the two-revision limit.
- No schema migration, new provider SDK, or new billing/storage integration is required.

## Findings fixed during this review

1. **Access checks after upload processing:** Account/public access, QR attribution, and usage checks now precede R2 reads and image decoding, so denied requests do not spend those resources.
2. **Public error disclosure:** Unexpected setup/storage errors now return a generic 500 response. Provider failures save a generic public-facing message. Internal errors remain logged server-side; validation, storefront-access, and shared billing denials preserve appropriate responses.
3. **Image resource and format handling:** Declared MIME alone is insufficient. The API now checks the decoded format, rejects disguised SVG content, retains the 25-million-pixel input ceiling, and normalizes logos within 2048 × 2048 without enlarging smaller images. Both declared and actual upload bytes are checked against 10 MB.
4. **Shared public glob input:** The dependency audit identified the existing `fast-glob → micromatch → braces` chain. The name style registry interpolated public style IDs into glob patterns. Style IDs now allow only bounded alphanumeric, underscore, and hyphen identifiers before lookup. Tests reject traversal, wildcard, brace, and deeply nested patterns.

## Validation evidence

| Check | Result |
| --- | --- |
| `npx vitest run` | 971 passed, 10 skipped; 126 test files passed, 4 skipped |
| `npx tsc --noEmit --incremental false` | Passed |
| `npm run build` | Passed, including lint/type checks and static generation |
| Production output trace | Contains prompt, both YAML files, and all four shape reference PNGs |
| API adversarial tests | Invalid settings, inaccessible Account, billing denial, invalid bytes, disguised SVG, compressed oversized images, dishonest direct-upload size metadata, error disclosure, success/failure cleanup |
| Attachment/provider tests | Correct reference for every named shape; Custom has only the logo; Base64 decodes to the exact expected files in Google SDK payloads; Pro/2K and Flash/1K routing, partial success, progressive results, and shared-file lifetime covered |
| Browser smoke against local production build | Desktop 1440 × 1000 and mobile 390 × 844 passed; no page errors or horizontal overflow |
| Browser flow coverage | Direct-upload JSON payload, enabled About logo context, review, separate real loading/contact screen, results selection/download/preview, two revisions, Back without another generation |
| Changed-file credential-pattern scan | No matches for selected private-key, AWS, GitHub-token, or Stripe-live-key patterns; this is a limited pattern scan |
| `git diff --check` | Passed |

Browser smoke intercepted generation, leads, uploads, and revision API calls; it did not write real leads or consume paid generation credits. API tests mock persistence/billing services. Provider tests mock the Google SDK network boundary while checking actual on-disk bytes. These tests verify application behavior and request assembly, not Google's live acceptance or output quality.

## Remaining risks and pre-existing limitations

- `npm audit --omit=dev --json` reports **3 high entries** (`braces`, `micromatch`, `fast-glob`) from one existing dependency chain. It reports no available fix. Public name style ID validation mitigates the reviewed input path; this does not remove the vulnerable dependency or prove every possible consumer safe. Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm.
- The shared public upload-presign endpoint has no application-level rate limiter in this code. Anonymous generation is an intentional product feature. Existing paid usage checks happen before generation and consumption happens after success; they do not atomically reserve paid quota across concurrent requests. Edge/infrastructure protection was not inspected. These inherited abuse/cost controls deserve a separate hardening change before claiming broad security signoff.
- Shared public polling/contact/revision routes use request IDs as bearer-like capabilities rather than customer sessions. This is inherited from the name flow; ID secrecy and customer-link handling remain important. Favorites remain local UI state, as in the name flow.
- Large multipart fallback uploads may exceed the hosting request-body limit. Production depends on correctly configured R2 signed uploads and CORS; live production upload configuration was not exercised.
- Provider calls and deployed Account isolation were not exercised against live services. Environment-dependent integration tests remain skipped.
- Build warnings remain in `app/internal/generations/page.tsx` for nonexistent default exports from registry/text-reference; these are pre-existing and do not fail the build. Browserslist data is outdated.
- Deployment packaging is verified locally. No deployment or remote production configuration change was made.

## Assessment

The logo implementation aligns with existing product architecture and passes the local regression/build/browser checks. No unresolved feature-specific critical defect was found in this review. The dependency findings and shared public-flow abuse controls remain explicit launch risks; passing tests are not a claim that the entire application is vulnerability-free. A deployed smoke test of a real signed upload and generation remains outstanding.
