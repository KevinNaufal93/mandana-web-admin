"use server";

import { revalidatePath } from "next/cache";
import {
  getAdminProperty,
  updateProperty,
  createProperty,
  type AdminPropertyDetail,
  type AdminPropertyUpdateInput,
  type CreatePropertyInput,
} from "@/lib/api/properties";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("properties");

export type PropertyMutationResult =
  | { ok: true; data: AdminPropertyDetail }
  | { ok: false; error: string };

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal menyimpan perubahan.";
}

/** POST /admin/properties returns the raw saved entity, not the mapped
 *  detail shape (no images/propertyType/agent relations, price as a
 *  numeric string) — re-fetch through the one read path that's already
 *  correct (getAdminProperty → PropertyMapper.toDetail) and hand the
 *  caller that instead. */
async function refreshed(id: string): Promise<PropertyMutationResult> {
  const result = await getAdminProperty(id);
  if (!result.ok) return { ok: false, error: errorMessage(result.error) };
  return { ok: true, data: result.data };
}

export async function createPropertyAction(input: CreatePropertyInput): Promise<PropertyMutationResult> {
  const result = await createProperty(input);
  if (!result.ok) {
    log.warn("Create property failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath("/properties");
  return refreshed(result.data.id);
}

/**
 * PATCH /admin/properties/:id now returns the full mapped detail shape
 * (properties.service.ts's update()) — no re-fetch needed, unlike create
 * above and unlike this action itself before the atomic images batch
 * shipped.
 */
export async function updatePropertyAction(
  id: string,
  patch: AdminPropertyUpdateInput,
): Promise<PropertyMutationResult> {
  const result = await updateProperty(id, patch);
  if (!result.ok) {
    log.warn("Update property failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath(`/properties/${id}`);
  revalidatePath("/properties");
  return { ok: true, data: result.data };
}
