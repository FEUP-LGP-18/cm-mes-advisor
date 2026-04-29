import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const createClientMock = vi.mocked(createClient);

describe("GET /auth/callback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("preserves Supabase session cookies on the successful redirect", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

    createClientMock.mockImplementationOnce(async (response) => {
      response?.cookies.set("sb-test-auth-token", "session", {
        httpOnly: true,
        path: "/",
      });

      return {
        auth: {
          exchangeCodeForSession: vi
            .fn()
            .mockResolvedValue({ error: null }),
        },
      } as unknown as Awaited<ReturnType<typeof createClient>>;
    });

    const response = await GET(
      new Request(
        "http://localhost/auth/callback?code=auth-code&next=/projects/demo/source",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/projects/demo/source",
    );
    expect(response.headers.get("set-cookie") ?? "").toContain(
      "sb-test-auth-token=session",
    );
  });
});
