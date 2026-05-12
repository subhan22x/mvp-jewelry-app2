# Store Owner Profile And Onboarding

## Decisions

- Public profile URL: `/s/:slug`.
- Store owners provide a regular phone number and a separate WhatsApp number.
- Product upload during onboarding is optional.
- Email/password account creation happens at the final onboarding step.
- `Get Quote` is a dedicated general quote intake flow, separate from the pendant builder.

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

Current services:

- `quote`: Custom Quote Requests
- `design_custom`: Design Custom
- `size_guide`: placeholder
- `sell_watch`: placeholder
- `appointment`: placeholder
- `repair`: placeholder
- `reviews`: placeholder

Only active services appear on the public profile.

## Step 4: Page Look

Collect:

- cover banner image or cover gradient preset
- cover overlay darkness
- cover text color
- tagline
- regular phone
- WhatsApp phone
- profile photo

Stored in:

- `StoreProfile.coverImageUrl`
- `StoreProfile.coverPreset`
- `StoreProfile.coverOverlayOpacity`
- `StoreProfile.coverTextColor`
- `StoreProfile.headline`
- `StoreProfile.phone`
- `StoreProfile.whatsappPhone`
- `StoreProfile.profileImageUrl`

Uploaded files go through the public media storage helper. R2 is used when configured; otherwise local generated storage is used.

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

- chain
- pendant
- ring
- bracelet
- watch
- grillz
- earrings
- trophy
- other

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

## Admin Follow-Up Needed

Next owner/admin work:

- add profile editor under `/owner/profile` or `/owner/account`
- add product/collection manager
- show general quote requests in owner dashboard with all reference images
- add real owner auth sessions for accounts created through onboarding
- add slug redirects if store owners change their public URL
