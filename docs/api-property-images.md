# Property image writes are now atomic

Originally written alongside the property detail page redesign to propose
the change below; the API has since shipped it, and the admin client has
been migrated onto it (see `lib/properties/image-staging.ts`,
`lib/properties/use-property-draft.ts`, `lib/properties/use-create-property-draft.ts`).
Kept here as a record of what changed and why.

## What shipped

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
- Entry with `mediaAssetId` → attach an asset already uploaded via
  `POST /admin/media/upload`.
- An existing image whose `id` is **absent** from the array → deleted.
- Applied server-side in one transaction: all-or-nothing.

This collapsed the round-trip count the old client-side sequence needed:
media files upload in parallel via `/admin/media/upload` (unrelated to the
property until the PATCH lands), then exactly one
`PATCH /admin/properties/:id` carries both field and image changes. What
used to be N+1 sequential requests (one PATCH for fields, one POST per new
photo, one PATCH per changed photo, one DELETE per removed photo) is now
two: the uploads (parallel) and one PATCH.

The three old per-image endpoints — `POST /:id/images`,
`PATCH /:id/images/:imageId`, `DELETE /:id/images/:imageId` — are marked
`deprecated` in the OpenAPI schema and are no longer called from this repo.

## Cover exclusivity — resolved

Setting `isCover: true` on one image in the array clears the flag on every
other image for that property, server-side, in the same transaction. The
old client-side defensive fan-out (explicitly PATCHing every other image
back to `isCover: false` whenever a new cover was picked) is gone — it's
unnecessary now that the server enforces at-most-one-cover itself.
`ValidPropertyImagesBatch` additionally rejects a request that tries to set
more than one entry's `isCover: true` in the same array with a 400.

## `alt` is a full replacement, not a diff

Because the array describes the complete desired state, omitting `alt` on
an entry clears it (`entry.alt ?? null` server-side) even if the
underlying image previously had one — it does not mean "leave unchanged".
`buildImagesPayload` (`lib/properties/image-staging.ts`) always computes
`alt` from the current draft value for every visible slot, so this is
handled correctly by construction, but it's worth remembering if this
module is ever touched again: there is no such thing as "send nothing" for
an existing image's alt text once it's in the array.

## Since resolved: delete-property endpoint

`DELETE /admin/properties/:id` now exists (`lib/api/properties.ts` does not
yet call it — no delete UI has been built on the properties list/detail
pages; `DetailCard`'s `tone="danger"` treatment, already used elsewhere in
this app, is a small follow-up whenever that's wanted).

## Still open: structured validation errors

`PropertyMutationResult`'s error case is still a single flattened string
(`errorMessage()` in `app/actions/properties.ts`, joining
`error.messages`). No field-level mapping survives to the client, so a
validation failure can only ever render as one banner at the top of the
page — never pointing at the specific input that's wrong. If validation
errors were structured (`{ field: string; message: string }[]`), the
create/edit UI could highlight the actual offending field instead.
