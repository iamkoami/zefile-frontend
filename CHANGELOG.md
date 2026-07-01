# Changelog

All notable changes to the ZeFile Frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.54.3] - 2026-07-01

### Fixed

- **Paid per-file downloads for non-logged-in buyers.** The backend download endpoint now enforces the payment gate, so a buyer on the public download page must supply their payer email (as the ZIP download already does). Threaded `customerEmail` through `PerFileDownloadList` into the download request and added the optional `email` field to `PresignedUrlRequestDto`. Without this, per-file downloads of paid transfers would fail for recipients who are not signed in. (`features/transfer/components/PerFileDownloadList.tsx`, `services/storage-api.ts`, `app/downloads/[transferId]/[shortCode]/page.tsx`)

## [1.54.2] - 2026-05-15

### Fixed

- **SideDrawer no longer leaks into the accessibility tree when closed.** The "Transfers" SideDrawer panel was always rendered in the DOM (slid off via `translate-x-full`), which meant screen readers and keyboard users saw a phantom modal on every initial page load. Added `inert={!isOpen}` (React 19 boolean attribute) to the panel — removes it from the focus + a11y tree when closed while preserving the existing slide animation. Also made `aria-modal` conditional on `isOpen` and added `aria-hidden={!isOpen}` for older AT compatibility. Verified: `dialog "Transfers" modal` no longer appears in the accessibility-tree snapshot when the drawer is closed. (`features/drawer/components/SideDrawer.tsx`)
- **Earnings calculator now reflects the pass-through PSP fee model.** The Pricing-page calculator previously framed all fees as deducted from the creator's earnings (creator absorbs everything), which contradicted the BP claim of pass-through processing fees (Stripe-style buyer surcharge). Added `processingFeePercent` per country (4% for NGN/GHS/KES, 3.5% for XOF, per the BP processing-fee rates of 2.95-4.6%) and a new "Buyer pays" line at the top of the breakdown showing `price / (1 - processing_rate)` with subtitle `"includes ~{amount} processing fee (~{percent}%, passed through)"`. Worked example: NGN 10,000 on Basic 7% now reads "Buyer pays 10,417 ₦ (incl. ~417 ₦ processing) → Your price 10,000 → -700 platform fee → -50 payout fee → You earn 9,250 ₦". Story now matches the BP. (`features/subscription/components/TransactionFeesSection.tsx`)

### Changed

- **"Request files" tab renamed to "Receive files".** The previous "Send files" / "Request files" tab labels created cognitive overlap with the "Add files" action button inside the active Send tab — three similar verbs in close proximity. "Receive files" is now parallel to "Send files" and reads as the inverse flow (clients send to me) rather than an active request action. EN: "Request files" → "Receive files". FR (idiomatic): "Demander des fichiers" → "Recevoir des fichiers". (`i18n/messages/en.json`, `i18n/messages/fr.json`)

### Added

- `i18n/messages/en.json` + `fr.json` — new `subscriptions.calcBuyerPays` and `subscriptions.calcIncludesProcessing` keys (with `{amount}` + `{percent}` interpolation).

### Notes

- These three fixes resolve P1 #4, P1 #5, and P2 #7 from the Day-Zero onboarding walkthrough findings (`zefile-backend/_bmad-output/planning-artifacts/zefile-day-zero-walkthrough-findings.md`). Total effort ~2 hours per the walkthrough estimate. The remaining items in the walkthrough findings are either out-of-scope by founder decision (P1 #6 dedupe language switcher, P2 #8 surface tier limit on homepage) or require a real human / Android phone (the end-to-end paid-transfer flow walkthrough).

## [1.54.1] - 2026-05-15

### Fixed

- **Homepage upload widget no longer contradicts the "5 GB free" marketing claim.** The anonymous upload widget previously displayed only `"Up to 2 GB"`, which clashed with the hero copy and FAQ promising "Send files up to 5 GB free." It now shows a two-line hint: `"Up to 2 GB"` + `"5 GB with a free account"` — communicating the anonymous-vs-Basic-tier gating without changing the underlying 2 GB anonymous cap. (`features/home/components/UploadPanel.tsx`)
- **Signup placeholder typo fixed.** Email field placeholder changed from `"cemail@gmail.com"` (read as a typo of "email" and could be mistaken for pre-filled content) to `"yourname@gmail.com"`. (`features/auth/components/EmailAuthForm.tsx`)
- **Signup placeholder visual hierarchy.** Email + Phone form placeholders previously inherited the input's full bold weight at the same large size, making the placeholder hint visually competitive with real typed content. Added `placeholder:opacity-25` so the placeholder reads as a clearly ghosted hint while preserving the input's bold + large clamp(2.5rem, 6vw, 5rem) font for typed text — same height, same weight, ghosted via opacity alone. (`features/auth/components/EmailAuthForm.tsx`, `features/auth/components/PhoneAuthForm.tsx`)

### Added

- **Wedge-aligned signup guidance under the anonymous upload widget.** New copy line `"Want to set a price and get paid? Sign up free."` (FR: `"Envie de fixer un prix et d'être payé ? Inscrivez-vous, c'est gratuit."`) appears above the existing `"Just exploring?"` text, only in real-send mode (not test mode). The `"Sign up free."` button dispatches a `CustomEvent("open-auth-signup")` which `Header.tsx` listens for via a new `useEffect`, opening the AuthPanel in signup mode. Uses the established cross-component CustomEvent pattern documented in CLAUDE.md (no new global store needed). (`features/home/components/UploadPanel.tsx`, `components/shared/Header.tsx`)
- `i18n/messages/en.json` + `fr.json` — new `upload.upToWithSignup`, `upload.toSetPriceTitle`, `upload.toSetPriceCta` keys (FR is idiomatic, not literal translation).

### Notes

- These three P0 fixes resolve the friction points identified in the Day-Zero onboarding walkthrough (`zefile-backend/_bmad-output/planning-artifacts/zefile-day-zero-walkthrough-findings.md`). Total effort to clear the P0 list was ~1.5 hours per the walkthrough estimate.
- Verified end-to-end on `localhost:3000`: clicking the new "Sign up free." button correctly opens the signup modal, and the modal's email field shows the new `"yourname@gmail.com"` placeholder at the proper ghosted-hint visual treatment.

## [1.54.0] - 2026-05-05

### Added

- **Help center routes (H2 scaffolding).** Public `/help/<category>` and `/help/<category>/<slug>` routes consume the new backend `/help/*` endpoints (built on the existing `SupportArticle` data). Both EN and FR variants — the route file pattern mirrors the locale-bound blog post architecture from v1.53.2 (locale-mismatch redirects to canonical, self-only hreflang on individual articles, cross-locale alternates in sitemap because each row has both `slug_en` and `slug_fr`).
  - `app/help/[category]/page.tsx` — category index with article cards (title + tags). Empty state if no published articles yet.
  - `app/help/[category]/[slug]/page.tsx` — single article view with `Article` + `BreadcrumbList` JSON-LD. 308-redirects to canonical locale URL when accessed via the wrong slug or category.
  - `services/help-articles-types.ts` — types + `HELP_CATEGORIES` + `localizeArticle()` utility, separated from the API client wrapper so edge route files can import without pulling Sentry/Node-only deps.
  - `services/help-articles-api.ts` — `apiClient`-backed methods for non-edge contexts.
  - `app/sitemap.ts` — emits one `<url>` per article per locale plus a category index URL for each category that has at least one published article.
