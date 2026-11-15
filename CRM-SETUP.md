# Ayush catalogue admin

The existing React website and the new admin share this repository. Node/Express serves `/api` and the compiled website from one origin. MongoDB stores products, category drafts, published snapshots, company settings, password hashes and expiring login sessions. Images and PDFs are stored in MongoDB GridFS; their bytes count toward your Atlas storage quota. Store only public catalogue assets here, never confidential documents.

## Local use

Use Node 24. Copy `.env.example` to root `.env.local` and fill in the MongoDB URI and initial admin credentials. The root file is backend-only and ignored by Git. `src/.env.local` is the separate existing Vite configuration: never put database credentials there or in any `VITE_` variable.

1. In Atlas, give the app database user read/write access to `ayush_crm` and allow your development machine's outbound IP.
2. Run `npm ci`.
3. Run `npm run crm:setup`. It creates indexes and imports the existing six categories and 115 products. It inserts missing catalogue records; existing edits and admin passwords are preserved on repeat runs.
4. In one terminal run `npm run server`.
5. In another terminal run `npm run dev`.
6. Open `http://localhost:5173/#/admin`. Sign in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the root `.env.local`.

Change the temporary admin password in **Account** after your first login. The bootstrap env password is only used when creating a new account. Existing accounts are never reset by deployment or repeat imports. Change/reset an existing password from Account; email-based recovery is not implemented.

## Editing

- **Products:** search/filter; add/edit title, catalogue code, category, descriptions, gallery/alt text/order, specifications/custom fields, botanical/source/manufacturing information, applications, packaging/MOQ, PDFs, FAQs and SEO fields. Save draft preserves the current public snapshot. Preview opens the actual PDP layout. Publish makes the draft public. Unpublish preserves the editable record.
- **Categories:** list/counts; create/edit category content/image/order; see its assigned products and open their editors. Publish the category before publishing its products. Categories with assigned products cannot be unpublished until the products are moved.
- **General settings:** company name/logo, multiple emails/phones, WhatsApp number, addresses, social/legal links and footer copy. Save publishes settings across the website.
- **Account:** change password. All sessions are revoked when the password changes.

Uploads accept JPEG, PNG, WebP or PDF signatures, with a limit of 8 MB per file. SVG/HTML are rejected. Removed gallery/document entries stop being referenced, but the underlying uploaded bytes are retained; monitor Atlas storage and remove genuinely unused assets with a reviewed cleanup process. Admin sessions expire after eight hours. There is no public signup. Concurrent record edits are checked with a version number; reload a record if another tab saved it first.

## Checks

`npm run build` builds the website/admin. `npm run test:crm` checks password and content validation and exercises the API against isolated, randomly prefixed temporary MongoDB collections. It tests login/CSRF, unauthorized access, draft/publish, stale edits, uniqueness, category protection, settings, GridFS uploads and session revocation. Test collections are cleaned up and existing catalogue collections are preserved.

## Deployment

### Scheduled availability check

`.github/workflows/crm-health.yml` calls `https://ayusharomatics.onrender.com/api/health` every five minutes at minutes 02, 07, 12, etc. It checks for an HTTP success response and JSON `status: ok`; the endpoint also pings MongoDB. It retries transient failures and can be run manually from GitHub Actions. No database or admin secrets are used by the workflow.

GitHub schedules execute only from the repository's default branch (currently `main`), so the workflow must also exist there. CRM source can remain on `feature/mongodb-crm-admin`. Schedules may be delayed, and public-repository schedules can be disabled after 60 days without repository activity. Render's free instance-hour quotas still apply. This is an availability check and does not guarantee uninterrupted uptime or override hosting/database plan policies.

GitHub Pages can continue serving the current static site, but cannot run the CRM backend. To use the live CRM, deploy this repo to a Node host and serve the website and API from the same HTTPS origin. `render.yaml` is a prepared paid Render Starter template; it does not create or purchase a service by itself.

1. Connect the GitHub repository to the host. Set the MongoDB URI as a server secret, `MONGODB_DB_NAME=ayush_crm`, initial `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `NODE_ENV=production`, and `VITE_CRM_REQUIRED=true` **at build time**. The latter prevents showing the old bundled catalogue when the API is unavailable.
2. Allow the host's outbound IP ranges in Atlas. Keep existing database users limited to this database.
3. Build: `npm ci && npm run build`. Initial/pre-deploy: `npm run crm:setup`. Start: `npm start`. Health check: `/api/health`.
4. Test the host's preview domain: login, image upload, save draft, preview, publish, category assignment, settings and logout. Use the same origin; cross-origin API login is intentionally unsupported.
5. Add `www.ayusharomatics.com` as the host's custom domain and update DNS after verification. Leave `APP_ORIGIN` unset to derive it from the request host, or set it to that exact HTTPS origin. HTTPS cookies are enabled in production.
6. When DNS has moved, disable the GitHub Pages workflow to avoid deploying subsequent changes to the previous host. Keep the previous deployment available until the new service is verified.

Atlas Free can pause after 30 days of inactivity. A paid Node host does not remove that database policy; choose a suitable paid Atlas tier if no inactivity pause is required. Configure database backups and monitor storage including GridFS before relying on the CRM as the sole source of catalogue content.

No hosting service, paid plan or DNS change is created by this code. The old GitHub Pages site remains available until the hosting migration is completed.
