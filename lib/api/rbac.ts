import "server-only";
import { serverApi, unwrap } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { UserRole } from "@/lib/users/roles";
import type { AccessModule } from "@/lib/rbac/modules";

/**
 * Unlike lib/api/users.ts / auth-endpoints.ts, RbacController carries real
 * @ApiOkResponse({type}) decorators on every route, so the generated schema
 * types these responses properly — no `content?: never` hand-rolling
 * needed here.
 */
export type AccessModuleInfo = components["schemas"]["AccessModuleResponseDto"];
export type RolePermissions = components["schemas"]["RolePermissionsResponseDto"];

export async function getAccessModules(): Promise<ApiResult<AccessModuleInfo[]>> {
  const api = await serverApi();
  const result = await api.GET("/admin/rbac/modules");
  return unwrap<AccessModuleInfo[]>(result);
}

export async function getRbacMatrix(): Promise<ApiResult<RolePermissions[]>> {
  const api = await serverApi();
  const result = await api.GET("/admin/rbac/permissions");
  return unwrap<RolePermissions[]>(result);
}

/**
 * Full replacement set for one role. Sending back an alwaysOn module (e.g.
 * 'dashboard') is harmless — the API treats it as a no-op rather than a
 * validation error — so callers can safely PUT back exactly what
 * getRbacMatrix() returned, plus whatever the admin changed.
 */
export async function updateRolePermissions(
  role: UserRole,
  modules: AccessModule[],
): Promise<ApiResult<RolePermissions>> {
  const api = await serverApi();
  const result = await api.PUT("/admin/rbac/permissions/{role}", {
    params: { path: { role } },
    body: { modules },
  });
  return unwrap<RolePermissions>(result);
}
