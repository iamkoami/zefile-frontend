# Changelog

All notable changes to the ZeFile Frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
