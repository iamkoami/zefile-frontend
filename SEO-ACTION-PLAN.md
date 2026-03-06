# ZeFile.io -- SEO Action Plan (v2)

**Updated:** March 5, 2026
**Current Score:** 82/100 (post-fix)
**Target Score:** 90+/100

---

## Status of v1 Action Items

Many v1 items were based on incorrect audit findings. Here's what actually happened:

| # | v1 Action Item | Status | Notes |
|---|----------------|--------|-------|
| 1 | Add meta descriptions to 5 pages | ALREADY DONE | All pages had `generateMetadata()` -- v1 audit missed this |
| 2 | Add H1 to pricing page | ALREADY DONE | `PageHero` renders `<h1>` -- v1 audit missed this |
| 3 | Populate blog with content | STILL NEEDED | Blog remains empty |
| 4 | Add FAQJsonLd to help page | FIXED (v2) | 11 Q&A pairs now rendered in layout |
| 5 | Fix blog rendering for crawlers | NEEDS VERIFICATION | Unclear if blog listing is SSR |
| 6 | Add hreflang to all pages | ALREADY DONE | All page layouts have alternates |
| 7 | Enable BreadcrumbJsonLd on all pages | ALREADY DONE | Active on 9+ layouts |
| 8 | Enable ContactPageJsonLd | ALREADY DONE | Active on /contact-us |
| 9 | Enable OfferCatalogJsonLd | ALREADY DONE | Active on /pricing |
| 10 | Add /security and /press to sitemap | FIXED (v2) | Added /security, /press, /jobs |
| 11 | Fix contact page title | FIXED (v2) | Removed duplicate "ZeFile" |
| 12-18 | Content & growth items | STILL NEEDED | See updated plan below |

---

## Remaining Action Items

### P1 -- High Impact (Do This Month)

#### 1. Populate the blog

**Impact:** Very High (content drives organic traffic + AI search citations)
**Effort:** Ongoing

Start with 5-10 foundational articles:
- "How to Get Paid Before Sending Files to Clients"
- "ZeFile vs WeTransfer: Which Is Better for Freelancers?"
- "5 Ways Freelancers Lose Money on File Delivery"
- "How Payment-Gated File Transfer Works"
- "The Complete Guide to Secure File Sharing for Creatives"

Each post should target a keyword cluster and include FAQ schema.

#### 2. Create comparison landing pages

**Impact:** High (comparison keywords have high purchase intent)
**Effort:** 2-3 days

- `/compare/wetransfer` -- "ZeFile vs WeTransfer"
- `/compare/dropbox-transfer` -- "ZeFile vs Dropbox Transfer"
- `/compare/google-drive` -- "ZeFile vs Google Drive for Freelancers"

#### 3. Add customer testimonials / social proof

**Impact:** High (E-E-A-T trust signals improve rankings)
**Effort:** Ongoing

- Collect user testimonials after successful transfers
- Display on homepage and pricing page
- Add AggregateRating schema when review data is available
- Consider G2, Trustpilot, or Product Hunt listing

#### 4. Create use-case landing pages

**Impact:** Medium-High (targets niche freelancer segments)
**Effort:** 2-3 days

- `/for/photographers` -- "File Transfer for Photographers"
- `/for/videographers` -- "Video Delivery for Videographers"
- `/for/designers` -- "Design File Delivery for Designers"
- `/for/musicians` -- "Music File Delivery for Musicians"

---

### P2 -- Medium Impact (Do This Quarter)

#### 5. Add hreflang annotations to sitemap

**Impact:** Medium (strengthens international SEO signals)
**Effort:** 30 min

Add `<xhtml:link>` elements for EN/FR alternates in sitemap.xml. Currently, hreflang is in page `<head>` (good) but missing from sitemap (less good).

#### 6. Generate dynamic OG images for key pages

**Impact:** Medium (improves social sharing CTR)
**Effort:** 1 day

Blog posts already have dynamic OG images. Extend to:
- /pricing (show plan highlights)
- /about (show brand messaging)
- /how-it-works (show step summary)

Use Next.js `ImageResponse` API (already used for blog).

#### 7. Improve internal cross-linking

**Impact:** Medium (distributes PageRank, improves crawl depth)
**Effort:** 1 day

Add contextual links:
- Pricing -> "See how it works" -> /how-it-works
- How-it-works -> "Choose your plan" -> /pricing
- About -> "Get started" -> homepage
- Help -> Related article links -> blog posts
- Blog posts -> Related posts section

#### 8. Add metadata to /security, /press, /jobs pages

**Impact:** Low-Medium (SEO completeness)
**Effort:** 20 min

These pages exist and are now in the sitemap but have minimal or no `generateMetadata()` exports. Add unique titles, descriptions, OG tags.

#### 9. Verify blog SSR rendering

**Impact:** Medium (client-rendered content may not index well)
**Effort:** Variable

Check if blog listing page renders post titles in initial HTML. If not:
- Move to server component
- Use `generateStaticParams` for blog posts
- Ensure post links are in server-rendered HTML

---

### P3 -- Nice to Have (Backlog)

#### 10. Consider URL-based locale routing

**Impact:** High for international SEO (significant effort)
**Effort:** 1-2 weeks

Current: Same URL serves EN/FR based on cookie.
Recommended: `/en/pricing` and `/fr/pricing` with proper hreflang.
Evaluate ROI for French market before committing.

#### 11. Add video content

**Impact:** Medium (video results in SERPs)
**Effort:** 1-2 weeks

- Product demo on homepage
- How-to video on how-it-works
- Add VideoObject schema

#### 12. Monitor Core Web Vitals

**Impact:** Medium (ranking signal)
**Effort:** 15 min setup

- Set up CrUX monitoring
- Track LCP, INP, CLS over time
- Address image optimization when Cloudflare Pages supports it

#### 13. Add SearchAction to WebSite schema

**Impact:** Low (sitelinks search box in SERPs)
**Effort:** 30 min

Add SearchAction if site-wide search is implemented.

#### 14. Add image sitemap entries

**Impact:** Low (helps image search indexing)
**Effort:** 30 min

Extend sitemap with image entries for pages with key visuals.

---

## Implementation Roadmap

### This Week
- [x] FAQJsonLd on /help page
- [x] manifest.json created
- [x] /security, /press, /jobs in sitemap
- [x] Contact page title fixed
- [x] Pricing header link crawlable
- [ ] Add metadata to /security, /press, /jobs pages
- [ ] Verify blog SSR rendering

### This Month
- [ ] Publish first 5 blog posts
- [ ] Create 1 comparison page (ZeFile vs WeTransfer)
- [ ] Create 1 use-case page (/for/photographers)
- [ ] Improve internal cross-linking
- [ ] Add hreflang to sitemap

### This Quarter
- [ ] 15+ blog posts published
- [ ] 3 comparison pages live
- [ ] 4 use-case pages live
- [ ] Dynamic OG images for all key pages
- [ ] Customer testimonials on homepage + pricing
- [ ] AggregateRating schema when reviews exist
- [ ] Evaluate URL-based locale routing

---

## Score Progression

| Milestone | Score | Key Driver |
|-----------|-------|------------|
| v1 audit (before fixes) | 72/100 | Baseline |
| v2 audit (after fixes) | 82/100 | FAQ schema, sitemap, crawlable links |
| After blog launch (est.) | 86/100 | Content + comparison pages |
| After social proof (est.) | 90+/100 | Testimonials + review schema |

---

*Updated after v2 deep codebase audit on March 5, 2026.*