- **Pricing payment-processor trust strip.** New `PaymentProcessorStrip` component listing supported processors (Paystack, Wave, MTN MoMo, Orange Money, Moov Money, Visa, Mastercard) with a brief PCI-DSS reassurance line. Wired into `PricingClient` between the existing `TransactionFeesSection` and FAQ. Dropped a planned `ProcessingFeeExplainer` since `TransactionFeesSection` already does that better.
- `i18n/messages/en.json` + `fr.json` — new `pricing.processors` namespace.

### Notes

- Existing `/help` static FAQ page stays as the landing for now — articles are additive, not replacing it.
- Backend half ships in `zefile-backend` v1.54.0.

## [1.53.5] - 2026-05-05

### Fixed

- **`/fr/*` responses are now edge-cacheable for returning FR visitors.** The middleware was emitting `Set-Cookie: NEXT_LOCALE=fr` on every `/fr/*` response, which caused Cloudflare to bypass the new HTML cache rule (Set-Cookie defaults to user-specific content). The cookie is now only set when the existing request cookie value isn't already `fr`. Returning FR visitors with the cookie already present get cached responses; first-time visitors and crawlers still get the cookie set on first hit and bypass cache for that one request. Pairs with the Cloudflare Cache Rule on the `zefile.io` zone deployed on the same day.

## [1.53.4] - 2026-05-05

### Fixed

- **Case-insensitive URLs now 308-redirect to lowercase.** `/About`, `/Pricing`, etc. previously returned 200 with the page rendering, creating a duplicate-URL surface for every static route. The middleware now redirects any pathname containing uppercase characters to its lowercase equivalent. Skips `/@handle` (creator profiles legitimately mixed-case), `/z-AbC` (short links), and paths with file extensions (a typo on a real asset still 404s).
- **`/security` FR description trimmed to 134 chars** (was 170+, exceeded the SERP cutoff). Also fixed the typo "protegeon" → "protégeons" and added missing accents throughout. Title also got proper accents.

### Added

- **`AboutPage` JSON-LD on `/about`** — references the existing `Organization` `@id` and declares `inLanguage: ["en", "fr"]`. Helps AI engines and Google Knowledge Graph link the page to the entity.
- **`/security` OG and Twitter `images`** — social previews now show the brand image instead of a bare card.

### Changed

- **`/press` and `/jobs` are now `noindex`** and removed from `sitemap.xml` (along with their `/fr/` mirrors). Both pages still render publicly but won't accumulate in Google's index until real content ships. Frees crawl budget for valuable pages.

## [1.53.3] - 2026-05-05

### Fixed

- **Homepage and `/about` meta descriptions trimmed to fit the ~155-char SERP cutoff.** Homepage went from 191 → 145 chars and the copy switched to the African-creators positioning (matches the homepage body). `/about` went 137 → 152 chars. Also fixed a `2 GB` vs `5 GB` discrepancy between the homepage description and the visible body copy / `llms.txt`.
- **FR homepage description rewritten idiomatically** per the ZeFile FR messaging guide ("plateforme de livraison de fichiers pour créatifs africains" — never "transfert" or "vente" framings).
- **Sitemap now emits 12 standalone `/fr/*` `<url>` entries** (one per static EN page). Previously the FR variants only appeared as `xhtml:link` children of the EN URLs, which several crawlers treat as weaker than independent `<url>` entries. Each FR entry preserves the full EN/FR/x-default `xhtml:link` set so the pair cross-references itself.

### Added

- **`theme-color: #5E53E0`** via Next.js `Viewport` export in `app/layout.tsx`. Matches the existing manifest `theme_color` so installable PWA and Android browser address bar share the same brand accent.

## [1.53.2] - 2026-05-05

### Fixed

- **Blog post URLs now bind to the post's actual locale, not the URL prefix.** EN and FR translations live at different slugs, so the previous logic produced duplicate URLs (`/blog/<fr-slug>` rendered FR content with `<html lang="en">`, `/fr/blog/<en-slug>` rendered EN content with `<html lang="fr">`), false sitemap hreflang claims, and missing on-page hreflang for blog posts. Closes audit findings C1–C4.
  - `app/blog/[slug]/page.tsx`: 308-redirect when URL locale doesn't match `post.locale`; `ArticleJsonLd` URL uses the locale-correct path.
  - `app/blog/[slug]/layout.tsx`: canonical and self-referencing hreflang built from `post.locale`; breadcrumb URLs and OG `locale` follow the post's actual language.
  - `app/sitemap.ts`: blog entries listed once at their locale-correct URL with self-only `xhtml:link`. The data model has no translation FK yet, so we cannot honestly claim cross-locale alternates for blog posts. Static pages keep their EN/FR/x-default pairing unchanged.
  - `components/blog/PostCard.tsx`, `components/blog/BlogPostClient.tsx`, `app/blog/page.tsx`: internal links, share URLs, and breadcrumbs use the locale-correct path so users skip the redirect hop.

## [1.53.1] - 2026-05-04

### Fixed

- **Hreflang and canonical URLs now point to the real `/fr/*` routes.** Sitemap and all page metadata previously declared `en` and `fr` alternates as the same URL (the EN one), and FR pages set their canonical to the EN URL. The middleware actually serves `/fr/*` as a distinct path (rewriting to `/*` with `NEXT_LOCALE=fr` cookie), so the metadata was contradicting the routing — Google was likely consolidating FR variants into their EN counterparts and not indexing the French pages independently.
  - `app/sitemap.ts`: `withAlternates` rewritten to take a path and emit `{ en: /path, fr: /fr/path, x-default: /path }` for the 12 static URLs plus blog posts and creator profiles.
  - `app/layout.tsx`: canonical is now self-referencing — `/fr/*` pages canonicalize to themselves instead of the EN page.
  - 11 per-page layouts updated to the same pattern: `about`, `pricing`, `how-it-works`, `help`, `privacy`, `terms`, `contact-us`, `security`, `press`, `jobs`, `blog`.

## [1.53.0] - 2026-05-04

### Added

- **`public/llms.txt`** — Structured site description for AI search crawlers (ChatGPT, Claude, Perplexity). Includes product summary, key facts (plans, fees, file types, payout methods), top-level page map, FR mirror, and licensing posture (`search=yes, ai-train=no`). Addresses the previous 404 where `https://zefile.io/llms.txt` returned the Next.js HTML shell.

### Changed

- **`app/robots.ts` — explicit allow rules for AI search crawlers.** Previously relied on Cloudflare Pages' managed Scrape Shield, which blocked `GPTBot`, `ClaudeBot`, `Google-Extended` site-wide with `Disallow: /`. New explicit `User-agent` blocks for `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-Web`, `PerplexityBot`, and `Google-Extended` allow them on the public surface (`/`, `/about`, `/pricing`, `/blog`, `/help`, `/how-it-works`, `/privacy`, `/terms`, `/contact-us`, `/security`, `/press`) while still blocking download/transfer/dashboard/account/admin paths. Per RFC 9309 most-specific-UA-wins, these override Cloudflare's wildcard. Training-only crawlers (`anthropic-ai`, `CCBot`, `Bytespider`, `cohere-ai`) remain fully disallowed. `PUBLIC_PATHS` and `PRIVATE_PATHS` extracted as constants.

### Operational

