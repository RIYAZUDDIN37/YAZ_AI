import type { OrgRole } from "@prisma/client";

/**
 * Centralized permission model (spec section 6). Every role check in the
 * app should call `can()` instead of comparing `role === "OWNER"` inline —
 * that keeps the OWNER/ADMIN/MANAGER/STAFF matrix in one place as new
 * capabilities are added phase by phase, instead of scattered across
 * components.
 *
 * The list grows with each phase; what exists today covers what the app
 * can actually do. See CLAUDE.md for what's next.
 */
export type Permission =
  | "business:onboard"
  | "business:manage"
  | "team:manage"
  | "conversations:manage";

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  OWNER: ["business:onboard", "business:manage", "team:manage", "conversations:manage"],
  ADMIN: ["business:onboard", "business:manage", "team:manage", "conversations:manage"],
  MANAGER: ["business:manage", "conversations:manage"],
  // Spec section 6: STAFF gets "conversation takeover" and "limited
  // customer access" — everyone who can be assigned a conversation needs
  // conversations:manage, unlike the business-wide settings permissions.
  STAFF: ["conversations:manage"],
};

export function can(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
