# Data Model Diagrams

This document shows the current MVP data model and the proposed multi-account SaaS data model.

Format: Mermaid ER diagrams. GitHub renders these directly in Markdown, and the code blocks can also be pasted into https://mermaid.live.

## Current MVP Model

This is the model that exists in `prisma/schema.prisma` today. It is single-store and still uses a `User` row as the store/demo owner.

```mermaid
erDiagram
  USER ||--o{ REQUEST : owns
  REQUEST ||--o{ RESULT : produces
  REQUEST ||--o{ VIDEO_GENERATION : has
  REQUEST ||--o{ QUOTE_REQUEST : snapshots
  RESULT ||--o{ QUOTE_REQUEST : selected_for
  VIDEO_GENERATION ||--o{ QUOTE_REQUEST : attached_to

  USER {
    string id PK
    string storeName
    datetime createdAt
  }

  REQUEST {
    string id PK
    datetime createdAt
    string userId FK
    string productType
    string styleId
    string text
    boolean twoTone
    string primaryMetal
    string secondaryMetal
    string emblem
    string uploadFileName
  }

  RESULT {
    string id PK
    string requestId FK
    int variant
    string prompt
    string imageUrl
    string modelId
    string status
    string error
    datetime startedAt
    datetime completedAt
    int durationMs
    datetime createdAt
  }

  VIDEO_GENERATION {
    string id PK
    string requestId FK
    string sourceResultId
    string sourceImageUrl
    string prompt
    string videoUrl
    string remoteVideoUrl
    string modelId
    string providerJobId
    string status
    string error
    datetime startedAt
    datetime completedAt
    int durationMs
    datetime createdAt
  }

  QUOTE_REQUEST {
    string id PK
    string requestId FK
    string resultId FK
    string videoId FK
    string designedImageUrl
    string videoUrl
    datetime generatedAt
    string productType
    string styleId
    string text
    boolean twoTone
    string primaryMetal
    string secondaryMetal
    string emblem
    string diamondQuality
    string customerName
    string customerPhone
    string customerEmail
    string status
    int quotedPriceCents
    string quoteNotes
    datetime createdAt
  }

  LEAD {
    string id PK
    string requestId
    string name
    string phone
    string email
    datetime createdAt
  }

  APP_SETTING {
    string key PK
    string value
    datetime updatedAt
    datetime createdAt
  }
```

Current model gaps:

- `Lead` is not relationally connected to `Request`.
- `VideoGeneration.sourceResultId` stores a result id but has no Prisma relation today.
- `AppSetting` is global.
- There is no real auth model.
- There is no tenant/account boundary.
- Store owners and SaaS admin are not separate identities.
- Customers are stored only as snapshots on quote requests or loose lead rows.

## Target SaaS Model

This is the proposed complete model for the subscription SaaS version. The tenant is named `Account`.