- **Cloudflare Pages dashboard step required** to fully deploy the change: disable **Bots → Block AI bots** (currently "Block on all pages") and disable **Bots → Instruct AI bot traffic with robots.txt**. With those on, Cloudflare returns 403 to GPTBot/ClaudeBot at the edge before the request reaches the page, neutralising the `robots.txt` allow rules.

## [1.52.3] - 2026-04-23

### Changed

- **Rewrote home hero copy for first-time visitor clarity.** Old headline ("Send files. Get paid before they download.") + subtitle (channels/tiers list) only landed for readers who already knew ZeFile — first-timers couldn't tell what the product actually did. New hero walks a stranger through the full loop in two beats: headline "Send your work. Get paid the moment they download." (the outcome) + split subtitle "Drop in your files, set a price, share the link. / Your client previews, pays, then downloads — money straight to your account." (the flow). EN + FR updated together; FR follows the brand voice guide (vous, no literal idiom translations).

## [1.52.2] - 2026-04-18

### Fixed

- **Upload-flow OTP verify now sends a fresh Turnstile token.** `UploadPanel.handleOTPVerify` was calling `authApi.verifyOTP` without requesting a new captcha token first. Since Turnstile tokens are single-use, the one issued for `requestOTP` had already been consumed, and on environments with `CAPTCHA_REQUIRED=true` (staging/production) the backend rejected `/auth/verify-otp` with `400 "CAPTCHA verification required"`. Matches the existing pattern in `EmailAuthForm.tsx:142` and `PhoneAuthForm.tsx:151`.

## [1.52.1] - 2026-04-18

### Fixed

- `components/shared/HeroText.tsx`: tightened hero title from `text-5xl` to `text-4xl` so the call-to-action button sits higher on first paint.

## [1.52.0] - 2026-04-18

### Added

- **Epic 132 — Hurt moments & trust recovery (frontend).** Paired with `zefile-backend@1.53.0`. Four recipient- and subscriber-facing recovery flows from the 2026-04-17 UX audit.
  - **Story 132.1 — Forgot password on protected transfers.** New `features/transfer/components/PasswordHelpPanel.tsx` lets a stuck recipient ping the sender without leaving the download page. Calls `POST /transfers/:shortCode/password-help-request`.
  - **Story 132.2 — Preview-generating state on receiver side.** New `hooks/usePreviewStatus.ts` polls preview status; `components/shared/PreviewPlaceholder.tsx` renders an honest "we're getting this ready" state. Wired into `TransferPreviewPanel`, `TransferPreviewModal`, and `FilePreviewView` so receivers see status instead of a dead placeholder.
  - **Story 132.3 — Download-failed recovery card.** New `features/transfer/components/DownloadRecoveryCard.tsx` surfaces after a failed download; one click reports to the sender via `POST /transfers/:shortCode/download-failed-report`. New `PerFileDownloadList.tsx` gives each file its own retry/report affordance.
  - **Story 132.4b — Subscription billing grace period (frontend).** Legacy `features/subscription/components/PaymentIssueBar.tsx` replaced by `components/shared/PaymentIssueBar.tsx` with widened DTO coverage for grace fields. New `stores/subscription-store.ts` polls subscription state. `stores/drawer-store.ts` gains serialize/hydrate so drawer state survives the Paystack redirect during "update payment method". `app/payment/processing/page.tsx` wired to the new update-payment-method endpoint.
- **PostHog event helpers** in `lib/posthog.ts`: `password_help_requested`, `download_failed_reported`, `preview_pending_shown`, `billing_grace_*` — matches backend event names.
- **Typed API clients** for the new backend endpoints: `services/storage-api.ts` (preview status), `services/transfer-api.ts` (password-help-request, download-failed-report), `services/subscription-api.ts` (update-payment-method).
- **i18n:** new keys in `i18n/messages/{en,fr}.json` for all four stories. Brand-voice reviewed (contractions, "Heads up" not "WARNING", `vous` in French, no emojis).

### Migration notes

- Must be deployed alongside `zefile-backend@1.53.0`. Frontend is forward-compatible with older backends (new panels gracefully hide when the corresponding endpoints 404), but the grace-period bar and preview-pending state are inert without backend 1.53.0.
- Story 132.4b still has two human gates: Sally voice review + Paystack dogfood. Feature flag not required — empty-state fallbacks are safe.

## [1.51.1] - 2026-04-17

### Fixed

- **Epic 131.8 code review follow-ups** (paired with `zefile-backend@1.52.1`):
  - `services/payouts-api.ts`: `SenderPayoutsResponse` migrated to `{ payouts, meta }` — the legacy flat shape compatibility shim that preserved `{ total, page, limit, totalPages }` as siblings of `payouts` has been removed. Platform-wide "no flat pagination siblings" contract now holds at every mapping boundary.
  - `features/account/components/PayoutsPanel.tsx`: reads `payoutsData.meta.totalPages` instead of `payoutsData.totalPages`.
  - `services/file-request-api.ts`: `getMyRequests()` and `getMyDeliveries()` return types migrated to `{ data, meta }` matching the backend file-requests shape migration (missed in original 131.8 survey because that backend DTO lacked `totalPages`).

## [1.51.0] - 2026-04-17

### Changed

- **BREAKING: Consume `{ data, meta }` pagination shape from backend `zefile-backend@1.52.0` (Epic 131 Story 131.8).** All paginated API reads now access `response.data.meta.{total, page, limit, totalPages}` instead of the flat `response.data.{total, page, limit, totalPages}`. Consumers of `items:` arrays migrated to `data:` where the backend renamed the field.
  - `services/blog-api.ts` — `BlogListResponseDto` now `{ data, meta }` with `items:` renamed to `data:`.
  - `services/payouts-api.ts` — internal `BackendWithdrawalResponse` type aligned; legacy `SenderPayoutsResponse` shape preserved for UI compatibility.
  - `services/referrals-api.ts` — `ReferralHistoryResponse` aligned.
  - `services/subscription-api.ts` — `PaginatedRenewalHistory` `items:` renamed to `data:`.
  - UI consumers: `app/blog/page.tsx`, `components/blog/BlogListClient.tsx`, `components/blog/BlogPostClient.tsx`, `features/account/components/ReferralsPanel.tsx`, `features/account/components/SubscriptionSettingsPanel.tsx`.

### Migration notes

- Must be deployed alongside `zefile-backend@1.52.0` and `zefile-admin@1.23.0`. Backward-incompatible with backend <1.52.0 — the new read paths produce `undefined` against the old response shape.

## [1.50.0] - 2026-04-17

### Added

- **Story 130.3 — End-of-conversation feedback prompt (Chat Widget)**
  - When a support conversation transitions to `resolved` or `closed`, the widget now asks "Did we solve your issue?" with thumbs-up / thumbs-down / "Not yet" actions.
  - Feedback posts to the backend `POST /support/conversations/:id/feedback` endpoint, forwarding the visitor's `accessToken` for unauthenticated sessions.
  - Result persists: on next conversation load, if the backend has recorded a `feedbackVerdict` on the conversation metadata, the widget shows "Thanks. We'll keep getting smarter." instead of re-prompting.
  - "Not yet" re-opens the conversation (reopen verdict) and clears the resolved state so the visitor can keep chatting.
- `supportApi.submitFeedback(conversationId, verdict, accessToken?)` service helper.
- `chatStore` now tracks `accessToken` and `feedbackSubmitted`, plus `setIsResolved` / `setFeedbackSubmitted` actions.

### Fixed

