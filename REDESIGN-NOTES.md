# Redesign implementation and review

Implemented locally in the existing React 19/Vite application. Nothing has been deployed to the live domain.

## What changed

The homepage now follows this order: responsive utility/header navigation; four-slide hero; concise company introduction; popular-product carousel; six category cards; buyer differentiators; six industry applications; a single B2B enquiry section; corporate footer. WhatsApp, email and call actions remain visible across pages.

The hero fades over 800 ms and rotates every 5.5 seconds. Hover, keyboard focus and document visibility pause autoplay. Arrow/dot/keyboard/swipe interaction stops rotation until the visitor explicitly restarts it. Reduced-motion preference disables autoplay and transitions. Inactive slides are inert; first-slide content is immediately visible. Product browsing uses a native scroll-snap carousel with arrows, keyboard support and touch scrolling, without autoplay. Wide screens show four cards, tablets two and phones approximately 1.2.

The full catalogue is available at `#products`, with category deep links, search, empty state and pagination. All 115 product records, six categories, original `#/product/cN-N` URLs and legacy reference aliases are retained. Product details retain quote quantities, destination, related products and adjacent-product links. Quote links prefill the enquiry form.

The old manufacturing/introduction/commitment blocks were merged. The full homepage product grid, decorative pyramid, repetitive process blocks, testimonial carousel and unverified numbers/certification badges are no longer rendered. Company, process, quality, manufacturing and FAQ anchors lead to concise company/purchasing guidance. Original unused components, styles, assets and the nested backup folder remain available as reference.

## Files created

- `src/components/Header.jsx`: sticky navigation, brand, verified/configured social links, category dropdown, mobile menu.
- `src/components/HeroSlider.jsx`: data-driven hero and accessible carousel behavior.
- `src/components/HomeSections.jsx`: about, popular products, categories, differentiators, industries and company guidance.
- `src/components/ProductCard.jsx`: shared product presentation and quote links.
- `src/components/Icon.jsx`: consistent SVG icon family.
- `src/components/Footer.jsx`: corporate footer and floating contact controls.
- `src/config/business.js`: shared business and contact URLs; configurable social/legal links.
- `src/data/catalogue.js`: catalogue adapters, category images, featured selection and route helpers.
- `src/styles/site.css`: centralized tokens and the active responsive stylesheet.
- `src/.env.example`: documented optional configuration.
- `src/assets/{mint,carrier,essential}-{wide,small}.webp`: six optimized derivatives of existing imagery.
- `public/favicon.svg`, `public/og-cover.webp`: valid favicon and social preview assets.
- This report.

## Files modified

- `src/App.jsx`: page composition and preserved hash navigation; supportable organization schema.
- `src/main.jsx`: one active stylesheet, replacing the old cascade of competing overrides.
- `src/productUtils.js`: image mapping, preserved URL aliases and safe malformed-ID handling.
- `src/sections/Products.jsx`, `ProductDetail.jsx`, `Contact.jsx`, `FAQ.jsx`: updated browsing, product enquiries and purchasing guidance.
- `src/Reveal.jsx`: existing reduced-motion state initialized safely; kept for retained old components.
- `index.html`: meaningful initial HTML, title/description/canonical/social metadata, responsive first-image preload; removed unsupported FAQ/certification schema and missing asset references.
- `eslint.config.js`: excludes temporary QA/cache folders and the inactive nested source backup.
- `.gitignore`, `README.md`: temporary tooling exclusions, setup and configuration instructions.

No new application dependencies were introduced. Temporary Sharp, Playwright and Prettier tools were installed only in ignored `.qa` for asset preparation, browser verification and formatting. Dependencies were restored with `npm install` after Windows initially locked an existing native compiler file during `npm ci`.

## Responsive, accessibility and performance work

Sticky header with measured scroll offset; compact mobile disclosure menu; Escape dismissal; skip link; visible focus; inert inactive slides; reduced motion; labelled contact controls and form inputs; native validation and loading/error states. Mobile form inputs use 16 px text. Floating controls respect bottom safe areas and are hidden while mobile navigation is open or an enquiry input is focused.

Hero images use responsive WebP sources, eager/high priority only for the initial image and lazy loading for the remaining slides. Below-fold images have dimensions and lazy loading. Three wide WebP assets are about 75–117 kB each instead of multi-megabyte PNGs. The application uses local font fallbacks and native animation/scrolling, with no new animation library. The built main JS is approximately 242 kB (76 kB gzip), and CSS approximately 29 kB (6.5 kB gzip).

Core Web Vitals field targets have not been measured or claimed. Existing hash product URLs remain compatible, but do not provide independent crawlable product pages; prerendered product landing pages would need a separate routing/hosting change.

## Verification

Executed `npm run lint` and `npm run build`: passed. There is no existing type-check or unit-test script in this JavaScript project.

Headless Chrome checks (`node .qa/browser.cjs`, `node .qa/extra.cjs`, `node .qa/focus.cjs`) passed:

- Homepage at 375, 768, 1024, 1440 and 1920 px: no horizontal overflow or broken loaded images.
- Catalogue, product detail, quality and FAQ pages at all five widths: no horizontal overflow.
- All 115 product URLs, representative legacy product-reference alias and malformed product ID.
- Search, category deep links, pagination, reset/empty state and quote-product prefill.
- Hero autoplay, arrows, indicators through active state, keyboard navigation, persistent interaction pause, hover/focus pause and resume, and reduced-motion behavior.
- Chrome touch swipe for the hero and native scroll-snap product browsing controls.
- Sticky header, mobile menu/category links, navigation dismissal and Escape; desktop dropdown focus restoration and a skip link that preserves the current product route.
- Required form validation and honest mailto draft fallback, plus WhatsApp/mailto/tel URL values.
- Legacy FAQ route and native accordion.
- No JavaScript console errors in the main browser suite.

Full mobile and desktop screenshots were captured and visually inspected. Local evidence is in `.qa/report.json`, `.qa/extra-report.json`, `.qa/home-375.png` and `.qa/home-1440.png`. QA tools and artifacts are intentionally excluded from version control. No real messages were sent.

## Before production launch

- Configure the existing EmailJS service/template/public key, confirm allowed origins and provider-side anti-spam/rate limits, then verify real delivery and error behavior. No private credentials or custom server endpoint were introduced. The client honeypot/rate limit is only supplementary. Until configured, visitors explicitly prepare and send an email draft.
- Phone/email defaults were verified at https://www.ayusharomatics.com/ on 18 October 2026: +918267000606 and info@ayusharomatics.com. The locality is preserved from the source; confirm the complete official postal address.
- Confirm the business WhatsApp registration of the reused phone number before launch.
- No verified official social profiles or privacy/terms URLs were supplied. These links are hidden until configured; none were fabricated.
- Current photos are clearly identified as range illustrations. Approved per-product images, especially pine/spice imagery, and actual company/factory photography are still needed. The previous factory illustrations are not presented as verified facilities.
- Certification documents, founding date, production capacities, export-country counts, lead-time guarantees and universal product grades were not independently verified and are not asserted in the redesigned pages.

## Reference review

AOS Products (https://www.aosproduct.com/) informed clear category discovery and prominent enquiry access. Arora Aromatics (https://www.aroraaromatics.com/) informed portfolio-led discovery through its indexed content; direct homepage fetching returned HTTP 429. No competitor copy, imagery, branding or code was used.

