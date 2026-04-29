import { describe, expect, it } from "vitest";
import {
  AUTH_NOT_CONFIGURED_MESSAGE,
  getAuthRedirectErrorMessage,
  mapSignInError,
  mapSignUpError,
  sanitizeAuthNextPath,
} from "./auth-messages";

describe("auth message helpers", () => {
  it("keeps same-origin relative next paths", () => {
    expect(sanitizeAuthNextPath("/projects/demo?step=review")).toBe(
      "/projects/demo?step=review",
    );
  });

  it("rejects absolute and protocol-relative next paths", () => {
    expect(sanitizeAuthNextPath("https://example.com/projects")).toBe("/");
    expect(sanitizeAuthNextPath("//example.com/projects")).toBe("/");
    expect(sanitizeAuthNextPath(null)).toBe("/");
  });

  it("maps callback and setup error codes to visible messages", () => {
    expect(getAuthRedirectErrorMessage("auth-callback-failed")).toContain(
      "could not be verified",
    );
    expect(getAuthRedirectErrorMessage("auth-not-configured")).toBe(
      AUTH_NOT_CONFIGURED_MESSAGE,
    );
    expect(getAuthRedirectErrorMessage("unexpected")).toBeNull();
  });

  it("maps common Supabase sign-in and sign-up failures", () => {
    expect(mapSignInError("Invalid login credentials")).toContain(
      "Invalid email or password",
    );
    expect(mapSignUpError("User already exists")).toContain(
      "already exists",
    );
  });
});
