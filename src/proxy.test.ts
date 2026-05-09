import {
  getRedirectUrl,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "@/lib/supabase/middleware";
import { config, proxy } from "./proxy";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

const updateSessionMock = vi.mocked(updateSession);

const doesProxyMatch = unstable_doesMiddlewareMatch;

describe("proxy auth routing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("does not run for API routes because they return their own JSON 401s", () => {
    expect(
      doesProxyMatch({
        config,
        nextConfig: {},
        url: "/api/requirements/generate",
      }),
    ).toBe(false);
  });

  it("runs for protected app routes", () => {
    expect(
      doesProxyMatch({
        config,
        nextConfig: {},
        url: "/projects/demo/source",
      }),
    ).toBe(true);
  });

  it("requires a session for the project dashboard home", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    updateSessionMock.mockResolvedValueOnce({
      supabaseResponse: NextResponse.next(),
      user: null,
    });

    const response = await proxy(new NextRequest("http://localhost/"));

    expect(getRedirectUrl(response)).toBe("http://localhost/login?next=%2F");
  });

  it("requires a session for project routes", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    updateSessionMock.mockResolvedValueOnce({
      supabaseResponse: NextResponse.next(),
      user: null,
    });

    const response = await proxy(
      new NextRequest("http://localhost/projects/demo/source"),
    );

    expect(getRedirectUrl(response)).toBe(
      "http://localhost/login?next=%2Fprojects%2Fdemo%2Fsource",
    );
  });

  it("skips auth entirely when Supabase is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const response = await proxy(
      new NextRequest("http://localhost/projects/demo/source"),
    );

    expect(response.status).toBe(200);
    expect(updateSessionMock).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to login while preserving next", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    updateSessionMock.mockResolvedValueOnce({
      supabaseResponse: NextResponse.next(),
      user: null,
    });

    const response = await proxy(
      new NextRequest("http://localhost/docs/architecture?row=2"),
    );

    expect(getRedirectUrl(response)).toBe(
      "http://localhost/login?next=%2Fdocs%2Farchitecture%3Frow%3D2",
    );
  });

  it("does not require a session for auth routes", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

    const response = await proxy(new NextRequest("http://localhost/login"));

    expect(response.status).toBe(200);
    expect(updateSessionMock).not.toHaveBeenCalled();
  });
});
