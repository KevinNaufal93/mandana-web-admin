# Users -- Web Admin Integration Guide

Audience: the admin panel's User Management section -- managing the accounts
that can sign in to this panel. Every user row doubles as a **property
agent**: `title` / `phone` / `whatsapp` / photo are the agent card rendered
on public property detail pages (`properties.agent_id` FKs to `users`).
There is no separate "agent" entity or endpoint -- an agent is just any
`User` row a property points at.

## 1. Base URL, auth & response envelope

All routes live under `/api/v1/admin/users`, spec at `/docs-json` (tagged
`admin`). Every route requires a Bearer token for a user with the `admin`
role -- an `editor` token gets **403**. Responses follow the shared
envelope: `{ "data": {...} }` on a single item, `{ "data": [...] }` on the
list. `DELETE` returns **204 with no body**.

## 2. Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/users` | **No query params at all** -- no pagination, no search, no role/status filter. Bare array, fixed sort `createdAt DESC`. |
| GET | `/admin/users/{id}` | `id` must be a UUID -- a malformed id is **400**, not 404. |
| POST | `/admin/users` | 201. 409 when the email is already in use. |
| PATCH | `/admin/users/{id}` | 200, returns the updated user. |
| DELETE | `/admin/users/{id}` | 204. 400 `"You cannot delete your own account"` when `id` is the caller's own id. |
| POST | `/admin/users/{id}/photo` | `multipart/form-data`, file field name **`file`**. |

## 3. DTOs

`CreateUserDto`:

| Field | Required | Rules |
|---|---|---|
| `email` | yes | must be a valid email; uniqueness checked -> 409 |
| `name` | yes | 2-255 chars |
| `password` | yes | 8-128 chars, no complexity rule |
| `role` | no | `"admin" \| "editor"`, defaults to `editor` when omitted |
| `title` | no | <=100 chars |
| `phone` | no | <=30 chars, no format check |
| `whatsapp` | no | <=30 chars, no format check |

`UpdateUserDto` -- all optional: `name` (2-255), `role`, `isActive`
(boolean), `password` (8-128, re-hashed), `title`, `phone`, `whatsapp`.

**`email` is not a field on `UpdateUserDto`.** The API's global
`ValidationPipe` runs `forbidNonWhitelisted: true`, so a PATCH body that
includes `email` is a **400**, not a silent no-op. Email is immutable
after creation.

**`photoMediaAssetId` is not writable on create or update, anywhere.**
The photo can only be set by posting a raw file to
`POST /admin/users/{id}/photo` -- this module does the media upload for
you server-side instead of the usual "upload to `/admin/media/upload`,
then pass the returned id" flow every other admin module uses.

## 4. Response shape

Mapped through `UsersMapper` (not the raw `User` entity directly --
`passwordHash` / `hashedRefreshToken` were already excluded via
`ClassSerializerInterceptor`, but the mapper is what adds `photo`):

```jsonc
{ "data": {
  "id": "uuid", "createdAt": "ISO", "updatedAt": "ISO",
  "email": "editor@mandana.com", "name": "Budi Editor",
  "role": "editor", "isActive": true,
  "title": null, "phone": null, "whatsapp": null,
  "photoMediaAssetId": null, "photo": null
} }
```

**Every response carries a renderable `photo`.** `findAll`/`findOne`/
`updateUser` load the `photoMediaAsset` relation (`findById`'s
`withPhoto` option -- off by default, since `findById` doubles as every
JWT strategy's per-request lookup and shouldn't pay for the join there),
and `setPhoto` attaches the just-uploaded asset in memory instead of a
second round-trip. `UsersMapper.toDto` then serializes it through
`MediaService.buildImageDto()`, same as `properties.agent.photo`. `photo`
is `null` when no photo has been uploaded; `photoMediaAssetId` stays as a
cheap presence check that doesn't require rendering anything.

## 5. Hard delete, and what it does not protect against

There is no soft delete -- `DELETE` removes the row outright. Two things
worth knowing before wiring a delete button:

- `properties.agent_id` is `ON DELETE SET NULL`, so deleting a user who
  is assigned as an agent on live listings succeeds silently -- no 409,
  and the affected properties just lose their agent card.
- The only server-side protection is the self-delete 400. There is
  **no guard against deleting, demoting, or deactivating the last
  remaining admin**, and no guard against demoting/deactivating
  yourself (only deleting yourself is blocked). The admin panel adds its
  own advisory guards for these (disabling the relevant controls in the
  UI), but they are UI-only -- any direct API caller bypasses them.

## 6. Password and session notes

- Changing a password does **not** invalidate existing sessions --
  `hashedRefreshToken` is untouched and no logout blacklist entry is
  written, so old tokens keep working until they naturally expire or the
  user logs out.
- Setting `isActive: false` takes effect immediately on the *next*
  request -- both the access-token and refresh-token strategies re-check
  `isActive` per request, so deactivating a user effectively ends their
  session without a logout.
- A deactivated user is rejected at `POST /auth/login` with the generic
  `"Invalid credentials"` -- indistinguishable from a wrong password.

## 7. Known gaps (tracked, not blocking)

1. No pagination, search, or filtering on `GET /admin/users` -- fine
   while the user count stays small, will need backend work once it
   doesn't.
2. No last-admin guard and no self-demote/self-deactivate guard
   server-side -- the admin UI's guards are advisory only.

Resolved: renderable photos on user responses (see §4) -- previously
listed here as gap 1.
