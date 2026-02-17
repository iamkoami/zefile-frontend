# Changelog

All notable changes to the ZeFile Frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
