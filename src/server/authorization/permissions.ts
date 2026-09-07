import type { OrgRole } from "@prisma/client";

/**
 * Centralized permission model (spec section 6). Every role check in the
 * app should call `can()` instead of comparing `role === "OWNER"` inline —
 * that keeps the OWNER/ADMIN/MANAGER/STAFF matrix in one place as new
 * capabilities are added phase by phase, instead of scattered across
 * components.
 *
 * The list grows with each phase; what exists today covers what the app
 * can actually do (onboarding + workspace access). See CLAUDE.md for what's
 * next (inbox, customers, agent configuration, etc.).
 */
export type Permission =
  | "business:onboard"
  | "business:manage"
  | "team:manage";

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  OWNER: ["business:onboard", "business:manage", "team:manage"],
  ADMIN: ["business:onboard", "business:manage", "team:manage"],
  MANAGER: ["business:manage"],
  STAFF: [],
};

export function can(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