- File remove (X) button in `FilePreviewPanel` now has a visible icon color in dark mode (previously rendered as a near-invisible `currentColor` on a dim background).

## [1.49.2] - 2026-04-13

### Fixed

- Sender's own visits to the download page no longer inflate view counts in transfer analytics

## [1.49.1] - 2026-04-13

### Removed

- WhatsApp number prompt from Transfer Complete screen -- redundant now that recipients can enter phone numbers during transfer creation

## [1.49.0] - 2026-04-13

### Added

- Multi-recipient download page with WhatsApp + email auth routing (Epic 124)
- MultiRecipientInput component for mixed email/phone recipient entry
- Waitlist page for pre-launch signups
- Maintenance page for scheduled downtime
- Recipient OTP and WhatsApp verify methods in auth-api
- Public transfer info endpoint for recipient type detection

### Changed

- Middleware extended with new route matchers for waitlist/maintenance
- PlatformStatusGate supports waitlist and maintenance modes

## [1.48.1] - 2026-04-09

### Fixed

- Prevent merged headers from being overwritten by spread options in fetch requests
- Handle array error messages from backend validation (join with period separator)

## [1.48.0] - 2026-04-09

### Added

- Cloudflare Turnstile invisible CAPTCHA on OTP and payment forms
- Device fingerprint collection on authentication (FingerprintJS)
- Analytics free-tier limited view with upgrade prompts
- Analytics contextual tip banners
- Creator profile primary service selector
- Public profile services section

### Changed

- CSP: added challenges.cloudflare.com to frame-src for Turnstile
- API client sends X-Captcha-Token and X-Device-Fingerprint headers
- Auth forms integrated with Turnstile widget
- Analytics panel enhanced with tips and free-tier view

### Removed

- Legacy useCaptcha hook (replaced by useTurnstile)

## [1.47.3] - 2026-04-04

### Fixed

- Resolve CSP `unsafe-eval` violation from PostHog surveys module in production
- Filter browser extension noise (Backpack, chrome-extension, moz-extension) from Sentry error reports

## [1.47.2] - 2026-04-04

### Changed

- Pin Node to 22.16.0 via .nvmrc and add engines constraint

## [1.47.1] - 2026-04-04

### Fixed

- Update contact page content and layout

## [1.47.0] - 2026-03-27

### Added

- PresignedUrlPool class with batch fetching (10 URLs/batch) and automatic fallback
- Sliding window upload concurrency (4 concurrent chunks) replacing batch-then-wait
- Presigned URL prefetching when pool drops below threshold
- Multi-file parallel upload support (2 files concurrently)

### Fixed

- Replace hardcoded payment error strings with i18n translation keys
- Remove fallback string in ProfileSection sessionExpired toast

## [1.46.0] - 2026-03-25

### Added

- Phone/email tab switcher on AuthPanel with supported country codes (TG, BJ, CI, GH, NG, KE)

### Fixed

- SideDrawer slide-in/out animation not working (Tailwind v4 translate transition)
- Drawer content disappearing before slide-out animation completes

## [1.45.0] - 2026-03-23

### Added

- Public creator profile page (`/@handle`) with identity block, bio, social links, services, and stats
- Profile settings panel in account with social links editor and services selector
- Creator strip component on download page showing sender profile info
- WhatsApp prompt component for post-transfer contact saving
- Creator profiles API service (`creators-api.ts`)
- Dynamic sitemap generation for creator profiles
- Middleware routing for profile pages
- Phone auth form improvements for WhatsApp login flow
- i18n translations for all new profile and WhatsApp features (en/fr)

### Changed

- Updated OG image

## [1.44.0] - 2026-03-21

### Added

- DeliveryProofCard component showing certificate details for paid file transfers
- Delivery proof fetch and display in TransferDetailsPanel (sender view, public sales)
- Invoices API: `getDeliveryProofForTransfer()` and `verifyDeliveryProof()` methods
- DELIVERY_PROOF invoice type and transferId filter support
- PostHog session replay toggle driven by platform config (`sessionReplayEnabled`)
- EN/FR translations for delivery proof card and session replay

## [1.43.0] - 2026-03-21

### Added

- HandlePanel: claim and manage your `amara.zefile.io` subdomain (STARTER+ only)
- Real-time handle availability check with 500ms debounce
- Active handle card with copy-to-clipboard button
- Handle menu item in AccountPanel sidebar, filtered to STARTER/PRO tiers
- `updateHandle()` and `checkHandle()` methods in UsersApi
- Full EN/FR translations for handle feature
- `NEXT_PUBLIC_ZEFILE_SUBDOMAIN_BASE` env var for configurable subdomain base

## [1.42.1] - 2026-03-20

### Fixed

- Add `/fr` locale routing via middleware rewrite so French pages are indexable by Google
- Add page-specific hreflang tags (`en`/`fr`/`x-default`) generated from `x-canonical-path` header
- Remove `isLoading` gate in `HowItWorksClient` that caused Google to see a loading screen instead of page content

## [1.41.1] - 2026-03-20

### Fixed

- Add ThemeToggle to WaitlistPage header so dark mode can be toggled during waitlist

## [1.41.0] - 2026-03-20

### Added

- Dark mode: ThemeToggle component, theme-store (Zustand), FOWT prevention
- Dark palette CSS variables and transition rules across all components
- SaleCheckoutPanel for public sales buyer purchase flow
- Download page layout with sale-aware routing
- ReferralsPanel in account section with referral API client
- Public sales endpoints in transfer-api

### Changed

- All components updated with dark mode class variants
- Removed axios dependency (using native fetch)

### Fixed

- Updated EN/FR translations for dark mode and sales features

## [1.40.0] - 2026-03-17

### Added

- Referral landing page at /r/[code] with code validation and intent capture
- ReferralsPanel in account settings with stats, history, and share functionality
- Post-OTP referral application (silent code capture)
- Referral API client (services/referrals-api.ts)
- Growth prompts for referral nudges
- EN/FR translations for referral system

### Changed

- Updated favicon and logo assets
- Updated WaitlistPage, AccountPanel, PayoutsPanel, auth forms for referral integration

## [1.39.0] - 2026-03-16

### Changed

- Rename Free tier to Basic (EN) / Essentiel (FR) across all user-facing text
- Disable signup submit button until terms are accepted

## [1.38.0] - 2026-03-15

### Added

- Invoice download buttons in TransactionsPanel and PayoutsPanel (Epic 72)
- Transfer cover image and details media support in TransferDetailsPanel and UploadPanel
- invoices-api service for invoice list and download endpoints
- Download page improvements for transfer cover display
- Updated translations (EN/FR) for invoice and cover media features

## [1.37.1] - 2026-03-14

### Fixed

- Added missing CAPTCHA token to upload OTP flow (caused 400 errors for non-logged-in users)
- Added null-token guards to all OTP call sites (EmailAuthForm, download page, UploadPanel)
- Added `captchaNotReady` translation keys (EN/FR) for graceful error messaging

## [1.37.0] - 2026-03-11

### Added

- File request delivery and review pages with dedicated panels
- Contact page FAQ component and OpenGraph image

### Changed

- Reworked payment panels for gateway-agnostic checkout flow
- Updated download page with improved payment and file request flows
- Updated transfers panel with file requests tab

### Fixed

- Restored missing French accents across legal, contact, how-it-works, branding, waitlist, and crossLinks sections
- Replaced double dashes with em dashes in EN and FR copy
- Fixed typo in French FAQ (n'aceedons -> n'accédons)

