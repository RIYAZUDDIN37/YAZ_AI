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

  it("grants STAFF no permissions in the current matrix", () => {
    expect(can("STAFF", "business:manage")).toBe(false);
    expect(can("STAFF", "team:manage")).toBe(false);
  });
});