```mermaid
erDiagram
  ACCOUNT ||--o{ ACCOUNT_MEMBERSHIP : has
  USER ||--o{ ACCOUNT_MEMBERSHIP : joins
  ACCOUNT ||--o{ CUSTOMER : owns
  ACCOUNT ||--o{ PUBLIC_SESSION : tracks
  ACCOUNT ||--o{ REQUEST : owns
  ACCOUNT ||--o{ QUOTE_REQUEST : owns
  ACCOUNT ||--o{ VIDEO_GENERATION : owns
  ACCOUNT ||--o{ MEDIA_ASSET : owns
  ACCOUNT ||--o| MEDIA_ASSET : logo
  ACCOUNT ||--o{ APP_SETTING : configures
  ACCOUNT ||--o{ USAGE_EVENT : records
  ACCOUNT ||--o{ MESSAGE : sends
  ACCOUNT ||--o{ PAYMENT : collects
  ACCOUNT ||--o{ AUDIT_LOG : audited_by
  ACCOUNT ||--o{ WEBHOOK_EVENT : billing_events

  USER ||--o{ AUTH_SESSION : authenticates
  USER ||--o{ PASSWORD_RESET_TOKEN : resets_password

  CUSTOMER ||--o{ REQUEST : starts
  CUSTOMER ||--o{ QUOTE_REQUEST : submits
  CUSTOMER ||--o{ MESSAGE : receives
  CUSTOMER ||--o{ CUSTOMER_NOTE : has

  PUBLIC_SESSION ||--o{ REQUEST : creates

  REQUEST ||--o{ RESULT : produces
  REQUEST ||--o{ VIDEO_GENERATION : has
  REQUEST ||--o{ QUOTE_REQUEST : snapshots

  RESULT ||--o{ VIDEO_GENERATION : source_for
  RESULT ||--o{ QUOTE_REQUEST : selected_for
  RESULT ||--o{ MEDIA_ASSET : image_asset

  VIDEO_GENERATION ||--o{ QUOTE_REQUEST : attached_to
  VIDEO_GENERATION ||--o{ MEDIA_ASSET : video_asset

  QUOTE_REQUEST ||--o{ MESSAGE : communicated_by
  QUOTE_REQUEST ||--o{ PAYMENT : paid_by

  USER ||--o{ AUDIT_LOG : performs
  USER ||--o{ CUSTOMER_NOTE : writes
  USER ||--o{ MESSAGE : sends_as_owner

  ACCOUNT {
    string id PK
    string name
    string ownerEmail
    string ownerPhone
    string slug UK
    string logoMediaAssetId FK
    string themeKey
    string status
    string stripeCustomerId UK
    string stripeSubscriptionId UK
    string subscriptionStatus
    datetime subscriptionCurrentPeriodEnd
    datetime trialEndsAt
    datetime createdAt
    datetime updatedAt
  }

  USER {
    string id PK
    string email UK
    string name
    string phone
    string passwordHash
    string role
    datetime emailVerifiedAt
    datetime lastLoginAt
    datetime createdAt
    datetime updatedAt
  }

  AUTH_SESSION {
    string id PK
    string userId FK
    string sessionToken UK
    datetime expiresAt
    datetime createdAt
  }

  PASSWORD_RESET_TOKEN {
    string id PK
    string userId FK
    string tokenHash UK
    datetime expiresAt
    datetime usedAt
    datetime createdAt
  }

  ACCOUNT_MEMBERSHIP {
    string id PK
    string accountId FK
    string userId FK
    string role
    string status
    datetime createdAt
    datetime updatedAt
  }

  CUSTOMER {
    string id PK
    string accountId FK
    string name
    string phone
    string email
    boolean emailConsent
    boolean smsConsent
    string status
    string source
    string tagsJson
    datetime lastActivityAt
    datetime createdAt
    datetime updatedAt
  }

  PUBLIC_SESSION {
    string id PK
    string accountId FK
    string sessionToken UK
    string ipAddress
    string userAgent
    datetime firstSeenAt
    datetime lastSeenAt
    datetime createdAt
  }

  CUSTOMER_NOTE {
    string id PK
    string accountId FK
    string customerId FK
    string authorUserId FK
    string body
    datetime createdAt
    datetime updatedAt
  }

  REQUEST {
    string id PK
    string accountId FK
    string customerId FK
    string publicSessionId
    datetime createdAt
    string productType
    string styleId
    string text
    boolean twoTone
    string primaryMetal
    string secondaryMetal
    string emblem
    string uploadFileName
    string diamondQuality
    string status
  }

  RESULT {
    string id PK
    string accountId FK
    string requestId FK
    int variant
    string prompt
    string promptMode
    string imageUrl
    string imageMediaAssetId FK
    string modelId
    string provider
    string status
    string error
    datetime startedAt
    datetime completedAt
    int durationMs
    datetime createdAt
  }

  VIDEO_GENERATION {
    string id PK
    string accountId FK
    string requestId FK
    string sourceResultId FK
    string sourceImageUrl
    string prompt
    string videoUrl
    string videoMediaAssetId FK
    string remoteVideoUrl
    string modelId
    string provider
    string providerJobId
    string status
    string error
    datetime startedAt
    datetime completedAt
    int durationMs
    datetime createdAt
  }

  QUOTE_REQUEST {
    string id PK
    string accountId FK
    string customerId FK
    string requestId FK
    string resultId FK
    string videoId FK
    string designedImageUrl
    string videoUrl
    datetime generatedAt
    string productType
    string styleId
    string text
    boolean twoTone
    string primaryMetal
    string secondaryMetal
    string emblem
    string diamondQuality
    string customerName
    string customerPhone
    string customerEmail
    string status
    int quotedPriceCents
    string quoteNotes
    datetime createdAt
    datetime updatedAt
  }

  MESSAGE {
    string id PK
    string accountId FK
    string customerId FK
    string quoteRequestId FK
    string createdByUserId FK
    string channel
    string toAddress
    string fromAddress
    string subject
    string body
    string provider
    string providerMessageId
    string status
    string error
    datetime sentAt
    datetime createdAt
  }

  MEDIA_ASSET {
    string id PK
    string accountId FK
    string ownerType
    string ownerId
    string kind
    string url
    string storageKey
    string contentType
    int byteSize
    int width
    int height
    string provider
    datetime createdAt
  }

  PAYMENT {
    string id PK
    string accountId FK
    string customerId FK
    string quoteRequestId FK
    string stripePaymentIntentId UK
    int amountCents
    string currency
    string status
    datetime paidAt
    datetime createdAt
  }

  WEBHOOK_EVENT {
    string id PK
    string accountId FK
    string provider
    string providerEventId UK
    string eventType
    string status
    string payloadJson
    datetime processedAt
    datetime createdAt
  }

  APP_SETTING {
    string id PK
    string accountId FK
    string key
    string value
    datetime updatedAt
    datetime createdAt
  }

  PLATFORM_SETTING {
    string key PK
    string value
    datetime updatedAt
    datetime createdAt
  }

  USAGE_EVENT {
    string id PK
    string accountId FK
    string actorUserId FK
    string customerId FK
    string requestId FK
    string resultId FK
    string videoGenerationId FK
    string messageId FK
    string type
    string provider
    string status
    int quantity
    int estimatedCostCents
    string metadataJson
    datetime createdAt
  }

  AUDIT_LOG {
    string id PK
    string accountId FK
    string actorUserId FK
    string action
    string targetType
    string targetId
    string metadataJson
    string ipAddress
    datetime createdAt
  }
```

