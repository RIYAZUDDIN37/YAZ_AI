import { describe, expect, it } from "vitest";
import { can } from "@/server/authorization/permissions";

describe("can", () => {
  it("grants OWNER and ADMIN the ability to onboard a business", () => {
    expect(can("OWNER", "business:onboard")).toBe(true);
    expect(can("ADMIN", "business:onboard")).toBe(true);
  });

  it("does not grant MANAGER or STAFF the ability to onboard a business", () => {
    expect(can("MANAGER", "business:onboard")).toBe(false);
    expect(can("STAFF", "business:onboard")).toBe(false);
  });

  it("grants MANAGER business:manage but not team:manage", () => {
    expect(can("MANAGER", "business:manage")).toBe(true);
    expect(can("MANAGER", "team:manage")).toBe(false);
  });

  it("grants STAFF conversations:manage and customers:manage (spec section 6: day-to-day CRM work)", () => {
    expect(can("STAFF", "conversations:manage")).toBe(true);
    expect(can("STAFF", "customers:manage")).toBe(true);
  });

  it("does not grant STAFF business:manage, team:manage, or catalogue:manage", () => {
    expect(can("STAFF", "business:manage")).toBe(false);
    expect(can("STAFF", "team:manage")).toBe(false);
    expect(can("STAFF", "catalogue:manage")).toBe(false);
  });

  it("grants catalogue:manage to MANAGER and up, not STAFF", () => {
    expect(can("OWNER", "catalogue:manage")).toBe(true);
    expect(can("ADMIN", "catalogue:manage")).toBe(true);
    expect(can("MANAGER", "catalogue:manage")).toBe(true);
    expect(can("STAFF", "catalogue:manage")).toBe(false);
  });

  it("never grants a permission to an unknown role", () => {
    // @ts-expect-error — deliberately an invalid role, to prove `can`
    // fails closed (via the `?? false`) rather than throwing.
    expect(can("SUPERADMIN", "business:manage")).toBe(false);
  });
});
