import type { OrganizationRole } from "../api/organizations";

// Mirrors each backend route's allowed-roles list exactly (see the
// server/src/modules/*/*.routes.ts files) so the UI never offers an action
// that would 403.
export const hasRole = (role: OrganizationRole | undefined, allowed: OrganizationRole[]): boolean =>
  !!role && allowed.includes(role);

export const MANAGE_ROLES: OrganizationRole[] = ["OWNER", "ADMIN", "MANAGER"];
export const ADMIN_ROLES: OrganizationRole[] = ["OWNER", "ADMIN"];
export const TASK_WRITE_ROLES: OrganizationRole[] = ["OWNER", "ADMIN", "MANAGER", "MEMBER"];
