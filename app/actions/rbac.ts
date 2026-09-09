"use server";

import { revalidatePath } from "next/cache";
import { updateRolePermissions, type RolePermissions } from "@/lib/api/rbac";
import type { AccessModule } from "@/lib/rbac/modules";
import type { UserRole } from "@/lib/users/roles";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("rbac");

/** Same errorMessage() idiom as app/actions/users.ts and app/actions/storage.ts —
 *  components never hand-write error copy. */
function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal menyimpan perubahan hak akses.";
}

export type RbacResult = { ok: true; data: RolePermissions } | { ok: false; error: string };

/**
 * revalidatePath("/", "layout") busts every cached page under (app), not
 * just /rbac — a grant change has to be reflected in the sidebar and in
 * every requireModule()/requireAdmin() page guard immediately, for every
 * session, not only the admin who made the change.
 */
export async function updateRolePermissionsAction(
  role: UserRole,
  modules: AccessModule[],
): Promise<RbacResult> {
  const result = await updateRolePermissions(role, modules);
  if (!result.ok) {
    log.warn("Update role permissions failed", { role, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath("/", "layout");
  return { ok: true, data: result.data };
}