## Target Ownership Rules

SaaS admin:

- Can read all accounts and all account-scoped data.
- Can monitor all provider usage and failures.
- Can disable accounts.
- Can inspect customer PII only through an intentional support/admin surface.
- Should generate `AUDIT_LOG` records for sensitive cross-account actions.

Store owner:

- Belongs to exactly one `Account` in v1.
- Can only read/write data where `accountId` matches their membership.
- Cannot edit prompt/model internals.
- Can manage their account branding, customers, quotes, videos, and billing portal.

Customer:

- Has no login in v1.
- Is anonymous until form/quote submission.
- Becomes a `Customer` record after submitting name, phone, email, or quote details.

## Subscription-Only Billing Model

Billing is subscription-only.

Do not add plan details, credit packages, overage billing, or included-credit fields yet.

Required billing fields on `Account`:

- `stripeCustomerId`
- `stripeSubscriptionId`
- `subscriptionStatus`
- `subscriptionCurrentPeriodEnd`
- `trialEndsAt`

Subscription status should gate store-owner access and expensive actions. Stripe webhooks should be the source of truth.

`USAGE_EVENT` is for SaaS admin monitoring and provider-cost visibility, not customer-facing credit accounting.

## App Setting Scope

Current `AppSetting` is global. Target `APP_SETTING` is account-scoped by default.