### Removed

- Unused short-link-redirect.html

## [1.36.0] - 2026-03-09

### Added

- Major rework of FileRequestPanel with improved UX flow
- Congrats lottie animation and new About page image assets
- New marketing images for About page sections

### Changed

- Payment checkout updated to support multiple gateways (PhoneNumberInput, payment API)
- Refreshed About, How It Works, and Pricing pages with updated components
- Updated TransferCompletePanel and SubscriptionPanel
- Updated EN/FR translations for new features

## [1.35.0] - 2026-03-06

### Added

- Gateway-agnostic payment checkout flow supporting StartButton and Paystack
- KYC flow panels for BVN verification (Togo and Benin)
- Suggestion/idea conversation starter in support chat widget (EN + FR)

### Fixed

- Subscription price display for all XOF-zone countries (TG, BJ, SN, ML, BF, NE, GW)
- Trust strip rendered once at bottom of upload panel (was duplicated per auth state)

## [1.34.0] - 2026-03-06

### Added

- Free transfer toggle for STARTER and PRO tiers (send files without requiring payment)
- Minimum transfer price validation with automatic currency conversion from NGN base rate
- Price input placeholder shows minimum amount per selected currency

## [1.33.0] - 2026-03-06

### Changed

- Convert 10 public pages from client-side to server-rendered for SEO crawlability (about, pricing, how-it-works, contact-us, help, security, press, jobs, terms, privacy)
- Extract client interactivity into separate Client components (AboutClient, PricingClient, HowItWorksClient, ContactForm, HelpContent, ChatButton)
- Server-render sr-only SEO text blocks for complex pages (about, pricing, how-it-works)
- Header "Pricing" link now opens SubscriptionPanel drawer instead of navigating to /pricing

## [1.32.0] - 2026-03-06

### Added

- Convert blog post page to SSR for search engine crawlability
- Dynamic OG images for /pricing, /about, /how-it-works pages
- Hreflang alternates in sitemap.xml for all pages (EN/FR)
- Metadata (generateMetadata, OG tags, breadcrumbs) for /security, /press, /jobs
- CrossLinks component for internal page navigation on pricing, how-it-works, about, help
- Core Web Vitals monitoring via PostHog (LCP, CLS, INP, FCP, TTFB)
- manifest.json for PWA support
- FAQ schema on /help layout
- Blog post breadcrumb now includes post title

### Changed

- Blog post page split into server component + client interactive parts
- Pricing header link now crawlable (href="/pricing" instead of drawer action)
- Press and Jobs layouts upgraded from static metadata to dynamic generateMetadata

### Fixed

- Contact page title duplication ("ZeFile" appeared twice)

## [1.31.1] - 2026-03-05

### Fixed

- Align all user-facing translations with ZeFile Voice Guide
- Remove "successfully" from 14 EN success toasts
- Replace 42 French "Veuillez" instances with direct imperatives
- Fix missing French accents in security content
- Update OG image

## [1.31.0] - 2026-03-05

### Added

- BrandingPanel in account settings: logo/favicon upload, color theming, company name (STARTER+)
- Unified branding hook: custom domain cookie > API senderBranding > default
- Download page renders sender branding from BrandingProfile API
- FileRequestPanel on home page with send/request tab stack UI
- /deliver/[shortCode] page for creative file delivery
- /review/[shortCode] page for client review and approval
- File request API service for all CRUD operations
- Tab stack animation (WeTransfer-style inactive pill peek)
- Analytics moved from standalone drawer to account panel (STARTER+)
- AccountPanel filters menu items by user tier (hides branding/analytics for FREE)
- EN/FR translations for file requests, branding, analytics upgrade prompt
- TransferPreviewPanel passes recipientEmail for preview access

### Changed

- Free tier limits: 5GB storage (was 2GB), 10 transfers/month (was 5), 14-day expiry (was 7)
- Starter tier storage: 20GB (was 10GB)
- Pricing page updated with new tier limits

## [1.30.2] - 2026-03-04

### Fixed

- Clear all Zustand stores on logout via `clear-all-stores` event dispatch
- Fix logo Image dimensions warning (set explicit height in CSS)
- Fix FOUC: add fade-in animation to content panel to prevent beige flash on page refresh

## [1.30.1] - 2026-03-04

### Changed

- Updated OG image assets

## [1.30.0] - 2026-03-04

### Added

- Security policy page (`/security`) with vulnerability disclosure, scope, rules, and safe harbor sections

## [1.29.0] - 2026-03-04

### Changed

- Security page: replace infrastructure URLs with security feature descriptions
- Security page: remove third-party service names from out-of-scope section
- Security contact email updated to hello@zefile.io

## [1.28.0] - 2026-03-04

### Added

- Post-download CTA page for unauthenticated recipients with back-to-transfer link
- New user welcome banner on download page after OTP verification (auto-dismisses after 5s)
- Inline upsell hints on gated features (wallpaper, size limit) for free-tier authenticated users
- Onboarding checklist card in Transfers drawer with per-user localStorage dismiss
- Transfer list empty state redesign with icons and CTAs per tab (Sent, Received, Paid)
- Onboarding status API integration (`GET /users/me/onboarding-status`)

### Changed

- Checkbox style consistency: green bg with dark check icon, dark hover border
- WaitlistPage checkbox hover border updated to match design system

### Fixed

- Bulk action bar now hides when drawer closes (transfers selection cleared on close)
- CSS injection protection for wallpaper URL in download page background
- Onboarding checklist dismiss key is now per-user (prevents cross-account dismissal)

## [1.27.0] - 2026-03-03

### Added

- Staggered entrance animations on home and download pages (waitlist-style reveal)
- Upload panel slides up, hero title slides up, subtitle fades in
- Paper plane Lottie scales in with custom revealPlane keyframe
- Creator avatars pop in with staggered scaleIn, trust text fades in

## [1.26.0] - 2026-03-03

### Added

- Time-of-day Lottie logo colorization: white (day), green (evening), cream (night)
- Night mode subtitle now renders in white for better contrast

## [1.25.0] - 2026-03-03

### Added

- CreatorsTrustStrip component on homepage hero (overlapping creator avatars with social proof text)
- Auth-aware header navigation and mobile menu updates

### Changed

- Trust strip copy: confident statement instead of question ("Trusted by creators who don't compromise")
- Download page: simplified "Preview before you pay" to "Take a look before you pay" (EN/FR)
- About page trust pills: warmer passwordless auth copy
- Footer trust features: shorter, more personal copy
- FR translations: natural French equivalents instead of literal translations

## [1.24.0] - 2026-03-03

### Added

- Auth-aware HeroText CTA on download page: hides "Get started" for logged-in users, shows upgrade CTA for free-tier users
- Trust strip on upload panel (secure transfer, auto-expiry, paywall badges)
- Metropolis ExtraBold (800) and Black (900) font weights
- Rich text highlight support on legal page titles (Terms, Privacy)

### Changed

- Updated logo assets (SVG, PNG) with new design including icon + wordmark
- Logo size increased across Header, WaitlistPage, and MaintenancePage
- HeroText redesigned: centered layout, larger title (font-black), auth-aware CTAs replacing proof stats
- PaperPlaneAnimation replaced with logo watermark animation (decorative background)
- MaintenancePage background uses logo animation instead of paper plane
- WaitlistPage removed duplicate favicon from header
- Stars opacity reduced in night mode TimeOfDayBackground
- Blog reading progress bar repositioned to top of viewport
- Panel pointer-events adjustments for proper click-through on download and home pages

