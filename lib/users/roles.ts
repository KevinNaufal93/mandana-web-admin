/**
 * The user role enum, split out of lib/api/users.ts (which has
 * `import "server-only"`) so client components -- UserForm needs the list
 * of roles to populate its <Select> -- can import it without dragging the
 * whole server-only API module into the client bundle. Same reasoning as
 * lib/storage/query.ts's STORAGE_UNIT_STATUSES living outside lib/api/storage.ts.
 */
export const USER_ROLES = ["admin", "editor"] as const;
export type UserRole = (typeof USER_ROLES)[number];
