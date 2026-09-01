"use server";

import { revalidatePath } from "next/cache";
import {
  getUser,
  createUser,
  updateUser,
  deleteUser,
  setUserPhoto,
  type AdminUser,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/api/users";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("users");

/** Copy of app/actions/storage.ts's errorMessage() — see that file's
 *  header comment for why `conflict` gets its own copy per call site
 *  rather than the server's raw English text. */
function errorMessage(error: ApiError, copy?: { conflict?: string; fallback?: string }): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.kind === "conflict" && copy?.conflict) return copy.conflict;
  if (error.messages.length > 0) return error.messages.join(" ");
  return copy?.fallback ?? "Gagal menyimpan perubahan.";
}

export type UserResult = { ok: true; data: AdminUser } | { ok: false; error: string; conflict?: true };

/** Create/update DTOs differ slightly from the read shape, so — same rule
 *  as storage's refreshedUnitType() — every mutation re-reads through the
 *  one path that's already correct. */
async function refreshedUser(id: string): Promise<UserResult> {
  const result = await getUser(id);
  if (!result.ok) return { ok: false, error: errorMessage(result.error) };
  return { ok: true, data: result.data };
}

export async function createUserAction(input: CreateUserInput): Promise<UserResult> {
  const result = await createUser(input);
  if (!result.ok) {
    log.warn("Create user failed", { kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, {
        conflict: "Email ini sudah terdaftar. Gunakan email lain.",
        fallback: "Gagal membuat pengguna.",
      }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/users");
  return { ok: true, data: result.data };
}

export async function updateUserAction(id: string, patch: UpdateUserInput): Promise<UserResult> {
  const result = await updateUser(id, patch);
  if (!result.ok) {
    log.warn("Update user failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, {
        conflict: "Email ini sudah terdaftar. Gunakan email lain.",
        fallback: "Gagal menyimpan pengguna.",
      }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/users/${id}`);
  revalidatePath("/users");
  return refreshedUser(id);
}

export async function deleteUserAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await deleteUser(id);
  if (!result.ok) {
    log.warn("Delete user failed", { id, kind: result.error.kind });
    // The API's self-delete guard returns 400 ("You cannot delete your own
    // account"), which parses to kind:"validation", not "conflict" — the
    // UI is expected to hide the delete button on your own row anyway (see
    // UserDetailView), so this message is a backstop, not the primary UX.
    return {
      ok: false,
      error: errorMessage(result.error, { fallback: "Gagal menghapus pengguna." }),
    };
  }
  revalidatePath("/users");
  return { ok: true };
}

export async function setUserPhotoAction(id: string, formData: FormData): Promise<UserResult> {
  const result = await setUserPhoto(id, formData);
  if (!result.ok) {
    log.warn("Set user photo failed", { id, kind: result.error.kind });
    // 415 (unsupported mime) arrives as kind:"server", status:415 — not a
    // `kind` this module otherwise branches on, so it needs an explicit
    // status check rather than a `kind` check.
    const message =
      result.error.kind === "server" && result.error.status === 415
        ? "Format gambar harus JPEG, PNG, atau WebP."
        : errorMessage(result.error, { fallback: "Gagal mengunggah foto." });
    return { ok: false, error: message };
  }
  revalidatePath(`/users/${id}`);
  revalidatePath("/users");
  return { ok: true, data: result.data };
}
