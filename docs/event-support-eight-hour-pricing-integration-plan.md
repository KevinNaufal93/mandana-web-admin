# Integration plan: Event Support 8-hour pricing (admin module)

`mandana-api` replaced Event Support's flexible hourly pricing (a
configurable threshold/rounding-step/minimum-hours/day_plus_hourly policy,
admin-editable via `event_support_settings`) with a single fixed **8-hour
rental block** — see `event-support-admin-integration.md`'s "8-hour
pricing" section and §6 "Settings" in that same repo's `docs/`. There is no
"hourly" product any more: an item either bills by the day, or by one fixed
8-hour block, never a per-hour rate.

Unlike `storage-admin-integration-plan.md` (a from-scratch build for a
module that didn't exist here yet), the Event Support admin module is
**already fully built** — categories, items, bookings, and a settings page,
all working against the *old* hourly-pricing shape. This plan is a
migration: exactly which of the existing files need to change, and how,
file by file. Read this alongside `mandana-web`'s companion plan
(`event-support-eight-hour-pricing-integration-plan.md` in that repo) — the
two modules changed together, but this repo's surface area is much larger,
because it (unlike the public site) duplicates the server's pricing math
client-side for a live booking-form estimate.

## 1. What changed, server-side (for reference)

- `EventBillingMode`'s `"hourly"` value is now `"eight_hour"`.
- `EventItem`: `hourlyRate`/`supportsHourly`/`minimumHours` →
  `eightHourRate`/`supportsEightHour` — `minimumHours` is **gone
  entirely**, no replacement (the block itself is the minimum). New
  invariant, checked server-side: `supportsEightHour: true` requires a
  positive `eightHourRate`, **and** `eightHourRate` must not exceed
  `pricePerDay` — both violations are a `400`.
- `EventBookingLineDto`/`EventQuoteLineDto`: `unitLabel` is now
  `"8 jam" | "hari"`; `billableUnits` is **always a whole number** — `1`
  under `"eight_hour"` billing, or the whole-day count under `"daily"`.
  `extraHours`/`extraHoursTotal` **no longer exist** on the line.
- `EventSupportSettingsDto`/`UpdateEventSupportSettingsDto`: shrank from 8
  fields to 2 — only `priceIncludesJabodetabekDelivery` and
  `outsideJabodetabekNote` remain. `hourlyThresholdHours`,
  `hourlyThresholdInclusive`, `defaultMinimumHours`, `roundingUnitMinutes`,
  `capHourlyAtDailyRate`, `overThresholdMode` are all gone — there is
  nothing left to configure once "8 hours" is a constant, not a policy.
- The rule: a window at or under 8 hours (`EIGHT_HOUR_BLOCK_MINUTES = 480`,
  a server-side constant, not a setting) prices as one block when the item
  opts in; anything longer, or an item that doesn't support the block,
  prices as `ceil(minutes / 1440)` whole days.
- **What did *not* change:** `dropoffAt`/`pickupAt` request fields on
  `POST /admin/event-support/bookings` are identical to before.

## 2. Current state of this repo — file by file

Every file below was checked against the actual current source (not
guessed from the old docs). Nothing here is speculative.

### 2.1 Type layer — `lib/api/*.ts`

These are hand-written (not aliased to `components["schemas"][...]`,
per the rationale already documented at the top of
`lib/api/event-support.ts` — decoupling from regen timing). That means,
unlike `mandana-web`'s public site, **nothing here updates itself** from a
schema regen — every rename below is a manual edit.

| File | Current shape | Change to |
|---|---|---|
| [`lib/api/event-support.ts`](../lib/api/event-support.ts) | `AdminEventItem.hourlyRate: number \| null`, `.supportsHourly: boolean`, `.minimumHours: number \| null` (lines 58-63). `EventItemCreateInput.hourlyRate?/.supportsHourly?/.minimumHours?` (lines 142-150). | Rename to `eightHourRate`/`supportsEightHour`; delete `minimumHours` from both interfaces. Update the doc comments (they currently describe the old §-numbered hourly policy) to describe the 8-hour-block invariant (positive rate required when opted in, capped at `pricePerDay`, both a 400 server-side). |
| [`lib/api/event-support-settings.ts`](../lib/api/event-support-settings.ts) | `AdminEventSupportSettings` and `EventSupportSettingsInput` both carry all 8 old fields (lines 20-37, 46-56). | Delete `hourlyThresholdHours`, `hourlyThresholdInclusive`, `defaultMinimumHours`, `roundingUnitMinutes`, `capHourlyAtDailyRate`, `overThresholdMode` from **both** interfaces — only `priceIncludesJabodetabekDelivery`/`outsideJabodetabekNote` remain. The file's own header comment ("Two functions, one singleton resource") stays accurate; nothing else about the plumbing changes. |
| [`lib/api/event-support-bookings.ts`](../lib/api/event-support-bookings.ts) | `EventBookingLine.billingMode: "hourly" \| "daily"` (line 33), `.unitLabel: "jam" \| "hari"` (line 39), `.extraHours: number \| null` / `.extraHoursTotal: number \| null` (lines 42-44). | `billingMode: "eight_hour" \| "daily"`, `unitLabel: "8 jam" \| "hari"`, delete `extraHours`/`extraHoursTotal` entirely. `EventBookingLineInput`/`EventBookingCreateInput` (dropoffAt/pickupAt shape) are **unaffected** — leave as is. |

### 2.2 Client-side pricing mirror — `lib/event-support/pricing.ts`

The one file in this repo that duplicates server pricing math (analogous to
`mandana-api`'s own `event-pricing.ts`, which this was built to mirror —
see its header comment). Used **only** for `BookingItemPicker`'s live
per-line estimate while an admin is filling out the booking form; the
booking's real price is always recomputed and snapshotted server-side on
`POST /bookings` (the "Total final dihitung ulang oleh server" note stays
accurate and should **not** be removed).

Full rewrite needed — the whole threshold/rounding/minimum-hours/
day-plus-hourly model this file implements no longer exists server-side.
Mirror `mandana-api`'s `event-pricing.ts` `computeLine()` after its own
8-hour-block rewrite:

```ts
export interface LineEstimate {
  billingMode: "eight_hour" | "daily";
  unitLabel: "8 jam" | "hari";
  unitPrice: number;
  billableUnits: number;
  calendarDays: number;   // keep — still meaningful, still an output, not an input
  lineTotal: number;
}

const EIGHT_HOUR_BLOCK_MINUTES = 480;   // matches mandana-api's event-pricing.ts constant exactly

export function estimateLine(
  item: AdminEventItem,
  dropoffAt: string,
  pickupAt: string,
  quantity: number,
): LineEstimate | null {
  if (!dropoffAt || !pickupAt || !Number.isFinite(quantity) || quantity < 1) return null;

  const dropoff = parseDateTimeLocal(dropoffAt);
  const pickup = parseDateTimeLocal(pickupAt);
  const windowMs = pickup.getTime() - dropoff.getTime();
  if (!Number.isFinite(windowMs) || windowMs <= 0) return null;

  const windowMinutes = windowMs / 60_000;
  const calendarDays = calendarDaysHeld(dropoff, pickup);   // keep as is

  const canBillEightHour = item.supportsEightHour && item.eightHourRate != null && item.eightHourRate > 0;
  if (canBillEightHour && windowMinutes <= EIGHT_HOUR_BLOCK_MINUTES) {
    return {
      billingMode: "eight_hour",
      unitLabel: "8 jam",
      unitPrice: item.eightHourRate as number,
      billableUnits: 1,
      calendarDays,
      lineTotal: (item.eightHourRate as number) * quantity,
    };
  }

  const billableUnits = Math.max(1, Math.ceil(windowMinutes / 1440));
  return {
    billingMode: "daily",
    unitLabel: "hari",
    unitPrice: item.pricePerDay,
    billableUnits,
    calendarDays,
    lineTotal: item.pricePerDay * billableUnits * quantity,
  };
}
```

Notes on this rewrite:

- `estimateLine` **drops the `settings` parameter entirely** — there is no
  pricing policy left to pass in. Every call site
  (`BookingItemPicker`, §2.3) must drop the argument too.
- `roundHoursUp()` is dead code once nothing rounds — delete it.
- `calendarDaysHeld()` is unrelated to pricing (it's the `endDate -
  startDate + 1` calendar-day count for display) — keep it verbatim.
- The header doc comment references "§6 of
  event-support-admin-integration.md" — that section is now the delivery
  disclosure, not a pricing policy; reword to point at this plan and the
  live API doc's "8-hour pricing" section instead.

### 2.3 Components — `components/event-support/*.tsx`

| File | Current | Change |
|---|---|---|
| [`event-support-settings-form.tsx`](../components/event-support/event-support-settings-form.tsx) | Renders and submits all 8 old fields — 6 `useState`s (lines 46-51) plus their `<Input>`/`<Select>`/checkbox controls (lines 125-232), all under an "Kebijakan Harga per Jam" section heading, each field's hint citing a `§6.x` clause number. Client-side validation on `handleSubmit` for `hourlyThresholdHours`/`defaultMinimumHours`/`roundingUnitMinutes` (lines 69-83). | Delete the entire "Kebijakan Harga per Jam" block — all 6 `useState`s, their validation, their form controls, and the whole `<h3>` sections around them ("Batas jam/hari", "Perhitungan jam", "Di atas batas"). What remains: the `priceIncludesJabodetabekDelivery` checkbox and `outsideJabodetabekNote` textarea (lines 234-263, under "Ongkir") plus their two `useState`s — unchanged. Rename the page heading from "Kebijakan Harga per Jam" to something like "Pengaturan Event Support" or fold it into a lone "Ongkir" section header, since that's all that's left. `handleSubmit` becomes trivial (no numeric validation needed at all — both remaining fields are a boolean and a free-text note). |
| [`event-item-form.tsx`](../components/event-support/event-item-form.tsx) | `supportsHourly`/`hourlyRate`/`minimumHours` state (lines 60-62), validation (lines 89-104: hourly rate required+positive when opted in, minimum-hours optional-but-if-present integer≥1), submitted as part of `EventItemCreateInput` (lines 123-125), rendered as a checkbox + two conditional `<Field>`s (lines 238-280, Indonesian copy: "Dukung sewa per jam" / "Harga per jam (Rp)" / "Minimum jam (opsional)"). | Rename state/validation/submit to `supportsEightHour`/`eightHourRate`; delete `minimumHours` entirely (state, validation block, submitted field, and its `<Field>`). Copy: "Dukung sewa per jam" → "Dukung sewa per 8 jam" (or "…per blok 8 jam"), "Harga per jam (Rp)" → "Harga per 8 jam (Rp)", drop the minimum-jam field's `<Field>` block outright. **Add** the new server-side invariant client-side too, so the error surfaces before a round-trip: when `supportsEightHour` is true, also reject `eightHourRateNumber > price` with copy like "Harga per 8 jam tidak boleh melebihi harga per hari." (mirrors the API's `eightHourRate must not exceed pricePerDay` 400). |
| [`event-items-table.tsx`](../components/event-support/event-items-table.tsx) | `{row.supportsHourly && row.hourlyRate != null && <p>{formatIDRShort(row.hourlyRate)}/jam</p>}` (lines 72-73). | `{row.supportsEightHour && row.eightHourRate != null && <p>{formatIDRShort(row.eightHourRate)}/8 jam</p>}`. |
| [`event-item-detail-view.tsx`](../components/event-support/event-item-detail-view.tsx) | `item.supportsHourly` gate (line 192), "Harga / jam" row reading `item.hourlyRate` (line 194), a "Minimum jam" row reading `item.minimumHours` with a "Default kebijakan" fallback (lines 196-197). | Gate on `item.supportsEightHour`; rename the row to "Harga / 8 jam" reading `item.eightHourRate`; **delete** the minimum-jam row entirely (no field to show). |
| [`booking-item-picker.tsx`](../components/event-support/booking-item-picker.tsx) | Takes a `settings: AdminEventSupportSettings \| null` prop, threads it into `estimateLine(item, settings, ...)` (lines 63-64, 102-109) — becomes `undefined`/unused once `estimateLine` drops that parameter (§2.2). Item picker `<SelectItem>` label reads `i2.supportsHourly && i2.hourlyRate != null ? i2.hourlyRate : i2.pricePerDay` / `"jam" : "hari"` (lines 159-160). Per-line estimate render: `{estimate.billableUnits} {estimate.unitLabel}` (line 183) — **will read "1 8 jam"** once `billableUnits` is always `1` and `unitLabel` is `"8 jam"`, same "reads like a typo" problem as the public site's cart summary. Extra-hours note block (lines 241-244) reads a field that no longer exists. | Drop the `settings` prop from `BookingItemPicker`'s own props and its `estimateLine` call (and from whatever page/parent currently fetches settings just to pass it down here — check `app/(app)/event-support/bookings/new/page.tsx` for a now-dead `getEventSupportSettings()` call once this prop is gone). Rename `supportsHourly`/`hourlyRate` reads to `supportsEightHour`/`eightHourRate`, `"jam"` label to `"8 jam"`. Fix the "1 8 jam" line: branch on `estimate.unitLabel === "8 jam"` and render just `"8 jam"` (no leading count), else `` `${estimate.billableUnits} hari` ``. **Delete** the extra-hours note block (lines 241-244) outright — nothing produces `extraHours` any more. |
| [`booking-detail-view.tsx`](../components/event-support/booking-detail-view.tsx) | `{formatIDRFull(line.unitPrice)}/{line.unitLabel} × {line.billableUnits} {line.unitLabel}` (line 101) — same "1 8 jam" double-rendering risk (here it appears **twice** per line, both as the per-unit label and the multiplier). `{line.extraHours != null && ...}` block below it (lines 102-104). | Same fix as the picker: when `line.unitLabel === "8 jam"`, render `` `${formatIDRFull(line.unitPrice)}/8 jam` `` with no `× 1 8 jam` multiplier at all (a block is a block — showing "× 1" adds nothing); keep the existing `{count} {unitLabel} ×` shape only for the `"hari"` case. Delete the `extraHours` block entirely. |
| [`lib/event-support/pdf-document.tsx`](../lib/event-support/pdf-document.tsx) | Same pattern in the PDF export: `` `${formatIDRFull(line.unitPrice)}/${line.unitLabel} × ${line.billableUnits} ${line.unitLabel}` `` plus an appended `extraHours`/`extraHoursTotal` clause (lines 58-59). | Same fix as `booking-detail-view.tsx` — branch on `"8 jam"` to drop the redundant multiplier, delete the `extraHours` clause. This is a `@react-pdf/renderer` template, not JSX, but the string-building logic is the same; keep the fix textually identical to the on-screen version so the PDF and the detail view never drift apart. |

### 2.4 Not touched, correctly

- `app/actions/event-support*.ts` — thin `"use server"` wrappers with no
  field-specific logic; they pass whatever shape the `lib/api/*.ts` layer
  gives them straight through. No edits needed once §2.1 lands, **except**
  double-check `app/actions/event-support-settings.ts` and any settings
  page component for a stray reference to a deleted field (a quick
  `grep -rn "hourlyThreshold\|roundingUnitMinutes\|capHourlyAtDailyRate\|overThresholdMode\|defaultMinimumHours" app/` after the edits above should return nothing).
- `lib/event-support/query.ts` and the routes under
  `app/(app)/event-support/**` — filter/pagination plumbing, no
  hourly-pricing-specific fields.
- The booking lifecycle (`confirm`/`cancel`/`complete`, availability
  model) — entirely unrelated to this change, per the API's own docs.

## 3. Schema regen — can happen now, unlike the public site

`lib/api/event-support*.ts` types are **hand-written**, not aliased to
`components["schemas"][...]` (§2.1's rationale), so regenerating
`schema.d.ts` does not by itself fix anything here — every rename above is
a manual edit regardless. Still worth doing, so `schema.d.ts`'s own
Event-Support entries (used nowhere directly today, per that file's
header comment, but available for any future call site) don't quietly
drift from the real API:

```bash
npm run gen:api        # targets http://localhost:3000/docs-json — needs mandana-api running locally
npx tsc --noEmit
```

Unlike `mandana-web` (whose `gen:api` points at the live, not-yet-updated
CloudFront URL — see that repo's plan, §3), this repo's `gen:api` targets
`localhost:3000`, so this can be run **today** against a local
`mandana-api` checkout with the 8-hour-pricing change already implemented
and its migration already run — no deploy required first.

## 4. Build order

1. `lib/api/event-support.ts`, `event-support-settings.ts`,
   `event-support-bookings.ts` (§2.1) — everything else depends on these
   types, so a mid-edit build will show every downstream call site as a
   type error, which doubles as a checklist.
2. `lib/event-support/pricing.ts` (§2.2) — self-contained once the types
   above compile.
3. Components (§2.3), in any order — `npx tsc --noEmit` after each will
   keep surfacing the next file that still references a renamed/deleted
   field.
4. `npm run gen:api` (§3) — do this last, so a schema diff doesn't need to
   be reconciled against in-flight hand edits.

## 5. Verification

- `npx tsc --noEmit` and `npx eslint` clean — with every field renamed,
  the compiler is the primary safety net here (same role it played for
  `mandana-api`'s own rewrite).
- `grep -rn "hourlyRate\|supportsHourly\|minimumHours\|hourlyThreshold\|capHourlyAtDailyRate\|overThresholdMode\|roundingUnitMinutes\|defaultMinimumHours\|extraHours" components/ lib/ app/` returns nothing.
- `npm run dev` (port 3001) with `mandana-api` running locally; log in as
  an admin:
  - **Settings page** (`/event-support/settings`): only the ongkir
    checkbox + note field render; saving works with no numeric validation
    left to trip over.
  - **Item form**: create an item with "Dukung sewa per 8 jam" checked and
    no rate → client-side error before submit; set a rate above the daily
    price → client-side error; set a valid rate ≤ daily price → saves,
    detail view shows "Harga / 8 jam" with no minimum-jam row.
  - **New booking**: pick that item with a window of exactly 8 hours →
    picker shows "8 jam" (not "1 8 jam") and the 8-hour rate; push the
    pickup one minute later → picker flips to daily pricing, no
    extra-hours note anywhere. Submit the booking, open its detail view
    and the exported PDF — both render the same "8 jam" (not "1 8 jam")
    text as the picker did.
- Confirm no admin session can still submit `hourlyRate`/`supportsHourly`/
  `minimumHours` to the live API — the server's `forbidNonWhitelisted`
  would 400 it, but the point of this migration is that the UI never
  offers those fields in the first place.
