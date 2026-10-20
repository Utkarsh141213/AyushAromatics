# Product browsing enhancement report

Implemented locally in the existing React/Vite app. No deployment or real enquiry was sent.

## Pages reviewed

Homepage, company/about, quality, process/manufacturing and FAQ anchors, all-products catalogue, all six category listings, all 115 product records, product-not-found/collection-not-found states, header/footer/contact actions, and the shared quote dialog.

## User experience

- Shared left category navigation on PLP and PDP. All six categories come from the original catalogue. Each category expands to product links, with the selected category/product highlighted. There are no supplied subcategories; none were invented. The renderer supports configured subcategory links when real records become available.
- The sidebar stays below the measured sticky header and stops within the browsing section before the footer. Below 1000 px it becomes a collapsed category accordion.
- Category pages now include a relevant range illustration, category-specific introduction, sourcing notes, bulk-quote CTA, searchable list-style product entries, category filter and pagination. Entries include catalogue reference, product name, available botanical reference, readable description, application-suitability guidance, details link and a quote action.
- Product pages follow the supplied sidebar-and-main-column reference: image/gallery, H1, botanical reference where sourced, key facts, bulk quote and enquiry actions, followed by overview, available botanical/process/origin information, specification table, supply/document requests, buyer questions and related products. Gallery support is ready for approved images; a single labelled range illustration is used where real product photography is missing.
- Request Quote opens the same native modal from listing entries, product pages, related products, homepage product cards and the header. Product pages stay in place. The selected product/code and documentation/specification intent are prefilled.
- The modal supports keyboard focus containment, Escape/backdrop/close-button dismissal, focus restoration, body-scroll locking, phone/email/name/product validation, optional company/quantity/unit/country/message, loading/error/success states and duplicate-send protection.
- Shared typography now uses 16 px body text, 32-40 px browsing H1s, 20-24 px product headings, 14 px form labels and 15-16 px primary controls. Forest green, ivory, charcoal and restrained gold tokens are shared across the site. Floating contact actions are hidden while a modal is open.

## Components and files

Created `CategorySidebar`, `Breadcrumbs`, `ProductListItem`, `ProductDetailSections`, `ProductSpecificationTable`, `RelatedProducts`, `PageMetadata`, `QuoteModal`, `QuoteProvider`, `QuoteContext`, and `useQuote`.

Modified `App`, `main`, `Header`, `ProductCard`, `Products`, `ProductDetail`, `Contact`, and the catalogue adapter. Shared palette tokens remain in `src/styles/site.css`; product browsing and modal styles are scoped in `src/styles/catalogue.css`.

Content is separate from presentation:

- `src/json/products.json`: original 115 records and six categories, unchanged.
- `src/data/productContent.js`: category editorial content, sourced general botanical references, and structured null/default technical fields.
- `src/data/approvedProductContent.json`: initially empty, reserved for business-approved records keyed by catalogue reference.
- `src/data/catalogue.js`: single catalogue adapter, stable legacy IDs, descriptive slugs and route resolution.
- `src/services/enquiries.js`: shared EmailJS provider adapter, email-draft generation, validation and submission guards.

No application dependencies were added. Playwright, axe-core and Prettier were used only from ignored temporary `.qa` tooling.

## Routes

Preferred links now use descriptive hashes:

- All products: `#products` (also `#/products`).
- Categories: `#/products/mint-products`, `#/products/aromatherapy-oils`, `#/products/essential-oils`, `#/products/carrier-oils`, `#/products/spice-oil-oleoresins`, `#/products/pine-oils-derivatives`.
- Example PDP: `#/products/essential-oils/ambrette-seed-oil`.

All original `#/product/c{categoryIndex}-{itemIndex}` routes, catalogue-reference aliases such as `#/product/c2-AA041`, and `#products?category=...` links remain supported. Unknown/malformed browsing links show explicit not-found states. Homepage/company/contact links remain intact.

Category and product titles, descriptions and social metadata update per route. Organization and category/product breadcrumb schema use known identity/navigation data. The existing root canonical is preserved. These are client-rendered hash URLs, not independently indexable server paths; prerendered pages and hosting rewrites remain a separate SEO/hosting task. Core Web Vitals targets were not claimed.

## Content gaps and approval workflow