### Fixed

- Waitlist mode now blocks download pages (previously exempted)
- Download page HeroText CTA now correctly adapts to authentication state

## [1.23.0] - 2026-03-02

### Added

- ContactPage JSON-LD schema on contact-us page
- SoftwareApplication type to WebApplication JSON-LD for broader search coverage
- AI crawler policy: allow ChatGPT-User and PerplexityBot on public marketing pages
- Image entries (og-image.png) in sitemap for Google Image Search indexing
- CDN domain and Wasabi endpoint as configurable CSP env vars

### Changed

- Blog title tag: "Blog - Tips & Guides for Creatives" (EN/FR) to avoid redundant "ZeFile | ZeFile"
- Reduced Metropolis font from 9 weights to 5 (removed unused 100, 200, 800, 900)
- CSP: removed Wasabi S3 endpoint from img-src/media-src, added CDN domain instead
- CSP: Wasabi endpoint kept only in connect-src (required for direct uploads)
- Removed deprecated X-XSS-Protection header from middleware and next.config
- Maintenance page: white logo variant for night mode, larger background element

### Fixed

- Hreflang: added explicit en/fr alternates alongside x-default in root layout

## [1.22.0] - 2026-03-02

### Added

- Maintenance page with Lottie animation, logo, and estimated downtime display
- Waitlist page with email signup form, styled checkbox, and consent flow
- PlatformStatusGate provider for automatic maintenance/waitlist redirection
- `usePlatformStatus` hook with polling for real-time platform status
- `platform-api` service for status checks and waitlist signup
- EN/FR translations for maintenance and waitlist pages

## [1.21.0] - 2026-03-02

### Added

- Server-rendered sr-only SEO content section for search engine crawlers (What is ZeFile, How it works, Why creatives choose ZeFile)
- FAQ schema (FAQJsonLd) on homepage with 6 Q&A items for Google rich snippets
- Keyword-rich sr-only description block for improved search indexation
- `homeSeo` translation namespace with 20 keys (EN + FR)

### Changed

- Homepage title tag: "ZeFile -- Send Files & Get Paid Before Download"
- Meta description rewritten for freelancer/creative keyword targeting
- Expanded keyword meta tags for niche positioning
- Fixed hreflang: removed duplicate en/fr alternates pointing to same URL, kept x-default only
- Homepage wrapped in `<main>` landmark for semantic HTML

## [1.20.2] - 2026-03-02

### Fixed

- Upgrade Next.js from 15.3.4 to 15.3.6 (CVE-2025-66478 RCE fix)
- Add `rel="noopener noreferrer"` to download link in FilePreviewView
- Restrict DOMPurify URI protocols in blog post renderer (block javascript:/data: URIs)
- Add email format validation to CustomEvent recipient listener in UploadPanel

### Added

- ESLint `no-console` rule (warns on `console.log`, allows `warn`/`error`)
- PDF iframe title attribute for accessibility
- Encryption fallback logging in multipart upload service
- Dependency override for tar (>=7.5.8)

## [1.20.1] - 2026-03-01

### Fixed

- Currency display now uses shared `formatCurrencyAmount` utility for correct symbol positioning (e.g., `₦ 9,300` not `9,300 ₦`)
- Added XAF (Central African CFA franc) as supported currency
- CFA currencies now display as `9,300 XOF` / `9,300 XAF` (ISO code after amount)
- Earnings inline text bolds the amount and fee percentage for readability

## [1.20.0] - 2026-03-01

### Added

- Unified upload area with trust strip (secure, expiry, paywall indicators)
- Context-aware transfer button labels: "Send test" / "Send & get paid" / "Send files"
- Inline service charge display when setting a price
- Progressive disclosure on upload form ("Add title & options" toggle)
- Monthly equivalent line under annual prices ("That's X/month")
- Test mode toggle: users can switch back to real mode after entering test mode

### Changed

- Pricing cards now bold tier-unique features and summarize shared features
- Annual toggle shows real savings amount ("Save up to X") using highest tier savings
- Selected country in all currency dropdowns now uses bold instead of purple
- Removed International (USD) from the earnings calculator
- Updated brand assets, logos, favicons, and styling

## [1.19.0] - 2026-02-28

### Added

- Display server-generated watermarked preview in test transfer simulation (tamper-proof)

### Changed

- Replace `--` with em dashes in English and French translations

### Fixed

- Cookie consent banner no longer blocks interaction with page elements behind it

## [1.18.1] - 2026-02-28

### Fixed

- Default earnings calculator country set to Nigeria (NGN)

## [1.18.0] - 2026-02-28

### Added

- Interactive earnings calculator replacing static transaction fees table on pricing page
- Auto-skip choice blocks after 3 completed test transfers (localStorage-based)
- Test download simulation component for test transfer flow

### Changed

