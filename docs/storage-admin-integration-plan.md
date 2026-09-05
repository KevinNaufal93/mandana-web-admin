# Integration plan: Smart Storage admin module

`mandana-api` already has a full, documented admin surface for the **Smart
Storage** business module (self-storage unit rentals: facilities, unit
types, per-facility inventory/pricing, individual trackable units, and
bookings — see `storage-integration.md` and `storage-floor-plan-response.md`
in the `mandana-api` repo's `docs/`). No admin UI exists for it here yet —
`lib/ui/nav-items.ts` has no entry for it, and the backend docs literally
note "no admin panel yet." This plans that build-out.

**Naming disambiguation.** "Storage" is two different things in this
system. This plan is for the **Smart Storage rental business** (facilities/
unit types/units/bookings) — `mandana-api`'s `storage` module. It is
unrelated to file/image upload, which this codebase calls **Media**
(`mandana-api`'s `media` module, `lib/api/media.ts` +
`<ImagePicker>` here) and is already fully integrated — this plan reuses
Media, it doesn't rebuild it.

This app already has two complete, working examples of this exact shape of
feature (catalog CRUD + a booking list with status transitions): **Event
Support** (`app/(app)/event-support/**`, `lib/api/event-support*.ts`,
`components/event-support/**`). This plan is almost entirely "do the same
thing again for Storage," called out below wherever the pattern is
identical vs. where Storage's contract genuinely differs.

**Scope for this phase.** Full CRUD for facilities, unit types, inventory,
and units, plus the bookings list/detail with confirm/reject/cancel/complete
transitions — built the same way Event Support was, using server actions +
`revalidatePath` (no live push). The backend's admin SSE stream
(`GET /admin/storage/stream`, ticket-auth `EventSource`, real-time
`booking.created`/`booking.updated`/`availability` events) is **deferred to
a later phase** — it needs a genuinely new client-side pattern this app
hasn't built before (ticket minting + `EventSource` lifecycle), and
shouldn't block shipping the CRUD foundation. Flagged as an explicit
follow-up, not forgotten.

## Backend contract (already built, for reference)

All under `/api/v1`, Bearer JWT + `role: admin`, same `{ data }` /
`{ data, meta }` envelope and `ApiError` shapes as everywhere else. Money
(`monthlyRate`, `monthlyRateOverride`, booking `total`/`subtotal`/
`discountAmount`) is a JSON integer (Rupiah) — format with `lib/format.ts`'s
`formatIDRFull`, no `Number()` coercion needed.

| Resource | Routes | Notes |
|---|---|---|
| Unit types | `GET\|POST\|PATCH\|DELETE /admin/storage/unit-types[/:id]` | `CreateStorageUnitTypeDto`: `name`, `slug?` (auto from name), `description?` (rich text), `volumeM3?`, `lengthCm?`/`widthCm?`/`heightCm?`, `monthlyRate` (required, int), `minDurationMonths?`, `mediaAssetId?`, `isActive?`, `sortOrder?`. Update DTO is the same shape, all optional. **Updated 2026-09-04:** gained weekly pricing — `weeklyRate?` (int, independent of `monthlyRate`, never derived from it), `supportsWeekly?` (the opt-in; `true` without a positive `weeklyRate` is a `400`), `minDurationWeeks?` (falls back to 1). See `storage-admin-integration.md` in `mandana-api`'s `docs/` for the full contract — this module is built now, that doc is the live reference, not this plan. |
| Facilities | `GET\|POST\|PATCH\|DELETE /admin/storage/facilities[/:id]` | `CreateStorageFacilityDto`: `name`, `slug?`, `description?` (rich text), `address?`, `area?`, `city?`, `province?`, `latitude?`/`longitude?` (exact, no fuzzing), `mediaAssetId?`, `isActive?`, `sortOrder?`. |
| Inventory | `GET\|POST\|PATCH\|DELETE /admin/storage/inventory[/:id]` | Config only, not counts: `facilityId`, `unitTypeId`, `monthlyRateOverride?` (int, overrides the unit type's base rate for that facility), `isActive?`. One row per facility×unit-type pair that's offered. **Updated 2026-09-04:** gained `weeklyRateOverride?` (int), independent of `monthlyRateOverride` — a facility can override one without the other. |
| Units | `GET\|POST\|PATCH\|DELETE /admin/storage/units[/:id]`, `POST /admin/storage/units/bulk`, `DELETE /admin/storage/units/bulk` | The individual physical rows behind the counts: `facilityId`, `unitTypeId`, `code` (unique per facility, e.g. `M-13`), `status` (`available\|occupied\|maintenance`, default `available`), `isActive?`. `gridColumn`/`gridRow`/`columnSpan`/`rowSpan` all exist but are **null for every seeded unit today** ("omit until a real floor survey exists") — leave these out of the form entirely for this phase. `POST .../bulk`: `{ facilityId, unitTypeId, count (1-500), codePrefix }` — generates `<prefix>-<NN>` continuing the existing sequence; the ops-facing "add capacity fast" tool. `DELETE .../bulk`: `{ ids: string[] }` (1-500) — the row-select counterpart; **atomic**, 404 naming any id(s) not found rather than deleting a partial set, 204 on success. List supports `?facilityId=&unitTypeId=&status=` + pagination. |
| Bookings | `GET /admin/storage/bookings[?status=&facilitySlug=&unitTypeSlug=]`, `GET /admin/storage/bookings/:id`, `PATCH /admin/storage/bookings/:id/{confirm,reject,cancel,complete}` | **No admin-create endpoint** — bookings only originate from the public `POST /storage/bookings` (unlike Event Support, which does have `POST /admin/event-support/bookings` for phone-in bookings). Don't build a "new booking" page. Status graph: `pending → confirmed \| rejected`, `confirmed → cancelled \| completed`. All four transitions take the same optional body `{ adminNote? }` (≤2000 chars, internal only). `confirm` is the one that can 409 (not enough units remain — re-checked atomically at confirm time); frame that as a conflict, not a hard failure, exactly like `confirmEventBookingAction` already does. |

Attaching an image to a facility or unit type: upload via the existing
`POST /admin/media/upload` (already wired up — `lib/api/media.ts`,
`uploadMediaAction` in `app/actions/media.ts`), then pass the returned id as
`mediaAssetId` in the facility/unit-type create or update body — identical
to how Event Support categories/items already do it.

## Frontend plan

Mirror the Event Support module's layering exactly. Everything below is a
new file unless noted as a shared/reused one.

### 1. Query/filter helpers — `lib/storage/query.ts`

Model directly on `lib/event-support/query.ts`: whitelist + clamp raw
`searchParams` into a typed query object, plus a `to*SearchString()` that
rebuilds the URL dropping defaults. Needed for two lists:

- `StorageUnitQuery`: `page`, `limit`, `facilityId?`, `unitTypeId?`,
  `status?` (`"available"|"occupied"|"maintenance"`).
- `StorageBookingQuery`: `page`, `limit`, `status?`
  (`"pending"|"confirmed"|"rejected"|"cancelled"|"completed"`),
  `facilitySlug?`, `unitTypeSlug?`. Note: unlike `EventBookingQuery`, the
  storage bookings query DTO has **no `search` or `from`/`to` date range** —
  don't invent filters the backend doesn't support.

Facilities/unit-types/inventory lists don't need pagination-query parsing —
same as `EventCategoryQuery`, just an optional `isActive` filter (or none at
all for inventory, which is small and always listed in full).

### 2. Typed API layer — `lib/api/storage*.ts`

Same shape as `lib/api/event-support.ts` / `event-support-bookings.ts`:
`"use server"` + `import "server-only"`, thin wrappers around
`serverApi()` from `lib/api/server-client.ts`, `unwrap<T>()` /
`unwrapPaginated<T>()`, hand-written response interfaces (not aliased to
`components["schemas"][...]` — same rationale already documented at the top
of `lib/api/event-support.ts`). Split into files by resource so diffs stay
reviewable, matching the existing split:

- `lib/api/storage.ts` — unit types + facilities (`listStorageUnitTypes`,
  `getStorageUnitType` (cached), `createStorageUnitType`,
  `updateStorageUnitType`, `deleteStorageUnitType`, and the facility
  equivalents).
- `lib/api/storage-inventory.ts` — `listStorageInventory`,
  `createStorageInventory`, `updateStorageInventory`,
  `deleteStorageInventory`.
- `lib/api/storage-units.ts` — `listStorageUnits` (paginated),
  `getStorageUnit` (cached), `createStorageUnit`, `updateStorageUnit`,
  `deleteStorageUnit`, `bulkCreateStorageUnits`, `bulkDeleteStorageUnits`
  (`ids: string[]`, no response body — a 404 means the whole call failed,
  not that some ids were skipped).
- `lib/api/storage-bookings.ts` — `listStorageBookings` (paginated),
  `getStorageBooking` (cached), `confirmStorageBooking`,
  `rejectStorageBooking`, `cancelStorageBooking`, `completeStorageBooking`
  (all take `(id, input: { adminNote?: string } = {})`) — direct copy of
  `lib/api/event-support-bookings.ts`'s transition functions, plus `reject`
  which Event Support doesn't have.

### 3. Server actions — `app/actions/storage*.ts`

Copy `app/actions/event-support.ts` and
`app/actions/event-support-bookings.ts`'s pattern: thin `"use server"`
wrappers that call the `lib/api/storage*.ts` functions, translate
`ApiError` into Indonesian copy via the same `errorMessage()` helper shape,
`revalidatePath()` the relevant list + detail routes after a mutation, and
return the same `{ ok: true, data } | { ok: false, error, conflict? }`
result shape. Split the same way as the API layer: `app/actions/storage.ts`
(unit types + facilities), `app/actions/storage-inventory.ts`,
`app/actions/storage-units.ts` (create/update/delete/bulk-create/bulk-delete),
`app/actions/storage-bookings.ts` (the four transitions —
`confirmStorageBookingAction` gets the same 409-as-conflict framing as
`confirmEventBookingAction`).

### 4. Shared component reuse

- **`<ImagePicker>`**: currently `components/event-support/image-picker.tsx`,
  about to gain two more consumers (facility form, unit-type form). Relocate
  it to `components/media/image-picker.tsx` (it's already generically typed
  — `purpose: "hero"|"cover"`, no Event Support-specific logic) and update
  its one existing import site in `components/event-support/*`. Small,
  low-risk cleanup that avoids a cross-feature import.
- **`<RichTextEditor>`** (`components/ui/rich-text-editor.tsx`): reuse as-is
  for facility/unit-type `description`.
- **`lib/format.ts`**: `formatIDRFull` for all money fields,
  `composeLocation` for facility `area/city/province`, `formatDateID` /
  `formatDateRangeID` for booking dates, `toWaNumber` if a WhatsApp link to
  the customer is wanted on the booking detail view (Event Support's
  `booking-detail-view.tsx` likely already does this — mirror it).

### 5. Routes — `app/(app)/storage/**`

Same tree shape as `app/(app)/event-support/**`:

```
app/(app)/storage/
  layout.tsx              — heading + <StorageTabs> + {children}, no data fetching (same no-throw rationale as event-support's layout.tsx)
  page.tsx                — redirect("/storage/facilities") (facilities = top of the setup hierarchy: facility → unit type → inventory → units → bookings)
  facilities/
    page.tsx               — list (Server Component, getCurrentUser() + listStorageFacilities())
    new/page.tsx            — <StorageFacilityForm mode="create" />
    [id]/page.tsx            — detail/edit, generateMetadata + cache()'d getStorageFacility()
  unit-types/
    page.tsx, new/page.tsx, [id]/page.tsx   — identical shape
  inventory/
    page.tsx, new/page.tsx, [id]/page.tsx   — form's facility/unit-type fields are <Select>s populated by listing facilities + unit types server-side
  units/
    page.tsx                — list with facility/unit-type/status filters, row checkboxes + a "Hapus Massal" (bulk delete) toolbar action once ≥1 row is selected, and a "Tambah Massal" (bulk create) action opening a small form (dialog or its own new/bulk route — pick whichever existing shadcn primitive is already in components/ui; add one via the shadcn CLI if neither Dialog nor Sheet exists yet)
    new/page.tsx             — single-unit create
    [id]/page.tsx             — edit (code, status, isActive — no grid fields, see contract table)
  bookings/
    page.tsx                — list with status/facilitySlug/unitTypeSlug filters (no search/date range — contract has none)
    [id]/page.tsx             — detail + confirm/reject/cancel/complete buttons, each opening an adminNote prompt; NO new/page.tsx (no admin-create endpoint)
```

`error.tsx` / `not-found.tsx` / `loading.tsx` per route segment, copied from
the equivalent `event-support/**` segment files.

### 6. Components — `components/storage/**`

One table + one form (+ detail-view for the two-mode create/edit pattern)
per resource, following `components/event-support/event-category-*.tsx` /
`event-item-*.tsx` exactly:

- `storage-facility-form.tsx`, `-detail-view.tsx`,
  `storage-facilities-table.tsx`, `storage-facility-filters.tsx`
  (`isActive` only)
- `storage-unit-type-form.tsx`, `-detail-view.tsx`,
  `storage-unit-types-table.tsx`
- `storage-inventory-form.tsx`, `storage-inventory-table.tsx`
  (facility/unit-type selects; likely no separate detail-view needed given
  how few fields it has — an inline edit could even suffice, but keep the
  new/`[id]` page split for consistency with the rest unless it feels like
  overkill once built)
- `storage-unit-form.tsx`, `storage-units-bulk-form.tsx` (bulk create),
  `storage-units-table.tsx` (status badge — colored by
  `available/occupied/maintenance` — plus row selection state and a
  bulk-delete confirm dialog wired to `bulkDeleteStorageUnitsAction`, since
  the 404-naming-missing-ids response means a stale selection — e.g. a unit
  another admin already deleted — needs a clear error, not a silent
  no-op), `storage-unit-filters.tsx`
- `storage-booking-detail-view.tsx` (status badge, line/cost summary,
  adminNote textarea + the 4 transition buttons gated by current status per
  the graph in the contract table, 409-conflict panel on confirm — same
  shape as `booking-conflict-panel.tsx` + `booking-detail-view.tsx`),
  `storage-bookings-table.tsx`, `storage-booking-filters.tsx`

### 7. Navigation

- `lib/ui/nav-items.ts`: add
  `{ href: "/storage", label: "Smart Storage", icon: Warehouse }` (or
  another fitting `lucide-react` icon) to `NAV_ITEMS`.
- `components/storage/storage-tabs.tsx`: copy `event-support-tabs.tsx`'s
  `<nav>` pattern with 5 entries — Fasilitas (`/storage/facilities`), Tipe
  Unit (`/storage/unit-types`), Inventaris (`/storage/inventory`), Unit
  (`/storage/units`), Pemesanan (`/storage/bookings`).

### 8. Type generation

Before building, run `npm run gen:api` (needs `mandana-api` running locally
on port 3000) to refresh `lib/api/schema.d.ts` with the storage paths —
confirm the admin storage routes already carry `@ApiOkResponse` (they do,
per `storage-response.dto.ts`) so generated types are real, not `unknown`,
unlike the Media upload response.

## Build order

1. `lib/storage/query.ts` (no dependencies).
2. `lib/api/storage.ts` (facilities + unit types) → their pages/components
   — these are the leaf resources everything else references by id.
3. `lib/api/storage-inventory.ts` + `lib/api/storage-units.ts` → their
   pages/components (both depend on facility/unit-type lists for form
   dropdowns).
4. `lib/api/storage-bookings.ts` → bookings list/detail (structurally
   independent, but conceptually last since it references facility/unit-type
   slugs for display and filters).
5. Nav + tabs wiring last, once at least one route exists to link to.

## Verification

- `npm run gen:api` succeeds and `lib/api/schema.d.ts` gains
  `/admin/storage/**` path entries.
- `npm run dev` (port 3001) with `mandana-api` running locally; log in as an
  admin.
- Walk each resource end to end: create a facility → create a unit type →
  create an inventory row linking them → create a unit (and a bulk batch)
  under that facility/type → confirm they all list/filter/edit/delete
  correctly, including image upload via `<ImagePicker>` and rich-text
  description saving/rendering.
- Exercise the booking lifecycle against a seeded `pending` booking (seed
  data exists per `mandana-api`'s `storage-integration.md` §6): confirm →
  verify units' status flips and a 409 is framed as a conflict when stock is
  insufficient (temporarily set a unit type's inventory/units count low to
  trigger it); reject a different pending booking; cancel/complete a
  confirmed one.
- `npm run lint` / `npm run build` clean.

## Deferred (phase 2)

Real-time admin dashboard via `GET /admin/storage/stream`: mint a
60-second ticket (`POST /admin/storage/stream-ticket`), open an
`EventSource` with `?ticket=`, handle `availability` / `booking.created` /
`booking.updated` / `ping` events, re-mint on every reconnect. Not started
in this phase — see `mandana-api`'s `storage-integration.md` §4 for the
full contract when this is picked up.
