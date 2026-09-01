import "server-only";
import { cache } from "react";
import { serverApi, unwrap } from "@/lib/api/server-client";
import { verifySession } from "@/lib/auth/dal";
import { parseApiError, type ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { UserRole } from "@/lib/users/roles";

export type { UserRole };

/**
 * GET /admin/users has real @ApiOkResponse-free operations in the live
 * schema.d.ts (every UsersAdminController_* op is `content?: never`), same
 * situation as lib/api/auth-endpoints.ts — so the read shape below is
 * hand-written, not aliased to components["schemas"][...]. It mirrors
 * CurrentUser in lib/api/auth-endpoints.ts exactly, because both come off
 * the same serialized User entity (ClassSerializerInterceptor @Excludes
 * passwordHash/hashedRefreshToken either way).
 *
 * The USER_ROLES/UserRole enum itself lives in lib/users/roles.ts (no
 * `server-only`), not here, so client components can import the role list
 * without pulling this whole server-only module into the client bundle.
 */
export interface AdminUser {
  id: string;
  createdAt: string;
  updatedAt: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  title: string | null;
  phone: string | null;
  whatsapp: string | null;
  /**
   * Bare uuid — photoMediaAsset is `eager: false` and no service method
   * loads the relation, so there is no renderable {url, srcset, ...} on
   * ANY /admin/users response, including the response to the upload
   * itself. Presence only; do not attempt to render this as an image URL.
   */
  photoMediaAssetId: string | null;
}

export async function listUsers(): Promise<ApiResult<AdminUser[]>> {
  const api = await serverApi();
  const result = await api.GET("/admin/users");
  return unwrap<AdminUser[]>(result);
}

/** cache() so generateMetadata() and the page share one request. */
export const getUser = cache(async (id: string): Promise<ApiResult<AdminUser>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/users/{id}", { params: { path: { id } } });
  return unwrap<AdminUser>(result);
});

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  title?: string;
  phone?: string;
  whatsapp?: string;
}

/**
 * No `email` here on purpose: UpdateUserDto does not whitelist it, and the
 * API's global ValidationPipe runs with forbidNonWhitelisted:true, so
 * sending it in a PATCH is a 400, not a no-op. Email is immutable after
 * creation. Keeping this as a separate type (rather than Partial<CreateUserInput>)
 * closes that trap structurally instead of relying on every call site to
 * remember to omit the field.
 */
export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
  title?: string;
  phone?: string;
  whatsapp?: string;
}

export async function createUser(input: CreateUserInput): Promise<ApiResult<AdminUser>> {
  const api = await serverApi();
  const result = await api.POST("/admin/users", {
    body: input as unknown as components["schemas"]["CreateUserDto"],
  });
  return unwrap<AdminUser>(result);
}

export async function updateUser(id: string, patch: UpdateUserInput): Promise<ApiResult<AdminUser>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/users/{id}", {
    params: { path: { id } },
    body: patch as unknown as components["schemas"]["UpdateUserDto"],
  });
  return unwrap<AdminUser>(result);
}

/** 204. 400 (not 403/409) when id === the caller's own id — see
 *  app/actions/users.ts for how that gets mapped to Indonesian copy. */
export async function deleteUser(id: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.DELETE("/admin/users/{id}", { params: { path: { id } } });
  return unwrap<void>(result);
}

/**
 * Raw fetch, same rationale as uploadMedia in lib/api/media.ts: a
 * multipart body's `file` field isn't representable as real FormData in
 * the generated schema's types. `formData` must contain a `file` field
 * (JPEG/PNG/WebP, max 20MB — a 415 comes back otherwise). Returns the
 * updated user, but per AdminUser's doc comment, its photoMediaAssetId
 * is the only proof of success available — there is still no URL.
 */
export async function setUserPhoto(id: string, formData: FormData): Promise<ApiResult<AdminUser>> {
  const { accessToken } = await verifySession();
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/admin/users/${id}/photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` }, // no Content-Type — fetch sets the multipart boundary
      body: formData,
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: { kind: "network" } };
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) return { ok: false, error: parseApiError(response.status, body) };
  return { ok: true, data: (body as { data: AdminUser }).data };
}
