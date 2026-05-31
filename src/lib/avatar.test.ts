import { describe, expect, it } from "vitest";
import {
  AVATAR_COLORS,
  getInitials,
  getDisplayName,
  getDefaultAvatarColor,
} from "./avatar";

describe("getInitials", () => {
  it("returns initials from two-part email local", () => {
    expect(getInitials("leonor.pintas@example.com")).toBe("LP");
  });

  it("handles underscore and dash separators", () => {
    expect(getInitials("john_doe@example.com")).toBe("JD");
    expect(getInitials("jane-smith@example.com")).toBe("JS");
  });

  it("returns first two chars when no separator", () => {
    expect(getInitials("admin@example.com")).toBe("AD");
  });

  it("returns U for null or undefined", () => {
    expect(getInitials(null)).toBe("U");
    expect(getInitials(undefined)).toBe("U");
  });
});

describe("getDisplayName", () => {
  it("formats dot-separated parts as title case words", () => {
    expect(getDisplayName("leonor.pintas@example.com")).toBe("Leonor Pintas");
  });

  it("formats underscore-separated parts", () => {
    expect(getDisplayName("john_doe@example.com")).toBe("John Doe");
  });

  it("returns User for null or undefined", () => {
    expect(getDisplayName(null)).toBe("User");
    expect(getDisplayName(undefined)).toBe("User");
  });
});

describe("getDefaultAvatarColor", () => {
  it("returns a color from the palette", () => {
    const color = getDefaultAvatarColor("test@example.com");
    expect(AVATAR_COLORS).toContain(color);
  });

  it("returns deterministic color for the same email", () => {
    const a = getDefaultAvatarColor("same@example.com");
    const b = getDefaultAvatarColor("same@example.com");
    expect(a).toBe(b);
  });

  it("returns different colors for different emails", () => {
    const colors = new Set(
      ["a@x.com", "b@x.com", "c@x.com", "d@x.com"].map(getDefaultAvatarColor),
    );
    expect(colors.size).toBeGreaterThan(1);
  });

  it("returns first palette color for null or undefined", () => {
    expect(getDefaultAvatarColor(null)).toBe(AVATAR_COLORS[0]);
    expect(getDefaultAvatarColor(undefined)).toBe(AVATAR_COLORS[0]);
  });
});
