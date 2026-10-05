@AGENTS.md

# Mandana Admin: project context

Staff admin panel for Mandana Property. It is one of three repos: `mandana-web` (public site), `mandana-api` (the only thing that touches the database) and this one. Each has its own `CLAUDE.md`; the cross-repo overview and the "admin-editable value" recipe are in `mandana-web/CLAUDE.md`.

## Names

The admin labels differ from the code. Event Support is **Mandana Living**, Storage is **Mandana Space**, Moving is **Mandana Move**. The labels live in `lib/ui/nav-items.ts`. UI copy is Indonesian ("Simpan perubahan", "Menyimpan…", "Perubahan tersimpan.", "(opsional)").

## How a page is built

- **Server page,** which opens with `await requireModule("<module>")` (`lib/auth/dal.ts`, the real security boundary; the sidebar only hides links). It then calls a cached getter and renders a client form. On a load failure it renders an inline `ErrorPanel` instead of throwing.
- **`lib/api/<x>.ts`** is `import "server-only"`. It uses `serverApi()` and `unwrap()`, and PATCH bodies are cast `as unknown as components["schemas"]["UpdateXDto"]`.
- **Client-visible constants or types** go in `lib/<x>/shared.ts`, without `server-only`. A client component cannot import a server-only file. This has broken a build before (`lib/seo/shared.ts`, `lib/rbac/modules.ts`).
- **Server actions** live in `app/actions/<x>.ts`. They return `{ ok: true, data } | { ok: false, error }` and call `revalidatePath`. They do not call `requireModule`; the API's own guard enforces access.
- **Layouts must fetch nothing.** A segment's `error.tsx` renders inside its own layout, so a throwing layout escapes it.
- **There is no toast library.** Errors are `<div role="alert" className="rounded-lg border border-destructive/30 ...">`, success is `<p role="status">Perubahan tersimpan.</p>`, and the button shows `Menyimpan…` while pending.

## Settings singletons

Moving, Storage, Event Support, SEO and Property each have a GET/PATCH singleton on the API and a form here:

- Moving: `components/moving/moving-settings-form.tsx`
- Storage: `components/storage/storage-settings-form.tsx`
- Event Support: `components/event-support/event-support-settings-form.tsx`
- SEO: `components/seo/seo-settings-form.tsx`
- Property (KPR): `app/(app)/properties/settings` and `components/properties/property-settings-form.tsx`

They are always-editable forms with no view/edit toggle, and they send the full set of fields. WhatsApp numbers use `components/settings/whatsapp-number-field.tsx` and `lib/whatsapp-number.ts` (a regex that mirrors the API's, so keep them in step). Percentages elsewhere are whole integers; the KPR rate is the one decimal field and accepts a comma or a dot.

## Adding an RBAC module or a nav entry

Three places must agree: the API enum `AccessModule` (and its editor-grant migration), `lib/rbac/modules.ts` here, and `lib/ui/nav-items.ts` (which also drives the topbar title). Properties has no tab layout, so a sub-page there needs its own heading and a link from the list page.

## Running and verifying

- **`npm run gen:api`** regenerates `lib/api/schema.d.ts` from `http://localhost:3000/docs-json`, so a local `mandana-api` must be running. Run it after any DTO or route change, otherwise typed `api.GET`/`PATCH` calls will not compile for new routes.
- **Type-check:** `npx tsc --noEmit`, then `npx next build`. Lint by path (`npx eslint <paths>`).
- **Pointing at a local API:** `NEXT_PUBLIC_API_BASE_URL` in both `.env` and `.env.local` (line 1 of `.env`, line 3 of `.env.local`). Back them up first and restore them afterwards. Then `rm -rf .next && npx next build && npx next start -p 3001`.
- **Browser tests with Playwright:** the admin keeps a long-lived connection open (notifications stream), so `waitUntil: 'networkidle'` always times out. Use `'load'` and wait for a specific selector instead. Log in at `/login` with the email and password inputs. See `mandana-web/CLAUDE.md` for where Playwright is installed and for the Windows shell notes (Write tool plus `node` for non-trivial edits).
- You need a local admin user to log in. See `mandana-api/CLAUDE.md` for how to create a throwaway one, and delete it afterwards.
