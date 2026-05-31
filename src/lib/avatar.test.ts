import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AVATAR_COLORS,
  getSavedAvatarColor,
  getInitials,
  getDisplayName,
  getDefaultAvatarColor,
  getSavedDisplayName,
  saveProfilePreferences,
} from "./avatar";

function installLocalStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => {
        values.delete(key);
      },
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    },
  });
  return values;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getInitials", () => {
  it("returns initials from two-part email local", () => {
    expect(getInitials("leonor.pintas@example.com")).toBe("LP");
  });

  it("handles underscore and dash separators", () => {
    expect(getInitials("john_doe@example.com")).toBe("JD");
    expect(getInitials("jane-smith@example.com")).toBe("JS");
  });

  it("handles display names with spaces", () => {
    expect(getInitials("Owner User")).toBe("OU");
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

describe("profile preference storage", () => {
  it("uses the active profile email for topbars that do not receive an email", () => {
    installLocalStorage();

    saveProfilePreferences("Owner@Example.com", "Owner User", AVATAR_COLORS[3]);

    expect(getSavedDisplayName()).toBe("Owner User");
    expect(getSavedAvatarColor()).toBe(AVATAR_COLORS[3]);
  });

  it("does not leak saved display names between different emails", () => {
    installLocalStorage();

    saveProfilePreferences("owner@example.com", "Owner User", AVATAR_COLORS[2]);

    expect(getSavedDisplayName("other@example.com")).toBeNull();
  });

  it("falls back to the deterministic avatar color when stored color is not in the palette", () => {
    installLocalStorage({
      "mes-advisor:active-profile-email": "owner@example.com",
      "mes-advisor:avatar-color:owner@example.com": "url(https://example.com/bad.png)",
    });

    expect(getSavedAvatarColor()).toBe(getDefaultAvatarColor("owner@example.com"));
  });
});
