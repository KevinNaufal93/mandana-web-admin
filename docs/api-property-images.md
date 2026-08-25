# API change: batch property image writes

Written alongside the property detail page redesign (see
`components/properties/property-images-field.tsx`), which stages image
additions/edits/removals client-side and commits them on Save, the same
moment field edits commit. This document specifies the backend change that
would make that commit atomic; today's client sequences four separate
endpoint calls instead, which is what shipped in this pass.

## Why this exists

`POST /admin/properties/:id/images` takes a multipart body with a required
`file` field (`addPropertyImage`, `lib/api/properties.ts:237`) — it has no
way to attach an already-uploaded asset. That rules out reusing
event-support's `mediaAssetId`-based deferred-attach pattern
(`components/event-support/image-picker.tsx`), which is what lets that
section's image field stay a single controlled input with no sequencing at
all.

Today's client-side sequence, on Save, in order:

1. `PATCH /admin/properties/:id` — field changes (skipped if no field
   changed, to avoid touching `updatedAt` for an images-only save)
2. `POST /admin/properties/:id/images` — once per newly-added photo
3. `PATCH /admin/properties/:id/images/:imageId` — alt text and/or cover
   changes on existing photos (including explicitly un-setting the previous
   cover on every other existing photo — see "Cover exclusivity" below)
4. `DELETE /admin/properties/:id/images/:imageId` — once per removed photo,
   ordered last since it's the only destructive step

Each step round-trips and re-fetches the full property
(`refreshed()` in `app/actions/properties.ts`). A save that adds two photos,
edits one alt text, and removes one existing photo is 5 sequential requests.
It is also **not atomic**: a failure partway through (network drop, a 5xx on
upload #2 of 3) leaves the property in a real, useful, but partially-applied
state. The client is written to recover from this — it re-syncs to
whatever succeeded, reports what didn't, and a retry only re-attempts the
remainder — but it cannot make the whole batch succeed-or-fail together.

## Recommended change

`PATCH /admin/properties/:id` accepts an optional `images` field describing
the **complete desired end state** of the property's image set:

```jsonc
{
  // ...existing field patch shape, unchanged...
  "images": [
    { "id": "img_123", "alt": "Tampak depan", "isCover": true },
    { "mediaAssetId": "media_abc", "alt": "Ruang tamu", "sortOrder": 1 }
  ]
}
```

- Entry with `id` → update (or no-op, if nothing differs) an existing image.
- Entry with `mediaAssetId` → attach an asset already uploaded via the
  existing `POST /admin/media/upload` (already used by event-support; see
  `lib/api/media.ts`).
- An existing image whose `id` is **absent** from the array → deleted.
- Applied server-side in one transaction: all-or-nothing.

This also collapses the round-trip count: media files upload in parallel via
the existing `/admin/media/upload` (unrelated to this property until the
PATCH lands), then exactly one `PATCH /admin/properties/:id` carries both
field and image changes. N+1 sequential requests become 2.

## Fallback, if a single combined endpoint is too large a change

`PUT /admin/properties/:id/images` — same desired-end-state array, scoped to
images only. Atomic within the image set, but still a separate request from
the field `PATCH`, so a save can still partially apply (fields committed,
images not, or vice versa). Meaningfully better than today regardless — collapses
steps 2–4 above into one call.

## Open question this change should resolve: cover exclusivity

Does setting `isCover: true` on one image automatically clear the flag on
every other image for that property, server-side? The current client
**assumes no** and defensively PATCHes every other existing image that
currently has `isCover: true` back to `false` whenever the user picks a new
cover, specifically to avoid two images both carrying the flag. If the
server already enforces this exclusivity in one transaction, that
defensive fan-out is unnecessary — worth confirming either way, since a
batched write is the natural place to enforce it properly (e.g. clearing
every other `isCover` in the same transaction that sets the new one).

## Separately: no delete-property endpoint exists

`lib/api/properties.ts` exports no `deleteProperty`, and there's no
corresponding endpoint. Event-support already has an equivalent danger-zone
card and delete action for its items; properties has neither. This redesign
prepared `DetailCard`'s `tone="danger"` treatment for exactly this, but does
**not** ship a delete button — there's nothing for it to call yet. Once
`DELETE /admin/properties/:id` (or an `archived`-then-purge equivalent, if
hard deletes aren't desired) exists, wiring the danger-zone card in is a
small follow-up.

## Separately: structured validation errors

`PropertyMutationResult`'s error case is a single flattened string
(`errorMessage()` in `app/actions/properties.ts`, joining
`error.messages`). No field-level mapping survives to the client, so a
validation failure can only ever render as one banner at the top of the
page — never pointing at the specific input that's wrong. If validation
errors were structured (`{ field: string; message: string }[]`), the edit
UI could highlight the actual offending field instead. Out of scope for the
image-batching change above, but the same shape of problem, worth tracking
alongside it.
