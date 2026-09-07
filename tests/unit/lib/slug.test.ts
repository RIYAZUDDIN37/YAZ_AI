import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Urban Living")).toBe("urban-living");
  });

  it("strips non-alphanumeric characters", () => {
    expect(slugify("Riya's Workspace!!")).toBe("riya-s-workspace");
  });

  it("collapses repeated separators", () => {
    expect(slugify("  too   many   spaces  ")).toBe("too-many-spaces");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("-leading and trailing-")).toBe("leading-and-trailing");
  });

  it("falls back to a default when nothing usable remains", () => {
    expect(slugify("!!!")).toBe("workspace");
  });

  it("truncates very long input", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(60);
  });
});
