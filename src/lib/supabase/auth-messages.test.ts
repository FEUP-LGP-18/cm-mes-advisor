import { describe, expect, it } from "vitest";
import {
  AUTH_NOT_CONFIGURED_MESSAGE,
  buildAuthCallbackUrl,
  buildPasswordResetRedirectUrl,
  getAuthRedirectErrorMessage,
  mapPasswordResetError,
  mapSignInError,
  mapSignUpError,
  sanitizeAuthNextPath,
} from "./auth-messages";

describe("auth message helpers", () => {
  it("builds auth callback URLs from the configured production site URL", () => {
    expect(
      buildAuthCallbackUrl({
        currentOrigin: "https://cm-mes-advisor-preview.vercel.app",
        next: "/projects/demo/source",
        siteUrl: "https://cm-mes-advisor.vercel.app",
      }),
    ).toBe(
      "https://cm-mes-advisor.vercel.app/auth/callback?next=%2Fprojects%2Fdemo%2Fsource",
    );
  });

  it("falls back to the current origin when no configured site URL exists", () => {
    expect(
      buildAuthCallbackUrl({
        currentOrigin: "https://cm-mes-advisor-preview.vercel.app",
        next: "/projects/demo/source",
        siteUrl: "",
      }),
    ).toBe(
      "https://cm-mes-advisor-preview.vercel.app/auth/callback?next=%2Fprojects%2Fdemo%2Fsource",
    );
  });

  it("sanitizes unsafe next paths before adding them to auth callbacks", () => {
    expect(
      buildAuthCallbackUrl({
        currentOrigin: "https://cm-mes-advisor.vercel.app",
        next: "https://evil.example/projects",
        siteUrl: "https://cm-mes-advisor.vercel.app",
      }),
    ).toBe("https://cm-mes-advisor.vercel.app/auth/callback?next=%2F");
  });

  it("builds password reset redirects through the auth callback route", () => {
    expect(
      buildPasswordResetRedirectUrl({
        currentOrigin: "https://preview.vercel.app",
        siteUrl: "https://cm-mes-advisor.vercel.app",
      }),
    ).toBe(
      "https://cm-mes-advisor.vercel.app/auth/callback?next=%2Freset-password",
    );
  });

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
    expect(mapSignUpError("User already exists")).toContain("already exists");
    expect(mapSignUpError("email rate limit exceeded")).toContain(
      "Too many attempts",
    );
    expect(mapPasswordResetError("email rate limit exceeded")).toContain(
      "Too many reset emails",
    );
  });
});
