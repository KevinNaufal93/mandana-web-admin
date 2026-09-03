# Integration plan: Moving Support admin module

`mandana-api` already has a full, documented admin surface for the **Moving
Support** business module ("Mandana Move" — truck-class/add-on catalog,
a pricing-policy singleton, and lead capture/triage — see
`moving-admin-integration.md` and `moving-integration.md` in the
`mandana-api` repo's `docs/`). No admin UI exists for it here yet —
`lib/ui/nav-items.ts` has no entry for it. This plans that build-out.

This app already has two complete, working examples of this exact shape of
feature (catalog CRUD + a transactional list): **Storage** is the closer
match — it has *two* catalog entities (unit types, facilities) plus a
units inventory plus a bookings list, same as Moving's truck classes +
add-ons + leads. This plan is almost entirely "do the same thing again for
Moving," called out below wherever the pattern is identical vs. where
Moving's contract genuinely differs. Two real differences worth flagging up
front:

- **Leads have no state machine and no admin-create endpoint** — simpler
  than both Storage's and Event Support's bookings. `status` is free-form
  CRM triage (any of four values to any other, no legal-transition table,
  no 409), and a lead only ever originates from the public quote flow. So
  there's no `leads/new/page.tsx`, no confirm/reject/cancel/complete
  buttons, no conflict panel — just a status `<Select>` + `adminNote`
  `<Textarea>` + one Save action.
- **Settings is a genuinely new pattern this app hasn't built yet.** Every
  existing module here is either a catalog (list + `:id`) or a
  transactional list — nothing is a bare GET/PATCH singleton with no list
  and no `:id`. Storage's own settings screen (if Event Support ever gets
  one) doesn't exist yet either, so there's no precedent to copy; §5/§6
  below spell out a concrete shape.

**Scope for this phase.** Full CRUD for truck classes and add-ons, the
settings singleton, and the leads list/detail/triage. No real-time/SSE
concept exists for Moving on the backend (unlike Storage's deferred
availability stream), so there's no analogous phase-2 item there — see
"Deferred" at the end for the one thing that *is* worth flagging.

## Backend contract (already built, for reference)

All under `/api/v1/admin/moving`, Bearer JWT + `role: admin`, same
`{ data }` / `{ data, meta }` envelope and `ApiError` shapes as everywhere
else. Money (`baseFare`, `perKmFare`, `minFare`, `unitPrice`, every lead
price field) is a JSON integer (Rupiah) — format with `lib/format.ts`'s
`formatIDRFull`/`formatIDRShort`, no `Number()` coercion needed. **Two
scales that look alike but aren't:** `percentBps` (add-ons) is *basis
points* — the seeded `insurance` row's `20` means 0.20%, not 20% — while
`bandPct` (settings) is a *whole percent* (`10` = ±10%). `lib/format.ts`
has no basis-point formatter; render `percentBps` as `${(percentBps /
100).toFixed(2)}%` inline, don't reuse a money formatter for it.

