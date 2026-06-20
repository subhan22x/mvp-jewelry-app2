# Store Owner Profile And Onboarding

## MVP Visibility Note

Profile, collections, and reviews are preserved for the product roadmap but hidden from normal MVP navigation.

- `/s/:slug` validates the active/published store and redirects to the public design entrypoint.
- `/s/:slug/design` is the QR-code design URL for anonymous customers.
- `/s/:slug/review` and `/s/:slug/quote` remain accessible by direct URL.
- `/owner/profile`, `/owner/collections`, and `/owner/reviews` remain accessible by direct URL for internal/admin work.
- Onboarding and APIs still collect profile, product, collection, and review data so future storefront work does not lose context.

## Decisions

- Reserved public profile URL: `/s/:slug`. During the MVP this route redirects to the tenant-aware public design flow.
- Reserved public QR design URL: `/s/:slug/design`.
- Store owners edit their public profile at `/owner/profile`.
- `/profile` redirects signed-in owners to `/owner/profile`; `/profile/:slug` redirects to `/s/:slug`.
- Store owners provide one public phone number, which is also used for WhatsApp message links.
- Product upload during onboarding is optional.
- Email/password account creation happens at the final onboarding step.
- `Get Quote` is a dedicated general quote intake flow, separate from the pendant builder.
- Deferred public profile buttons were fixed as Message, Instagram, Website, and Design Custom. This storefront surface is currently hidden from MVP navigation.
- Owners can add up to two extra Linktree-style public links.
- Public collections are represented by products grouped under fixed categories, not a separate custom collection builder. Customer browsing is currently hidden in the MVP.

## Onboarding Route

```text
/onboarding
```

The setup is a six-step mobile-first flow inspired by CaratLabs, but using this app's warmer luxury palette:

- background: warm charcoal, not pure black
- panels: softened brown-black
- accent: muted luxury gold
- large typography
- rounded controls
- fast setup progress bar

## Step 1: Business Basics

Collect:

- business/store name
- city
- country
- year started
- Instagram handle

Stored in:

- `Account.name`
- `StoreProfile.displayName`
- `StoreProfile.city`
- `StoreProfile.country`
- `StoreProfile.yearStarted`
- `StoreProfile.instagramHandle`

## Step 2: Link And Theme

Collect:

- public slug for `/s/:slug`
- one of five theme choices

Stored in:

- `Account.slug`
- `Account.themeKey`

Current theme keys:

- `black_gold`
- `warm_ivory`
- `ice_blue`
- `rose_luxe`
- `graphite_orange`

## Step 3: Services

Collect enabled service buttons.

Stored in:

- `StoreService`

Legacy/current services:

- `quote`: Custom Quote Requests
- `design_custom`: Design Custom
- `size_guide`: placeholder
- `sell_watch`: placeholder
- `appointment`: placeholder
- `repair`: placeholder
- `reviews`: placeholder

`StoreService` rows are retained for compatibility. The deferred public profile renders fixed main buttons from `StoreProfile` fields instead of rendering service rows directly.

## Step 4: Page Look

Collect:

- cover banner image or cover gradient preset
- cover overlay darkness
- cover text color
- tagline
- regular phone
- WhatsApp phone
- profile photo
- website URL
- city
- country
- two optional extra links

Stored in:

- `StoreProfile.coverImageUrl`
- `StoreProfile.coverPreset`
- `StoreProfile.coverOverlayOpacity`
- `StoreProfile.coverTextColor`
- `StoreProfile.headline`
- `StoreProfile.phone`
- `StoreProfile.whatsappPhone`
- `StoreProfile.profileImageUrl`
- `StoreProfile.websiteUrl`
- `StoreProfile.city`
- `StoreProfile.country`
- `StoreProfile.extraLinksJson`

`coverImageUrl` and related cover fields remain in the schema for compatibility, but the current public profile and owner preview intentionally do not render a cover photo.

Uploaded files go through the public media storage helper. R2 is used when configured; otherwise local generated storage is used.

The owner profile editor also includes best-effort verification helpers:

- phone number input uses country flag formatting via `react-international-phone`
- Instagram handle check calls `/api/owner/instagram`
- Website and extra link URL checks call `/api/owner/link`

The link verifier is intentionally permissive: any real HTTP response from the domain counts as reachable, including Cloudflare/Shopify protection responses. It only fails malformed, local/internal, DNS, timeout, or no-response cases.

The owner profile editor shows both the public storefront URL and the QR design URL with copy/share/open controls. The QR design URL should be used on printed QR codes so anonymous customer generations and quote requests are attributed to the correct account.

## Step 5: First Products

Optional.

Collect up to two first pieces:

- image
- name
- price mode: set price or ask for price
- category
- variants

Stored in:

- `Product`
- `ProductCollection`

Current product categories:

- pendant
- watch
- ring
- bracelet
- earrings
- chain
- grillz
- other

The hidden-MVP owner collection manager at `/owner/collections` ensures default category collections exist for:

- pendant
- ring
- grillz
- bracelet
- earrings
- watch
- chain
- other

Each managed piece stores one cover image and optional specs:

- `Product.category`
- `Product.priceMode`
- `Product.priceLabel`
- `Product.material`
- `Product.metalDetail`
- `Product.stoneQuality`
- `Product.weightLabel`
- `Product.isActive`

Draft pieces use `Product.isActive = false`; published pieces use `Product.isActive = true`.

## Step 6: Publish

Collect:

- email
- password
- final URL confirmation

Creates:

- `Account`
- `User`
- `AccountMembership`
- `StoreProfile`
- `StoreService` rows
- default `ProductCollection` rows
- optional first `Product` rows

Then publishes:

```text
StoreProfile.isPublished = true
```

## General Quote Flow

Public route:

```text
/s/:slug/quote
```

API route:

```text
POST /api/storefront/:slug/quote
```

Customer submits:

- one to six reference images
- name
- phone
- optional email
- notes

Creates:

- `Lead`
- `QuoteRequest`

Quote metadata:

- `QuoteRequest.productType = general_quote`
- first uploaded image goes into `designedImageUrl`
- all uploaded images are stored in `referenceImageUrlsJson`
- request is scoped to the store owner's `accountId`

## Reviews Flow

Owner route:

```text
/owner/reviews
```

Public review route:

```text
/s/:slug/review
```

API route:

```text
POST /api/storefront/:slug/reviews
```

Customers submit:

- name
- rating
- review text
- at least one contact method: phone, email, or Instagram

Creates:

- `StoreReview`

Review rows are scoped to the store owner's `accountId`. Current statuses are:

- `published`
- `pending`
- `hidden`

The hidden-MVP owner reviews dashboard supports search, status filters, rating filters, average rating, rating distribution, and a request-review pane that creates a shareable review URL and WhatsApp message.

## Admin Follow-Up Needed

Next owner/admin work:

- show general quote requests in owner dashboard with all reference images
- add real owner auth sessions for accounts created through onboarding
- add slug redirects if store owners change their public URL
- decide whether reviews should auto-publish or require moderation by subscription tier