No approved supplier technical profiles, laboratory values, CAS/INCI records, packaging/MOQ details, batch origins, shelf-life values or authentic technical PDFs were supplied. Their fields remain structured nulls/empty arrays. The public table shows actual catalogue identity and only populated approved specifications. Missing information leads to a specification or documentation request, not a made-up number or fake download.

Limited general botanical background is separately labelled and linked to primary sources for ambrette seed, lavender and Eucalyptus globulus. It is not represented as a supplied-batch specification, certification, geographic origin or medical claim. References: Kew Science (https://powo.science.kew.org/taxon/558023-1), PROSEA (https://prosea.prota4u.org/view.aspx?id=76), EMA lavender (https://www.ema.europa.eu/en/medicines/herbal/lavandulae-aetheroleum), EMA eucalyptus (https://www.ema.europa.eu/en/medicines/herbal/eucalypti-aetheroleum).

Populate `approvedProductContent.json` by catalogue reference only after business approval. Each record can provide `shortDescription`, `overview`, `botanicalSource`, `manufacturing`, `origin`, `cultivation`, `seasonality`, `applications`, `gallery`, `specifications`, `packaging`, `documents`, and `faqs`. Specifications use the keys in `specificationFields`; packaging supports `options`, `minimumOrder` and `supplyDetails`. Gallery records use `src`, `alt` and optional `illustration`; documents use genuine `label`/`url`; FAQs use `question`/`answer`. Do not put placeholder values in this file: leave absent values empty until verified.

Product-specific imagery, approved application statements and any actual subcategory hierarchy are still needed from the business. Existing contact defaults/social/legal configuration were preserved.

## Enquiry status

The existing EmailJS integration is retained and centralized. Set `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, and `VITE_EMAILJS_PUBLIC_KEY` in `src/.env.local` to connect it. Its template receives name, company, email/reply_to, phone, product/productCode, quantity/unit, country and a combined message. Only public identifiers belong in VITE_ variables.

With no provider configuration, the modal explicitly states that online submission is not connected. It validates the required details before revealing an email draft link. The visitor must send that draft from their email client; there is no false success and no navigation away from the PDP. The existing homepage contact draft behavior is preserved.

Provider acknowledgement is required for the sent state. Errors retain form details, show a clear message and offer direct email. A per-form ref and shared adapter guard prevent concurrent duplicate requests, with a one-minute post-success throttle. Provider-side allowed origins, abuse controls and real delivery must be verified before production. The adapter is the documented replacement point for a future server-owned enquiry endpoint; no custom backend was fabricated.

## Verification

Commands run successfully: `npm run lint`, `npm run build`, `node .qa/plp-pdp.cjs`, `node .qa/accessibility.cjs`, and `node .qa/enquiry-states.cjs`, and `node .qa/final-browse-smoke.cjs`.

Browser checks in Chrome covered:

- All six category pages and their pagination; 115 unique descriptive PDP links and all 115 legacy numeric URLs; reference aliases, old category queries and malformed/unknown routes.
- Search by name/reference/botanical reference, category filtering, reset and empty state.
- Correct product/intent prefilling, no route change when opening a quote, forward/reverse Tab containment, Escape, focus restoration and scroll unlocking.
- Required fields, invalid email/phone, quantity/unit in the email draft, and an explicit unsent/pending-integration state.
- Home/company/quality/FAQ/catalogue/category/product layouts and the modal at 375, 768, 1024, 1440 and 1920 px: no horizontal overflow.
- Mobile category accordion/navigation, mobile header quote/focus fallback, sticky header/sidebar positioning and no sidebar/footer overlap.
- No broken loaded images or JavaScript page errors. Desktop/mobile PLP, PDP and modal screenshots were captured and visually inspected.
- axe-core WCAG 2 A/AA and 2.1 AA checks: zero reported violations on home, company, essential-oil PLP, ambrette PDP and the modal. This automated result is not a claim of complete accessibility conformance.
- Provider loading/success/failure, retained fields, duplicate-submit guard and post-success throttle were tested on an isolated local server with dummy identifiers and intercepted HTTP responses. No actual email request reached a provider. Live delivery remains unverified.

Local evidence: `.qa/plp-pdp-report.json`, `.qa/accessibility-report.json`, `.qa/enquiry-states-report.json`, and `.qa/{plp,pdp}-final-{desktop,mobile}.png`. There is no existing TypeScript/type-check or unit-test script in this JavaScript project.

The AOS listing/detail references informed information architecture only. No competitor text, assets, specifications, reviews or branding were copied.

