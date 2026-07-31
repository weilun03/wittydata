# NDIS Invoice Management System

A rebuild of a simplified NDIS invoicing platform for plan managers: participant, provider, invoice,
and NDIS rate-set management, backed by an official NDIS Excel pricing importer, RBAC-secured
system administration, audit logging, and AI-assisted PDF invoice extraction.

Built for the Witty Data interview assessment. See `reference/` for the original assessment
brief, ERD, and sample files.

## Tech stack

- Next.js 16 (App Router) + TypeScript
- PostgreSQL, queried via Kysely (`pg` driver) — no ORM
- MinIO for object storage (uploaded invoice PDFs)
- OpenAI / OpenRouter for AI-based invoice extraction
- Ant Design + Tailwind CSS for the UI
- argon2 for password hashing

## Setup instructions

### Prerequisites

- Node.js v24
- Docker (for Postgres + MinIO), or your own local instances of both

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `MINIO_ENDPOINT` / `MINIO_PORT` / `MINIO_USE_SSL` | MinIO connection |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | MinIO credentials |
| `MINIO_INVOICE_BUCKET` | Bucket used for uploaded invoice PDFs (created automatically if missing) |
| `OPENAI_API_KEY` / `OPENROUTER_API_KEY` | Provide one of these for AI invoice extraction |
| `AI_MODEL` | Optional override; defaults to a sensible model per provider if unset |
| `SESSION_COOKIE_NAME` | Name of the auth session cookie |

The defaults in `.env.example` match `docker-compose.yml`, so no changes are required if you use Docker.

**AI invoice extraction requires your own API key.** Every other feature (participants, providers,
invoices, rate sets, RBAC, audit logs) works without any key. But `OPENAI_API_KEY`/`OPENROUTER_API_KEY`
ship blank in `.env.example` — without one set, uploading a PDF still stores the file in MinIO
successfully, but extraction fails with a clear `"No AI provider configured"` status in Upload
History rather than crashing.

Note: Free-tier API accounts may have usage limits or rate limits depending on the provider. For
heavy testing or production usage, a paid API plan or higher quota is recommended.

### 3. Start Postgres and MinIO

The project uses SQL initialization scripts (`db/init/`) to create the database schema and seed
required data on a fresh PostgreSQL instance — this is what satisfies the assessment's "Database
migration scripts" deliverable.

```bash
docker compose up -d
```

On first initialization, the Postgres container automatically executes every SQL file in
`db/init/` via `docker-entrypoint-initdb.d`:

- `01_schema.sql` — full schema (tables, constraints, soft-delete columns)
- `02_seed.sql` — RBAC roles/permissions and a default super admin user
- `03_lookup_seed.sql` — static lookup data (genders, pricing regions, etc.)

If you modify any SQL files in `db/init/` after the database volume has already been initialized,
those changes will not be applied automatically. Recreate the volume to re-run the initialization:

```bash
docker compose down -v
docker compose up -d
```

MinIO console is available at http://localhost:9001 (user/pass: `witty` / `wittysecret`).

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

**Seeded login (fresh database only):** `test@wittydata.com` / `Test1234` (Super Admin, matches the reference system's
credentials).

## Feature coverage

**Primary requirements** — participant management, provider management, invoice + invoice item
management (draft/completed status, rate-set/price matching, server-side amount recalculation),
rate-set management, NDIS Excel import (idempotent, field-level diffing, soft-deactivation of
missing rows).

**Secondary requirements** — system user management, authentication (argon2 + DB-backed sessions),
RBAC (role/permission enforcement at the API layer), audit logging (create/update/delete across all
implemented modules, capturing actor, role, permission, entity, before/after diff).

**Extended (AI invoice extraction)** — PDF upload to MinIO, upload history, OpenAI/OpenRouter-based
structured extraction, participant/provider/rate-set/support-item mapping (including name-token
matching with ranked tie-breaking), invoice draft creation with partial-data tolerance.

## Architecture

