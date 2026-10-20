# Ayush Aromatics

React 19 + Vite. The application lives in this folder, inside the outer AyushAroma-main directory.

## Run locally

Use Node.js 22.12+ or Node.js 24. In PowerShell:

```powershell
cd "C:\Users\utkarsh.s\Downloads\AyushAroma-main\AyushAroma-main"
npm ci
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173). If another terminal is already running Vite, stop it with Ctrl+C before reinstalling dependencies; Windows can lock the native compiler file.

```powershell
npm run lint
npm run build
npm run preview
```

Preview normally runs at http://localhost:4173. No backend is needed for catalogue browsing.

## Business configuration

`src/config/business.js` is the shared contact and social configuration. Phone and email defaults were verified on https://www.ayusharomatics.com/ on 18 October 2026. The locality comes from the existing source; confirm the full postal address before launch. Existing logo and product-range imagery are reused.

Copy `src/.env.example` to `src/.env.local` to override configuration. Vite reads environment files from `src` (see `vite.config.js`). Restart Vite after changes. All VITE_ values are public browser configuration, never private secrets. Social and legal links are hidden until configured; confirm account ownership and legal pages before adding them.

## Enquiries

The existing EmailJS integration is retained. Set the service ID, template ID and public key in `src/.env.local`. The template receives `name`, `company`, `email`, `reply_to`, `phone`, `product`, `productCode`, `quantity`, `unit`, `country`, and `message`. `message` includes product, quantity and country so older templates still receive these details.

Without EmailJS configuration, the button explicitly prepares a mailto draft; visitors must send it in their email application. There is no simulated success. Provider errors show a direct email alternative. Required fields, email syntax, maximum lengths, a honeypot and client rate limiting are included. They do not replace server-side abuse protection: configure allowed origins, provider rate limits and the appropriate EmailJS anti-spam controls before enabling production submissions. No custom server endpoint was added. Never put private EmailJS credentials in VITE_ variables. Verify delivery and provider settings in a real staging submission before launch.

## Navigation & content

- Home: `#`; catalogue: `#products`.
- Category: `#/products/mint-products` (old `#products?category=Mint%20Products` links still work).
- Product: `#/products/essential-oils/ambrette-seed-oil`. Original `#/product/c{categoryIndex}-{itemIndex}` URLs and catalogue-reference aliases remain supported.
- Quote: `#contact?product=Menthol%20Crystals`.
- Company: `#/company`; old `#process`, `#manufacturing` and `#quality` links remain reachable.
- All 115 product records and six original category names remain in `src/json/products.json`.
- The homepage uses a popular-products carousel and category grid instead of duplicating the full catalogue.
- Archived old components/styles and `ayush-aromatic-updated` are retained as reference but are not imported by the application. The inactive nested copy is excluded from lint.

The homepage combines the old manufacturing, introduction and commitment sections into concise company and buyer information. Repetitive process blocks, the decorative pyramid, testimonials and unsupported statistics/certification badges are no longer rendered. Quality and purchasing guidance remain available on the company page. Claims such as 110+ export countries, founding year, certification status, guaranteed lead times and universal product grades must be independently confirmed before reintroduction.

## Imagery & SEO

Responsive WebP versions of existing assets are used for hero imagery; only the first image is prioritized/preloaded, with other slides and below-fold images lazy-loaded. The first hero content is visible immediately and there is no reveal dependency. Local font fallbacks avoid external font loading. Original source images remain available.

Current photos are range illustrations, not verified per-product photographs or facility photographs. Replace them with approved product-specific images, especially for spice and pine categories, when available. Do not infer specifications from an illustration.

Titles, description, canonical URL, social preview image and an organization schema use supportable information; unsupported FAQ schema and missing favicon references were removed. Existing hash URLs are preserved. Product hashes are not independently crawlable pages; a future prerender/routing project would be needed for individually indexed product landing pages. No Core Web Vitals target is claimed without field measurement.

## Review notes

See `PLP-PDP-NOTES.md` for current product-page, quote-modal, content approval and QA details; `REDESIGN-NOTES.md` records the initial homepage redesign. This change is local and does not publish to the existing domain.

## Product content and quote modal

Category and product pages share the same sidebar and quote modal. Product data remains in `src/json/products.json`; structured editorial/technical fields are defined in `src/data/productContent.js`. Publish approved per-product content in `src/data/approvedProductContent.json`, keyed by catalogue reference. No laboratory values or document downloads are fabricated for incomplete records.

The quote modal collects a required name, email and international phone number, with product prefill. When EmailJS is unconfigured it explicitly shows pending online integration and offers a validated email draft; it does not claim to send that draft. Provider integration is centralized in `src/services/enquiries.js` and shared with the homepage form.

Design tokens are in `src/styles/site.css`; product browsing and modal styling is in `src/styles/catalogue.css`. No new runtime dependencies were introduced.
