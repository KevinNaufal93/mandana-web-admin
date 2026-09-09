/**
 * Client-safe module key list, split out for the same reason
 * lib/users/roles.ts is: <PermissionMatrix> and <AppSidebar> need the
 * closed set of module keys without pulling a `server-only` module
 * (lib/api/rbac.ts) into the client bundle. The full catalog (labels,
 * grantable/alwaysOn flags) is still server data, fetched from
 * GET /admin/rbac/modules — see lib/api/rbac.ts.
 */
export const ACCESS_MODULES = [
  "dashboard",
  "properties",
  "event-support",
  "storage",
  "moving",
  "content-media",
  "users",
  "notifications",
  "rbac",
] as const;

export type AccessModule = (typeof ACCESS_MODULES)[number];