- `app/` — routes only (pages + `api/` route handlers); no business logic
- `modules/` — feature-grouped UI components (forms, tables) per domain
- `services/` — business logic, validation, orchestration; the sole source of truth for rules
- `repositories/` — Kysely query layer, one per aggregate root
- `lib/` — cross-cutting concerns (db client, session/auth, RBAC checks, MinIO client, AI client,
  audit helper, response envelope)
- `db/init/` — schema + seed SQL, mounted directly into the Postgres container

Route handlers stay thin: parse input → call a service → return the standard
`{ data }` / `{ error: { code, message, details } }` envelope. All validation, rate/price matching,
and amount recalculation lives in `services/`, never in the frontend.

## Assumptions made

**Rate-set, invoice & pricing logic**

- **Rate-set date boundary**: spec only defines start/end-of-day (§9.3) for `invoice_item`; applied
  the same `00:00:00.000Z`/`23:59:59.999Z` convention to `rate_set` for consistent overlap checks.
- **Max-rate tie-break**: §9.3 says latest `start_date`, latest finite `end_date`, highest `id`.
  Implemented as `end_date desc nulls last`
  ([invoice-lookup.repository.ts:47](repositories/invoice-lookup.repository.ts#L47)) — a concrete
  date outranks `NULL` in a tie; untested by real data since every sample price row uses a
  `9999-12-31` sentinel instead of `NULL`.
- **Invoice-number uniqueness when `provider_id` is NULL**: spec doesn't define this case (AI drafts
  can have no provider). Unmapped invoices share one global uniqueness scope via a second partial
  unique index ([01_schema.sql:249-259](db/init/01_schema.sql#L249-L259)).
- **Case sensitivity**: invoice-number uniqueness compares via `lower(invoice_number)` —
  `INV001`/`inv001` treated as duplicates.
- **Completed invoice item requirement**: spec never states a minimum item count; assumed ≥1 item
  to prevent a zero-line-item invoice being marked complete.
- **Cross-field validation beyond the literal rule list**: selected category must belong to the
  resolved rate set, and support item to the selected category — closes a referential gap the
  spec's flat bullet list didn't catch.
- **Rate-set mapping for AI items (§11.4)**: "overlaps with or is fully contained within" — full
  containment is a subset of overlap, so the existing §9.3 overlap check is reused unchanged.
- **Zero name-token match handling (§11.4)**: when every candidate scores 0 token matches, treated
  as "no match" rather than falling through to the `id` tiebreaker (avoids a false-positive
  assignment).
- **Invoice amount for partial AI drafts**: if any item's amount is unresolvable, the whole invoice
  total is left null rather than summing only the resolved items.

**NDIS Excel import**

- **Excel date column format**: columns K/L confirmed (via the sample files) to be literal
  `YYYYMMDD` digits, not Excel serial dates.
- **End-date sentinel handling**: `99991231` is stored literally as `9999-12-31`, not converted to
  `NULL` — spec only says "populate `end_date`."
- **Support-item business key**: kept as `unique(rate_set_id, category_number, item_number)` per
  the SQL spec file and PDF §9.5.2, reading "Column A is the global identifier" as orientation, not
  an override.
- **Multiple price periods**: rows sharing category/item number with different date ranges are one
  support item with two pricing periods, not a duplicate.
- **Support-item sort order**: spec only defines numeric sort for categories; support items assumed
  first-appearance (Excel row) order, post-dedup.
- **Attribute column discrepancy**: PDF §9.5.3 lists 5 columns, the SQL spec file lists 6 (adds
  column AA / `IS_IRREGULAR_SIL_SUPPORTS`). Followed the SQL file, since the PDF names it as the
  complete spec, and AA is confirmed populated in the real workbooks.
- **Blank price cells (M–V)**: treated as "no price for that region" — no row created, not `0`/`NULL`.
- **Missing-line handling**: category/support-item rows deactivated (`deactivated_at` exists); price
  rows hard-deleted (`rate_set_support_item_price` has no soft-delete column —
  [01_schema.sql:103-122](db/init/01_schema.sql#L103-L122)).
- **Sheet recognition heuristic**: only a sheet with cell A1 = `"Support Item Number"` is processed,
  despite the SQL spec saying "process all sheets" — guards against non-catalogue sheets in the
  sample files ("Sheet3", "Support Catalogue").

**Auth, RBAC & audit logging**

- **Single role per session/user**: `auth_session.role_id` is one FK and `setUserRole` replaces
  rather than adds ([user.repository.ts:82-86](repositories/user.repository.ts#L82-L86)), despite
  `rbac_user_role` being many-to-many — a simplification, not a spec requirement.
- **Audit actor role capture**: §10.4 says "role(s)" (plural); `audit_log.actor_role_id` is
  singular — a direct consequence of the single-role-per-session model above.
- **Session expiration duration**: fixed 12-hour TTL, no sliding renewal — spec requires expiry
  handling but not a duration.
- **RBAC permission granularity**: spec's Read/Write/Delete is split into `.create`/`.update` —
  finer-grained, so a role can allow creation without edits.
- **Soft-delete for `gender`/`rbac_role`**: both only have `deactivated_at`, not `deleted_at`
  ([01_schema.sql:127-134](db/init/01_schema.sql#L127-L134),
  [324-332](db/init/01_schema.sql#L324-L332)) — "delete" is deactivation, with Reactivate added back.
- **Auth session Delete vs. Revoke**: Revoke = soft-invalidate (`revoked_at` set, row kept); Delete
  = hard-remove.
- **Audit action mapping for login/logout**: modeled via `auth_session` — login → Create, logout →
  Update (`revoked_at` change) — since Create/Update/Delete has no "auth event" action type.
- **Bulk import audit strategy**: one summary audit entry per Excel import (aggregate counts), not
  one row per touched record — a bulk import can touch thousands of rows across 4 tables.
- **Audit redaction scope**: only `password`/`password_hash`/`token`/`token_hash` are redacted — a
  targeted credential redaction, not a general PII scrubber.
- **Delete behavior for referenced entities**: deleting a referenced Client/Provider is a soft
  delete only, no cascade/block; deleting an Invoice cascades to its own `invoice_item` rows.
- **Additional user deletion safeguards**: the seeded default Super Admin and a user's own account
  can't be deleted — not spec-required, added to prevent lockout.
- **Separate permission scope for invoice uploads**: `invoices.uploads.manage` gates uploaded
  files/history separately from `invoices.read`, since raw PDFs can carry more sensitive data (e.g.
  bank details) than structured invoice fields.
- **Pricing region handling**: `client.pricing_region` is fixed, Excel-import-only reference data —
  no CRUD UI, unlike the user-editable `gender` lookup.

## Trade-offs

- **DB sessions vs. JWT** — matches the spec's explicit "session persistence in database"
  requirement and allows real server-side revocation, at the cost of a DB round-trip per
  authenticated request. `proxy.ts` only does an optimistic cookie-presence check (Next.js
  discourages a DB lookup inside proxy/middleware); the authoritative check is
  `requirePermission()`/`getCurrentUser()` per request.
- **Route-level RBAC vs. middleware abstraction** — `requirePermission()` is called at the top of
  every handler individually, rather than a generic middleware/decorator layer. More repetitive
  across ~20+ route files, but keeps each route legible standalone.
- **Fire-and-forget audit logging** — `recordAuditLog` is called after the mutation commits, never
  inside the same transaction, and never throws (matches the spec's "non-breaking if logging fails"
  requirement exactly). A failed audit write is only visible via `console.error`; there's no retry
  or dead-letter queue.
- **Two delete semantics** — `deleted_at` for primary records (client, provider, invoice, rate_set)
  vs. `deactivated_at` for heavily-FK-referenced lookup tables (gender, role, rate-set lookup
  tables), rather than retrofitting `deleted_at` everywhere for uniformity. Schema-consistent, but
  "delete" isn't one concept app-wide; call sites have to know which kind applies. No generic
  soft-delete abstraction was built either — every repository hand-writes its own
  `.where("deleted_at", "is", null)`, since the two semantics aren't uniform enough to abstract
  over cleanly.
- **DB constraints vs. application checks** — client NDIS-number uses a select-then-insert
  pre-check for a clean per-field error message, but has an acknowledged race window between check
  and insert under concurrent requests (the DB unique index still prevents duplicate data — the app
  just wouldn't catch a resulting race gracefully). Rate-set overlap and invoice-number uniqueness
  instead attempt the write and catch the DB constraint error (`23P01`/`23505`) — race-free since
  Postgres enforces it atomically, at the cost of a less specific error message. The better pattern
  was adopted starting with rate-set (once the GIST exclusion constraint made the trade-off
  obvious) but wasn't retroactively applied to the already-shipped client check.
- **GIST exclusion constraint** on `rate_set` (`btree_gist` extension) added beyond what was
  explicitly asked, to guarantee no two official rate sets ever overlap
  ([db/init/01_schema.sql:1](db/init/01_schema.sql#L1),
  [15-19](db/init/01_schema.sql#L15-L19)) — extra schema complexity traded for a stronger
  data-integrity guarantee than the spec required.
- **Excel import batching strategy** — new rows insert in batches of 500; changed rows on a
  re-import are updated one row at a time (sequential round-trips inside one transaction).
  Correctness-first; sub-second in testing at ~670 rows / ~4,300 prices, but wouldn't scale
  gracefully to a much larger catalogue without moving to a batched `UPDATE ... FROM (VALUES ...)`.
- **Invoice item replacement vs. diff patching** — invoice edits soft-delete all existing items and
  reinsert fresh ones, rather than diffing against existing item IDs. Simpler, still produces the
  correct final state, but `invoice_item.id` churns on every edit and there's no stable item
  identity across saves. For the same reason, audit payloads for invoices/rate-sets only capture
  top-level fields, not the full items array — a full item-level diff would mostly be
  delete-all-then-reinsert noise.
- **Server-authoritative lookup resolution vs. client caching** — cascading invoice-item lookups
  (rate-set resolve, support-items-by-category, max-rate — up to 3 requests per line item) are live
  per-field network calls, rather than fetching a rate set's whole tree once and filtering
  client-side. Traded network chatter for never letting the UI duplicate the server's authoritative
  resolution logic; the same functions (`findRateSetsOverlapping`, `findBestPrice`) are reused as-is
  between manual invoice entry and AI-draft mapping so the two paths can't silently diverge on
  business rules.
- **BigNumber money handling** — `bignumber.js` + string-typed numeric columns throughout,
  `ROUND_HALF_UP` at 2dp everywhere a total is computed, per the schema's design and the spec's
  explicit rounding rule — no shortcuts taken despite the extra ceremony.
- **Synchronous AI processing vs. background jobs** — upload → MinIO store → AI call → mapping →
  draft creation all happen in one HTTP request, no job queue or background worker. Simpler and
  matches "don't over-engineer infrastructure," but the request blocks for the full AI call
  duration and a slow/rate-limited provider stalls the UI directly, with no retry-without-re-upload.
- **Lightweight PDF parsing vs. full extraction engine** — `pdf-parse` with a custom page-render
  callback (using per-item x/y coordinates to insert column spacing), instead of a heavier
  layout-aware PDF/table-extraction library — lighter dependency footprint, but the spacing
  heuristic is not true table reconstruction.
- **Minimal AI provider abstraction** — `lib/ai.ts` auto-picks OpenAI vs. OpenRouter from whichever
  env var is set, one shared client — proportionate to "OpenRouter or OpenAI," not built as a
  pluggable multi-provider architecture.

## What is incomplete

- **No automated test suite** — zero unit/integration/e2e test files, no test script in
  `package.json`. Everything was verified manually via `curl`/HTTP checks against a live dev
  server, and the real sample Excel/PDF files in `reference/`. This is the single biggest
  "senior vs. junior" signal in this list — §15 explicitly calls out "code quality and
  maintainability" and, for senior candidates, "handling of edge cases"; zero test coverage is the
  most direct evidence against both. Every other gap here is a missing *feature*; this one is a
  missing *practice*.
- **OCR/scanned invoices unsupported — throws outright.** Only PDFs with a real extractable text
  layer work; a scanned/image-only PDF throws `PdfTextExtractionError` rather than degrading
  gracefully. This sits directly under the highest-weighted bucket in the AI section — "Data
  mapping and validation" (25%) and "Invoice draft creation" (20%) per §15 — and the spec's own
  "AI extraction must... avoid crashing when extraction is incomplete" (§11.4) makes this closer to
  a stated requirement than a nice-to-have.
- **Malformed AI JSON responses silently degrade to "extracted nothing"** rather than a distinct
  "failed to parse" state. This is the one true silent failure mode in the system — everything else
  fails loudly or visibly. It can make a real extraction bug look identical to "the AI legitimately
  found nothing," which undermines trust in the AI pipeline's reliability and directly affects how
  "AI integration design" (15%) and "extraction accuracy" (5%) read in practice.
- **Audit logging doesn't cover the upload/extraction pipeline as its own entity** —
  `invoice_upload_batch`/`invoice_upload_file` and the AI extraction call itself are never passed
  to the audit logger; only the resulting invoice create is audited. Unlike most AI-section gaps,
  this one is arguably a Secondary Requirements compliance gap, not just an extended-feature
  limitation — §10.4 says audit logs are required "for all implemented modules for key actions,"
  and the upload/extraction pipeline is an implemented module.
- **No extraction confidence scoring / `stated_amount` never cross-checked** — no per-field
  confidence, and the model's own `stated_amount` per line item is extracted but never
  cross-checked against the app's computed `unit × rate`. Also under the 25%-weighted "Data mapping
  and validation" bucket, and the cheapest, most obvious fix to have caught — the model hands over
  a self-reported total for free, and it's captured and then never used.

## Known limitations / future improvements

- **Nullable `type_id`/`pricing_region_code` inside the price table's composite `UNIQUE` constraint**
  ([db/init/01_schema.sql:103-122](db/init/01_schema.sql#L103-L122)) — Postgres treats `NULL`s as
  distinct, so the DB alone can't stop a duplicate price row when `type_id` is null (which real data
  does produce). Currently only prevented by the import service's own key-matching logic, not
  enforced at the DB layer; a partial unique index would close this properly.
- **No concurrency guard on Excel re-import** — two simultaneous imports of the same rate set could
  interleave their read-diff-write cycles (no advisory lock); not tested under concurrency.
- **A user's role reassignment doesn't take effect until their next login** — a session's `role_id`
  is fixed at login time, so moving a logged-in user to a different role has no effect until they
  log in again. (Editing what permissions an existing role grants *does* take effect immediately
  for everyone holding that role, since permissions are re-queried from the DB on every request —
  only the user↔role assignment itself is session-cached.)
- **No sliding session renewal** — fixed 12-hour TTL; an active user gets logged out mid-work past
  that window. No login rate limiting/lockout after failed attempts, either.
- **No automatic AI-provider fallback or retry/backoff** — transient provider failures (e.g. rate
  limits, timeouts, or temporary outages) immediately fail the extraction request; this includes a
  free-tier rate limit actually hit during testing. Automatic retry or failover to another
  configured provider was intentionally omitted to keep the implementation simple.
- **No OCR/vision fallback** for scanned PDFs — the clearest capability gap in AI extraction.
- **No background job queue** for uploads — extraction currently blocks the HTTP request; the
  natural next step if this needs to handle real load or slower models.
- **No storage retention policy** — uploaded PDFs accumulate in MinIO indefinitely with no cleanup
  mechanism.