- Choice blocks modernized: "Try it first" / "Send for real" with NavArrowRight icon
- Processing fee removed from pricing page (buyer's cost, not relevant to creators)
- Choice block hover/active animations (scale 1.02 / 0.98)
- Test transfer panel widths adjusted (420px main, 444px side offset)

## [1.17.0] - 2026-02-28

### Added

- Unified test transfer upload flow with same progress bar as real transfers
- Test simulation views (sender/recipient) matching actual email template format
- Featured creators section on download page for social proof
- "Preview before you pay" messaging on download page for paid transfers
- First free transfer banner and tracking in TransferCompletePanel
- Payment page analytics (view/abandon tracking)
- Choice block styles for visitor upload mode selection
- New API methods: testUpload, createTestSession, getFeaturedCreators
- Extended PostHog tracking for test transfer and payment funnels
- EN/FR translations for all new features

### Changed

- Header auth check shows loading overlay until resolved (prevents flash)

## [1.16.3] - 2026-02-27

### Fixed

- Add edge runtime export to manifest.ts for Cloudflare Pages compatibility

## [1.16.2] - 2026-02-27

### Fixed

- Sitemap hardcoded lastModified dates replaced with dynamic timestamps
- Homepage double h1 issue (HeroText ARIA heading marked as aria-hidden)
- OfferCatalog structured data using proper UnitPriceSpecification for pricing schema
- Blog index converted from client-side to server-side rendering for search engine crawlability

### Added

- Vary (Accept-Language, Cookie) and Content-Language response headers for i18n SEO
- Dynamic locale-aware manifest.ts replacing static manifest.json
- Dynamic OG image generation for blog posts (opengraph-image.tsx)

## [1.16.1] - 2026-02-26

### Fixed

- Pricing page auto-scrolling to fees section on load (scrollIntoView replaced with container-only scroll)

## [1.16.0] - 2026-02-26

### Added

- CTA sections on pricing and help pages
- TransactionFeesSection component showing processing, platform, and payout fees
- Regional flag SVGs for BF, BJ, CM, GN, ML, RW, TG, TZ, UG
- Country code and payout method params in withdrawal fee calculation

### Fixed

- Header scroll glitch: 8px delta threshold prevents flicker on trackpad micro-movements
- Header layout shift between hidden/floating states (spacer present in both)
- Header flash on initial hide (CSS transition only on slide-in, instant slide-out)

### Changed

- How-it-works CTA subtext styling alignment with other pages

## [1.15.0] - 2026-02-25

### Added

- Processing fee breakdown in buyer checkout (file price + processing fee + total)
- Fee breakdown props in TransferSummaryCard component
- countryCode parameter in payment initialization request
- Payout fee percentage display in withdrawal panel
- Fee-related i18n keys for EN and FR (filePrice, processingFee, totalCharged, withdrawalFeePercent)

### Changed

- Tier limit fallback defaults updated: FREE 7%, STARTER 5%, PRO 3% (matching backend pass-through model)

## [1.14.4] - 2026-02-25

### Fixed

- Improve text readability on About and How It Works pages (darker text color, font-medium weight, consistent text-base sizing)
- Change toggle buttons from rounded-full to rounded-md on How It Works page

## [1.14.3] - 2026-02-24

### Fixed

- Poll store Zustand persist middleware accessing localStorage during SSR, causing 500 on all routes

## [1.14.2] - 2026-02-24

### Fixed

- Trimmed 8 meta descriptions exceeding 160 characters to comply with SEO best practices (About EN/FR, Blog FR, Help FR, How It Works FR, Pricing FR, Terms EN/FR)

## [1.14.1] - 2026-02-24

### Added

- Hreflang alternate language tags (en, fr, x-default) on all 10 public page layouts for multi-language SEO
- Bing Webmaster Tools meta verification support via `NEXT_PUBLIC_BING_VERIFICATION` env var

## [1.14.0] - 2026-02-24

### Changed

- Homepage converted from client component to Server Component for SSR — H1 and subtitle now in initial HTML response for crawlers
- Homepage client logic extracted to `HomeClient.tsx` (no visual change)
- HeroText `<h1>` changed to `<div role="heading">` to avoid duplicate H1s with server-rendered heading
- Removed duplicate AI bot rules from `robots.ts` (Cloudflare managed section already handles GPTBot, CCBot, ClaudeBot, Amazonbot, Google-Extended, Bytespider)

### Removed

- Broken hreflang language alternate tags from all 12 layout files — EN and FR pointed to same URL without URL-based i18n routing

## [1.13.0] - 2026-02-24

### Added

- PageHero component on pricing page with gradient background and slide-up animation
- Modern CSS Grid feature comparison table with highlighted Pro column
- BrandCross decorative shapes and gradient section on pricing page
- Green highlight text on pricing section headings (plan, features, Questions)
- Highlight text on SubscriptionPanel drawer header
- Hreflang language alternates on all page layouts

### Changed

- Pricing page background from warm gray to white
- Tier cards container widened from max-w-5xl to max-w-6xl
- FAQ section restyled to match how-it-works page (warm gray bg, larger padding, SVG chevron)
- HeroText proof stats text colors adjusted for better contrast

## [1.12.1] - 2026-02-24

### Fixed

- Add Google reCAPTCHA domains to CSP policy (connect-src, script-src) to unblock CAPTCHA on staging

## [1.12.0] - 2026-02-24

### Added

- Wire all 9 frontend-only PostHog events for 100% analytics coverage
- FILES_SELECTED tracking on file drop and file picker selection
- TRANSFER_STARTED tracking when user initiates transfer
- FILE_UPLOADED tracking per-file after successful multipart upload
- UPLOAD_FAILED tracking on upload finalization failure
- PRICING_VIEWED tracking on pricing page load
- PLAN_SELECTED tracking when user selects a subscription plan
- FILE_UPLOADED and UPLOAD_FAILED enum values and convenience functions in posthog lib

## [1.11.0] - 2026-02-24

### Added

- Inline transfer options within UploadPanel (removed separate TransferOptionsPanel)
- StepIndicator for download page multi-gate progress (Email > Code > Password)
- OfferCatalogJsonLd structured data on pricing page for SEO
- Onboarding tooltip sequence after first transfer completion
- Mobile upgrade banner in Header for free-tier authenticated users
- Searchable FAQ accordion in AccountPanel help section
- Blog related articles section and CTA on post detail pages
- SectionIndicator, StepIndicator, AccordionItem, OnboardingTooltip shared components
- Slide animations for form view transitions
- Social proof stats bar on hero section

### Changed

- Merged email + OTP into single inline flow on download page
- Removed phone auth tab from AuthPanel (email-only)
- Rewrote hero copy targeting freelancers
- Extracted blog PostCard into reusable component
- Updated about page with animated counters, how-it-works carousel with drag support

### Fixed

- Chat store false unread count on cold start, persist badge to localStorage

## [1.10.0] - 2026-02-23

### Added

- Blog table of contents navigation and social share buttons (LinkedIn, Facebook, WhatsApp, Email, Copy Link)
- AES-GCM encryption for multipart upload state in sessionStorage
- Session token authentication for password-protected transfers (replaces plain password passing)
- `/jobs` and `/press` pages with layout components
- `LegalPageLayout`, `TableOfContents`, and `MobileTocButton` shared components
- DOMPurify integration for XSS protection on HTML content
- `security.txt` at `/.well-known/security.txt`
- Dynamic `robots.ts` (replaces static `robots.txt`)
- Cache control headers for HTML pages in middleware
- Metropolis Black and ExtraBold font weights

### Changed

- Migrated `payment-api` from raw axios to centralized `apiClient` wrapper
- Refactored `streamZipDownload()` and `getFilePreviewUrl()` to accept options objects
- Renamed `transferPassword` to `passwordSessionToken` throughout drawer store
- Tightened CSP: specific Wasabi region URLs instead of wildcards, deduplicated PostHog domains
- Added `upgrade-insecure-requests` CSP directive
- Middleware route matcher changed to catch-all for broader coverage
- Blog pagination reduced from 10 to 5 posts per page
- Blog post cards use side-by-side image/content layout

### Removed

- `/advertisers` page and all related translations
- `public/OG-IMAGE-README.md`
- `<SentryProvider>` wrapper (simplified Sentry integration)

## [1.9.0] - 2026-02-22

### Added

- Cookie consent banner with analytics opt-in/opt-out
- Legal consent modal for terms and privacy acceptance on auth flows
- EU Representative section placeholder in privacy policy
- Marketing consent toggle in Data & Privacy account settings
- Analytics cookie consent toggle in Data & Privacy account settings
- Legal terms acceptance status display in account settings
- PostHog consent-aware initialization (respects cookie preferences)
- New `usersApi` methods: `getLegalConsent`, `acceptLegalTerms`, `updateCookieConsent`

### Changed

- Legal entity updated to "Infobulle, registered in Togo" across terms and privacy
- Governing law changed from French law / Paris courts to Togolese Republic / Lome courts
- Removed CNIL-specific references (complaint authority, 13-month cookie rule attribution)
- Tax law retention reference changed from "French tax law" to "applicable tax and commercial law"
- International data transfers section reframed for non-EU entity operating with EU providers
- Complaint section now references generic local data protection authority with EDPB link
- About page redesigned with dark fan capability cards
- How It Works page fully redesigned with expanded content
- Help page layout improvements
- Footer redesigned
- Auth panels updated with legal consent checkboxes
- OTP verification flow updated with consent integration
- Subscription panel updated

## [1.8.0] - 2026-02-21

### Added

- Shared `PageHero` component for consistent page headers across static pages
- About page: scroll-reveal animations, capabilities slideshow, trust carousel, brand cross decorations

### Changed

- About page hero title: "Get paid before they download" (more active, specific)
- About page Africa section: "Built where it matters" with tighter, non-repetitive body copy
- About page trust pill: "No passwords needed" instead of jargon "Passwordless auth"
- About page value title: "Getting you paid comes first" for clarity
- About page CTA button: "Send your first file" (more personal)
- Replaced all double-hyphen (--) with proper em dashes in EN translations
- Refreshed copy across blog, contact, help, how-it-works, jobs, press, privacy, and terms pages
- Updated SEO metadata for About page
- All copy changes applied to both EN and FR translations

## [1.7.0] - 2026-02-20

### Added

- Contact Us page (`/contact-us`) with form submission (name, email, message, category checkboxes)
- Chat widget integration on contact page (opens AI support chat)
- Threads and X (Twitter) social media links across Footer, DrawerFooter, contact page, and JSON-LD
- `/contact-us` route added to middleware matcher

### Changed

- Social media handles unified to @zefilehq across all locations
- EN/FR translations: removed robotic copy ("successfully", "Veuillez"), fixed French accents, humanized wording per voice guide
- Updated OG image

## [1.6.2] - 2026-02-19

### Fixed

- Header blank flash fully eliminated using `useLayoutEffect` for sync auth state initialization (fires before browser paint)

## [1.6.1] - 2026-02-19

### Fixed

- Blank header flash on page load — auth state now set immediately from localStorage before async server verification
- Help Center page redesigned with search, accordion FAQs, and 2-column grid layout

### Changed

- Contact email updated from `support@zefile.io` to `hello@zefile.io` across Footer, Subscription, Terms, and Privacy pages

## [1.6.0] - 2026-02-19

### Added

- Real content for About, How It Works, Help Center, and Advertisers pages (EN/FR)
- Security headers in middleware (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- WebApplicationJsonLd with AggregateOffer and @id graph linking
- Footer on pricing and blog pages

### Changed

- Rewrote JSON-LD schema: SoftwareApplication → WebApplication, removed deprecated HowTo and conflicting Product schemas
- Fixed title duplication across 6 layouts (removed "ZeFile" from sub-page titles to avoid double with template)
- Fixed robots.txt broken regex patterns with simple prefix-based rules
- Fixed `_headers` removing x-robots-tag: noindex from OG images and favicons
- Sitemap uses static lastModified dates instead of dynamic `new Date()`
- Removed noindex from about, how-it-works, help, advertisers pages
- Disabled X-Powered-By header in next.config.ts

## [1.5.0] - 2026-02-19

### Added

- Blog list page (`/blog`) with responsive 2-column grid, pagination, skeleton loading, and error retry
- Blog post page (`/blog/[slug]`) with cover image, prose-styled HTML content, and alternate locale link
- Blog API service (`services/blog-api.ts`) for public blog endpoints
- ArticleJsonLd and BreadcrumbJsonLd structured data components for SEO
- Dynamic sitemap integration for published blog posts by locale
- Blog translations (EN/FR) for all UI text
- `/blog` and `/blog/*` routes in middleware matcher

### Changed

- JsonLd ArticleJsonLd image uses ImageObject format with dimensions for rich results
- Existing page layouts updated with hreflang alternate links

## [1.4.0] - 2026-02-18

### Added
- Custom branding, custom domain, custom wallpaper features in subscription tier system
- Dynamic tier feature display in SubscriptionPanel, PlanCard, and FeatureComparisonTable
- Jobs page (`/jobs`) with EN/FR translations
- Press page (`/press`) with EN/FR translations
- `/jobs` and `/press` routes in middleware matcher

### Changed
- DrawerFooter links now close the SideDrawer before navigating
- PostHogProvider uses `window.location.search` instead of `useSearchParams()` hook
- Home page uses `URLSearchParams` in mount effect instead of `useSearchParams()`
- Static pages (terms, privacy, about, help, how-it-works, advertisers) no longer use fake loading pattern
- JSON-LD script tags include `suppressHydrationWarning` for PostHog compatibility

### Fixed
- Hydration mismatch caused by PostHog injecting scripts before React hydration
- `useParams` typed destructuring in download page to avoid proxy enumeration warning
- PostHog `disable_external_dependency_loading` prevents DOM mutation before hydration

## [1.3.0] - 2026-02-18

### Added
- Custom Domain settings panel in Account page (STARTER/PRO tiers)
- `useCustomBranding` hook: reads branding cookie, applies white-label styling to download page
- `BrandedHeader` component for custom-domain download pages
- `custom-domain-api.ts` service for domain CRUD, branding, logo/favicon uploads
- Custom domain URL display in TransferDetailsPanel and TransfersPanel
- `buildCustomDomainUrl()` utility in clipboard utils
- i18n keys for custom domain panel (EN + FR)

### Changed
- Download page supports white-label rendering when accessed via custom domain
- AccountPanel sidebar includes Custom Domain section
- Drawer store supports `custom-domain` view
- Updated OG image

### Fixed
- CSS injection prevention: hex color validation on branding cookie values
- URL injection prevention: domain allowlist for logo/favicon URLs from cookie
- Company name sanitization (HTML tag stripping)
- Favicon cleanup on unmount (restores original favicon)
- Domain input validation with real-time error feedback
- SVG removed from logo uploads (XSS prevention)
- File upload input positioning (label wrapper pattern)
- ARIA attributes on toggle switches and icon buttons
- `ConfirmationModal` props (`isOpen`, `type` instead of `variant`)
- `toast.error()` calls now use `response.error.message` (type safety)

## [1.2.0] - 2026-02-17

### Added
- Privacy and terms pages
- Dynamic sitemap generation (`app/sitemap.ts`)
- OG image for social sharing
- SoftwareApplication JSON-LD structured data
- Google/Yandex verification meta tags support

### Changed
- Rewrite all UI translations (EN + FR) with ZeFile brand voice
- Update SEO meta tags and layout across all pages
- Adjust HeroText font sizes for consistency

### Fixed
- Loading screen z-index now covers chat widget during page load

## [1.1.0] - 2026-02-17

### Added
- AI support chat widget with context-aware conversation starters, escalation to human agents, and satisfaction rating
- Support API service (`support-api.ts`) and chat store (`chat-store.ts`) for conversation state management
- Country flag SVGs (CI, GH, KE, NG, SN, ZA) in small/medium/large sizes for currency switcher
- `react-flagpack` dependency for flag rendering
- Support chat translations (en/fr)
- Transfer context injection into chat widget on download page

### Changed
- Moved poll widget and chat button to bottom-right with coordination: poll auto-hides when chat opens, reappears 2s after chat closes
- Updated LoadingFullscreen and LoadingPanel with improved animations
- Updated KYC, payment, and subscription panels with currency flag integration
- Improved multipart upload chunk handling in `multipart-upload.service.ts`
- Updated currency switcher with flag icon display

## [1.0.2] - 2026-02-14

### Changed
- Platform fee fallback defaults: FREE 15% → 10%, STARTER 10% → 7% (Epic 37)
- Updated comments in platform-api.ts to reflect new fee percentages

### Fixed
- Charge info tooltip on upload form now dismisses on click-outside

## [1.0.1] - 2026-02-12

### Fixed
- Download pages and preview components updated for CDN streaming (Epic 31)

## [1.0.0] - 2026-02-12

### Added
- Semantic versioning infrastructure
- npm version lifecycle scripts (`preversion`, `postversion`)
- This CHANGELOG file

### Changed
- Bumped package version from `0.1.0` to `1.0.0`