| Resource | Routes | Notes |
|---|---|---|
| Truck classes | `GET\|POST\|PATCH\|DELETE /truck-classes[/:id]`, `?isActive` filter, **unpaginated** | `CreateTruckClassDto`: `name`, `baseFare`+`perKmFare` (required, int), `slug?` (auto from name), `description?` (rich text), `capacityKg?`/`volumeM3?`/`lengthCm?`/`widthCm?`/`heightCm?`/`helperCount?`, `includedKm?` (falls back to settings' `defaultIncludedKm`), `minFare?`, `mediaAssetId?`, `isActive?`, `sortOrder?`. Response now includes `mediaAssetId` (raw asset id, alongside the built `image` object) for exactly this reason — bind `<ImagePicker>`'s initial value to it. |
| Add-ons | `GET\|POST\|PATCH\|DELETE /addons[/:id]`, `?isActive` filter, **unpaginated** | `CreateMovingAddonDto`: `name`, `kind` (`helper\|packaging\|waiting\|insurance\|toll\|other`), `pricingModel` (`flat\|per_unit\|percent`) all required. `unitPrice` required (**and must be `> 0` — the Swagger-documented `minimum: 0` is wrong, `0` itself 400s**) when `pricingModel` isn't `percent`; `percentBps` required (`> 0`) when it is. `maxQty >= minQty` enforced server-side. `kind: "toll"` is special: **at most one active `toll` row at a time — activating a second returns 409**, and its `per_unit` pricing multiplies distance, not a customer quantity, so don't expose a `minQty`/`maxQty` stepper for it the way you would for `helper`. Same `mediaAssetId` response addition as truck classes. |
| Settings | `GET\|PATCH /settings` — **singleton, no `:id`, no `POST`/`DELETE`** | Exactly three fields: `roundToIdr`, `bandPct`, `defaultIncludedKm`, all optional ints on PATCH (send any subset). Auto-seeds server-side if missing — `GET` can never 404. A change reprices every subsequent quote/lead capture immediately and changes nothing already captured (leads snapshot their own numbers). |
| Leads | `GET /leads[?status&search&from&to&page&limit]`, `GET /leads/:id`, `PATCH /leads/:id` | **No admin-create, no delete.** `PATCH` body is `{ status?, adminNote? }` — both optional, no transition rules, no 409 possible. List defaults `page=1&limit=12`, max `limit=100`. `search` matches `reference`/`customerName`/`phone` case-insensitively (**today only `reference` is ever populated** — the public form collects no contact fields). `from`/`to` are **inclusive Jakarta calendar days on `createdAt`** (`YYYY-MM-DD`, any time component ignored) — plain `<input type="date">` values pass straight through, no client-side parsing needed. A lead's `truckSlug`/`truckName` and every price field (including a per-leg `legs[]` breakdown) are point-in-time snapshots with **no FK back to the catalog** — a lead can reference a truck that's since been renamed or deleted; don't build a "view truck class" link off a lead row. |

Attaching an image to a truck class or add-on: upload via the existing
`POST /admin/media/upload` (already wired up — `lib/api/media.ts`,
`uploadMediaAction` in `app/actions/media.ts`), then pass the returned id
as `mediaAssetId` in the create/update body — identical to how Storage's
facility/unit-type forms already do it.

**One deploy-order caveat specific to Moving right now:** the backend's
per-leg pricing rewrite (`legs[]` replacing a single `distanceMeters`) and
the leads `search`/`from`/`to` filters are recent — make sure whoever runs
`gen:api` does it against a `mandana-api` build that includes them, and
that migration `1787900000000-AddMovingLeadLegs` has actually run.
`GET /admin/moving/leads` will 500 trying to hydrate a `legs` relation
against a table that doesn't exist yet if it hasn't.

## Frontend plan

Mirror the Storage module's layering exactly. Everything below is a new
file unless noted as a shared/reused one.

### 1. Query/filter helpers — `lib/moving/query.ts`

Model directly on `lib/storage/query.ts` — a fresh copy-paste per entity,
not an import from it or `lib/event-support/query.ts` (this codebase's own
convention: "copy, don't generify," documented in both existing files'
headers). Three query shapes:

- `MovingCatalogQuery`: `{ isActive?: boolean }` — shared by truck classes
  and add-ons, no pagination (both endpoints are unpaginated).
- `MovingLeadQuery`: `page`, `limit` (**default 12**, matching the
  backend's own `PaginationQueryDto` default — don't copy Storage's `20` or
  Event Support items' `12` without checking; this one happens to also be
  12, verify against `query-moving-leads.dto.ts` if the backend changes),
  `status?` (`"new"|"contacted"|"converted"|"lost"`), `search?`, `from?`,
  `to?` (both `YYYY-MM-DD` strings, validated with a simple date-shape
  regex, not parsed into `Date` objects — the API takes the string as-is).

`parseMovingLeadQuery(raw)` follows the established shape: never throws,
silently drops anything invalid, clamps `page >= 1` and `limit` to
`[1, 100]`. `toMovingLeadSearchString(query, patch)` merges + omits
defaults, same as `toStorageBookingSearchString`.

### 2. Typed API layer — `lib/api/moving*.ts`

Same shape as `lib/api/storage.ts` / `storage-bookings.ts`: `"use server"`
+ `import "server-only"`, thin wrappers around `serverApi()` from
`lib/api/server-client.ts`, `unwrap<T>()` / `unwrapPaginated<T>()`,
hand-written response interfaces (not aliased to
`components["schemas"][...]`), request bodies cast through the generated
schema type. Split by resource:

- `lib/api/moving.ts` — truck classes + add-ons: `listMovingTruckClasses`,
  `getMovingTruckClass` (`cache()`-wrapped), `createMovingTruckClass`,
  `updateMovingTruckClass`, `deleteMovingTruckClass`, and the four add-on
  equivalents.
- `lib/api/moving-settings.ts` — just `getMovingSettings` (`cache()`) and
  `updateMovingSettings`. Deliberately the smallest file in the module —
  resist the urge to fold it into `moving.ts`; keeping it separate matches
  how Storage splits inventory into its own file even though it's small.
- `lib/api/moving-leads.ts` — `listMovingLeads` (paginated), `getMovingLead`
  (`cache()`), `updateMovingLead(id, { status?, adminNote? })` — one
  function, not four transition functions like Storage/Event bookings,
  because there's only one PATCH and no state machine.

### 3. Server actions — `app/actions/moving*.ts`

Copy `app/actions/storage.ts`'s pattern: thin `"use server"` wrappers
around the `lib/api/moving*.ts` functions, an `errorMessage()` mapper with
a per-call-site copy override (the add-on create/update actions need one
for the toll-conflict 409 — something like "Sudah ada estimasi tol aktif —
nonaktifkan dulu sebelum mengaktifkan yang baru."), `revalidatePath()`
after every mutation, and the same `{ ok: true; data } | { ok: false;
error; conflict? }` result shape. Split the same way as the API layer:
`app/actions/moving.ts` (truck classes + add-ons), `app/actions/moving-settings.ts`
(one `updateMovingSettingsAction`), `app/actions/moving-leads.ts` (one
`updateMovingLeadAction` — no `conflict` case is ever reachable here, but
keep the same result type shape for consistency with every other action in
the app).

### 4. Shared component reuse

- **`<ImagePicker>`** (`components/media/image-picker.tsx`): reuse as-is
  for truck-class/add-on images, `purpose="cover"`.
- **`<RichTextEditor>`/`<RichTextView>`**: reuse as-is for truck-class/
  add-on `description`.
- **`lib/format.ts`**: `formatIDRFull` for exact prices (a lead's `total`,
  an add-on's `unitPrice`), `formatIDRShort` for table-cell display (truck
  class `baseFare`/`perKmFare` in a list row, matching how
  `storage-unit-types-table.tsx` uses it for `monthlyRate`).
- **No date-picker component exists in this repo** (confirmed — nothing
  under `components/ui/`). The leads filter's `from`/`to` inputs are plain
  `<input type="date">`, which already emits `YYYY-MM-DD` — no adapter
  needed, unlike `formatDateID`'s local-component parsing dance for
  *display* dates.

### 5. Routes — `app/(app)/moving/**`

Same tree shape as `app/(app)/storage/**`, including this codebase's Next
16 idioms throughout — `searchParams`/`params` typed as `Promise<...>` and
awaited, `error.tsx` receiving `{ error, unstable_retry }` not `{ error,
reset }`, no `[id]/edit/page.tsx` (edit happens in-place inside the detail
view via a `mode` toggle):

```
app/(app)/moving/
  layout.tsx              — heading + <MovingTabs> + {children}, no data fetching (same no-throw rationale as storage's layout.tsx — a throwing layout would escape past app/(app)/moving/error.tsx)
  page.tsx                — redirect("/moving/truck-classes") (no landing-page content like Storage's occupancy overview exists for Moving)
  truck-classes/
    page.tsx               — list (Server Component: getCurrentUser() + listMovingTruckClasses())
    loading.tsx
    new/page.tsx             — <MovingTruckClassForm mode="create" />
    [id]/page.tsx             — detail/edit, generateMetadata + cache()'d getMovingTruckClass()
    [id]/loading.tsx, [id]/error.tsx, [id]/not-found.tsx
  addons/
    page.tsx, loading.tsx, new/page.tsx, [id]/page.tsx (+ loading/error/not-found)   — identical shape
  settings/
    page.tsx                — Server Component: getCurrentUser() + getMovingSettings(), renders <MovingSettingsForm settings={result.data} /> directly. No [id], no new/, no separate view/edit toggle — see §6, this is the new pattern.
    loading.tsx, error.tsx
  leads/
    page.tsx                — list with status/search/from/to filters + pagination
    [id]/page.tsx             — detail + triage (status select + adminNote textarea + Save)
    [id]/loading.tsx, [id]/error.tsx, [id]/not-found.tsx
    (no new/page.tsx — no admin-create endpoint, same reasoning as storage/bookings)
```

`error.tsx` / `not-found.tsx` / `loading.tsx` per route segment, copied
from the equivalent `storage/**` segment files (hand-built `SkeletonBlock`
divs for loading, `unstable_retry()` + `createLogger("moving")` for error).

### 6. Components — `components/moving/**`

One table + one form (+ detail-view for the two-mode create/edit pattern)
per resource, following `components/storage/storage-unit-type-*.tsx`
exactly:

- `moving-truck-class-form.tsx`, `-detail-view.tsx`,
  `moving-truck-classes-table.tsx`, `moving-catalog-filters.tsx`
  (`isActive` only — genuinely identical shape to add-ons' filter, so this
  is the one place a shared component across two entities is reasonable
  despite the "copy, don't generify" convention; split it into
  `moving-truck-class-filters.tsx` + `moving-addon-filters.tsx` instead if
  the team would rather stay strictly consistent with how Storage keeps
  `storage-facility-filters.tsx` separate from unit-types')
- `moving-addon-form.tsx` — the one form needing real conditional logic:
  show a `unitPrice` input when `pricingModel !== "percent"`, a
  `percentBps` input when it is, and label the `kind: "toll"` option
  clearly as "diterapkan otomatis, tidak dipilih pelanggan" so nobody
  wonders why customers never see it as a checkbox. `-detail-view.tsx`,
  `moving-addons-table.tsx` (add a `kind`/`pricingModel` column — plain
  text is fine, no badge component needed unless the team wants one)
- `moving-settings-form.tsx` — three plain number inputs
  (`roundToIdr`/`bandPct`/`defaultIncludedKm`), same `useState` +
  `useTransition` + manual-validation shape as every other form here, just
  with no `mode` union (there's only ever "edit," nothing to create).
- `moving-lead-detail-view.tsx` — read-only, built entirely from
  `<DetailCard>`/`<DetailRow>` (`components/ui/detail-card.tsx`): a
  "Rute" card (pickup + `destinations[]`), a "Rincian Harga" card (`legs[]`
  breakdown, `addons[]`, `total`/`lowEstimate`/`highEstimate`), a "Kontak"
  card (`customerName`/`phone`/`email`/`notes` — expect these mostly
  `null` today), plus a **non-read-only** triage section at the bottom: a
  `status` `<Select>` and `adminNote` `<Textarea>`, one Save button calling
  `updateMovingLeadAction`. No confirm/reject/cancel/complete buttons, no
  `booking-conflict-panel.tsx` equivalent — there's nothing to conflict on.
- `moving-leads-table.tsx`, `moving-lead-filters.tsx` (four controls —
  status select, search input, two date inputs — closest existing shape is
  `storage-booking-filters.tsx` scaled up by a text field and a date
  range), `moving-leads-pagination.tsx` (copy
  `storage-bookings-pagination.tsx`, retype to `MovingLeadQuery`)
- `moving-lead-status-badge.tsx` — the same `Record`-mapped `<Badge>`
  pattern as `storage-unit-status-badge.tsx`, four values (`new: "default"`,
  `contacted: "outline"`, `converted: "accent"`, `lost: "outline"` or
  similar — pick variants that read as a clear "cold → warm → won/lost"
  progression, this repo doesn't have a fifth generic variant for a truly
  neutral "lost" state so `outline` doing double duty for `contacted` and
  `lost` is fine).

### 7. Navigation

- `lib/ui/nav-items.ts`: add `{ href: "/moving", label: "Moving Support",
  icon: Truck }` (`lucide-react`'s `Truck` icon) to `NAV_ITEMS`.
- `components/moving/moving-tabs.tsx`: copy `storage-tabs.tsx`'s `<nav>`
  pattern with 4 entries — Tipe Truk (`/moving/truck-classes`), Add-on
  (`/moving/addons`), Pengaturan (`/moving/settings`), Leads
  (`/moving/leads`).

### 8. Type generation

Before building, run `npm run gen:api` (needs `mandana-api` running
locally on port 3000, with the recent per-leg pricing and leads-filter
changes deployed — see the backend contract section's deploy-order
caveat) to refresh `lib/api/schema.d.ts` with the `/admin/moving/**`
paths. Confirm generated types are real, not `unknown` — Moving's
controllers already declare `@ApiOkResponse` on every handler (per
`moving-integration.md`, the first module in the API to do so
consistently).

## Build order

1. `lib/moving/query.ts` (no dependencies).
2. `lib/api/moving.ts` (truck classes + add-ons) → their pages/components
   — the two catalog resources, independent of each other, build in either
   order or in parallel (unlike Storage's inventory/units, nothing here
   references the other by id).
3. `lib/api/moving-settings.ts` → the settings page — independent, small,
   good to slot in whenever; nothing else depends on it existing first.
4. `lib/api/moving-leads.ts` → leads list/detail — structurally
   independent, but conceptually last since a lead's `truckSlug` display is
   easier to sanity-check once truck classes already exist to compare
   against (remember: no join exists to actually verify it against).
5. Nav + tabs wiring last, once at least one route exists to link to.

## Verification

- `npm run gen:api` succeeds and `lib/api/schema.d.ts` gains
  `/admin/moving/**` path entries.
- `npm run dev` (port 3001) with `mandana-api` running locally and the
  `1787900000000-AddMovingLeadLegs` migration applied; log in as an admin.
- Walk each resource end to end: create a truck class (with image, rich
  text description) → create one add-on per `pricingModel`
  (`flat`/`per_unit`/`percent`) → try activating a second active `toll`
  row and confirm it surfaces as a friendly conflict, not a raw 409 → edit
  the settings singleton and confirm a fresh `POST /moving/quote` (via
  Swagger or the public site) picks up the change immediately → open a
  seeded or freshly-captured lead and confirm the full breakdown renders
  correctly (destinations in order, `legs[]` summing to the totals shown,
  add-on lines) → change its `status`/`adminNote`, save, reload, confirm it
  persisted → filter the leads list by each of `status`/`search`/
  `from`+`to` individually and combined.
- `npm run lint` / `npm run build` clean.

## Deferred / worth flagging, not phase-2 work

Nothing on the backend is deferred the way Storage's SSE stream is — Moving
has no real-time/availability concept to build toward. The one thing worth
a heads-up to whoever builds this: `mandana-api`'s own `lib/moving/pricing.ts`
mirror on the **public customer site** (`mandana-web`, not this admin app)
is currently stale for multi-leg quotes — its instant preview price will
disagree with the server-authoritative one until that repo ports the
per-leg pricing rewrite. Not this app's problem to fix, but don't be
surprised if a screenshot from the public site's preview doesn't match a
number you see in a lead's detail view here; the lead's stored numbers are
always the correct, server-computed ones.
