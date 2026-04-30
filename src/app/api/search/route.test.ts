import { afterEach, describe, expect, it, vi } from "vitest";
import { requireUser } from "@/lib/projects/permissions.server";
import { GET } from "./route";

vi.mock("@/lib/projects/permissions.server", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/docs/source", () => ({
  source: {},
}));

vi.mock("fumadocs-core/search/server", () => ({
  createFromSource: () => ({
    GET: vi.fn().mockResolvedValue(Response.json({ results: [] })),
  }),
}));

const requireUserMock = vi.mocked(requireUser);

describe("GET /api/search", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns 401 when Supabase auth is configured without a user", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    requireUserMock.mockResolvedValueOnce({
      message: "Authentication required.",
      ok: false,
      status: "not_authenticated",
    });

    const response = await GET(
      new Request("http://localhost/api/search?query=auth"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Authentication required.",
    });
  });
});