Some future settings may be platform-global, such as SaaS-admin model defaults. If needed, add a separate `PLATFORM_SETTING` table rather than mixing global and account rows in one ambiguous table.

## Media Strategy

Today:

- Images and downloaded videos are served from `/generated/:file`.
- Files live under `GENERATED_IMAGE_DIR`.

Target:

- Store all generated images, videos, uploaded logos, and future uploads as `MEDIA_ASSET` rows.
- `MEDIA_ASSET.accountId` enforces ownership.
- `url` is the public or signed URL the app displays.
- `storageKey` is the object-storage key for deletion/reprocessing.
- `ownerType` and `ownerId` attach media to `Result`, `VideoGeneration`, `Account`, etc.

## Request And Quote Lifecycle

```mermaid
flowchart TD
  A[Customer opens account storefront path] --> B[Account resolved by slug]
  B --> C[Customer creates pendant request anonymously]
  C --> D[Request row with accountId and publicSessionId]
  D --> E[Result rows generated asynchronously]
  E --> F[Customer or owner selects image]
  F --> G[Optional VideoGeneration]
  F --> H[Quote form submitted]
  G --> H
  H --> I[Customer row created or matched]
  I --> J[QuoteRequest linked to account/customer/request/result/video]
  J --> K[Store owner CRM and quote dashboard]
  K --> L[Email/SMS Message sent]
  L --> M[Message status tracked]
```

## Owner Dashboard Data Boundaries

```mermaid
flowchart LR
  U[Store owner user] --> M[AccountMembership]
  M --> A[Account]
  A --> C[Customers CRM]
  A --> Q[Quote Requests]
  A --> R[Requests and Results]
  A --> V[Video Generations]
  A --> S[Account Settings]
  A --> B[Stripe Billing Portal]
```

Every box after `Account` must be filtered by `accountId`.

## Migration Map From Current To Target

| Current model | Target model | Notes |
| --- | --- | --- |
| `User` | `User` + `Account` + `AccountMembership` | Current `User.storeName` becomes `Account.name`. |
| `Request.userId` | `Request.accountId`, optional `Request.customerId` | Store ownership moves from user to account. |
| `Lead` | `Customer` | Replace loose lead records with account-scoped CRM records. |
| `QuoteRequest.customerName/email/phone` | `Customer` plus quote snapshot fields | Keep snapshot fields for historical quote accuracy. |
| `Result.imageUrl` | `Result.imageUrl` plus optional `MediaAsset` | Preserve direct URL while adding media ownership. |
| `VideoGeneration.videoUrl` | `VideoGeneration.videoUrl` plus optional `MediaAsset` | Preserve local/display URL while adding media ownership. |
| `AppSetting` | account-scoped `AppSetting` | Prompt mode may be account-scoped later, but prompt/model control remains SaaS-admin-only for now. |
| none | `UsageEvent` | Adds provider-cost monitoring without billing credits. |
| none | `Message` | Required for real SMS/email quote follow-up. |
| none | `Payment` | Future quote deposit/payment tracking. |
| none | `AuditLog` | Required before serious SaaS admin support tooling. |
| none | `PublicSession` | Tracks anonymous customer sessions before form submission. |
| none | `WebhookEvent` | Stores Stripe/email/SMS webhook events for idempotent processing. |
| none | `AuthSession` / `PasswordResetToken` | Required for real owner/admin auth. |
| none | `PlatformSetting` | Keeps SaaS-admin global settings separate from account settings. |

## Implementation Notes

- Add `accountId` to child tables early and index it everywhere.
- Add compound indexes for common owner queries, such as `(accountId, createdAt)`, `(accountId, status)`, and `(accountId, customerId)`.
- Keep quote snapshot fields even after adding `Customer`; quotes should preserve what the customer submitted at that time.
- Do not let store owners edit prompt templates or model ids.
- Use path-based routing first. Custom domains can come later.
- Prefer append-only logs for usage, messages, payments, and audit records.
- Keep subscription billing separate from usage monitoring.
