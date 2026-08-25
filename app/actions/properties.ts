"use server";

import { revalidatePath } from "next/cache";
import {
  getAdminProperty,
  updateProperty,
  addPropertyImage,
  updatePropertyImage,
  deletePropertyImage,
  type AdminPropertyDetail,
  type AdminPropertyUpdateInput,
  type AdminPropertyImageUpdateInput,
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

/**
 * Every write endpoint below returns a differently-shaped (or empty) body
 * — PATCH /admin/properties/:id returns the raw saved entity (not the
 * mapped detail shape adminFindOne returns), the image endpoints return
 * 200/204 with no useful payload. Rather than reconcile three ad-hoc
 * response shapes client-side, every mutation re-fetches through the one
 * read path that's already correct (getAdminProperty →
 * PropertyMapper.toDetail) and hands the caller that.
 */
async function refreshed(id: string): Promise<PropertyMutationResult> {
  const result = await getAdminProperty(id);
  if (!result.ok) return { ok: false, error: errorMessage(result.error) };
  return { ok: true, data: result.data };
}

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
  return refreshed(id);
}

export async function uploadPropertyImageAction(
  id: string,
  formData: FormData,
): Promise<PropertyMutationResult> {
  const result = await addPropertyImage(id, formData);
  if (!result.ok) {
    log.warn("Upload property image failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath(`/properties/${id}`);
  revalidatePath("/properties");
  return refreshed(id);
}

export async function updatePropertyImageAction(
  propertyId: string,
  imageId: string,
  patch: AdminPropertyImageUpdateInput,
): Promise<PropertyMutationResult> {
  const result = await updatePropertyImage(propertyId, imageId, patch);
  if (!result.ok) {
    log.warn("Update property image failed", { propertyId, imageId, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  return refreshed(propertyId);
}

export async function deletePropertyImageAction(
  propertyId: string,
  imageId: string,
): Promise<PropertyMutationResult> {
  const result = await deletePropertyImage(propertyId, imageId);
  if (!result.ok) {
    log.warn("Delete property image failed", { propertyId, imageId, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  return refreshed(propertyId);
}
