import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "../../../../lib/supabase/server";
import { GET } from "./route";

vi.mock("../../../../lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const createClientMock = vi.mocked(createClient);

describe("GET /api/requirements/generation-availability", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns missing-config for real mode when local setup is incomplete", async () => {
    vi.stubEnv("MCP_SERVER_URL", "");
    vi.stubEnv("BEDROCK_MODEL_ID", "");
    vi.stubEnv("AWS_REGION", "");
    vi.stubEnv("AWS_BEARER_TOKEN_BEDROCK", "");

    const response = await GET(
      new Request("http://localhost/api/requirements/generation-availability"),
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: true,
      modes: {
        mock: {
          available: true,
          status: "available",
        },
        real: {
          available: false,
          status: "missing-config",
        },
      },
    });
  });

  it("accepts a refresh query parameter", async () => {
    vi.stubEnv("MCP_SERVER_URL", "");
    vi.stubEnv("BEDROCK_MODEL_ID", "");
    vi.stubEnv("AWS_REGION", "");
    vi.stubEnv("AWS_BEARER_TOKEN_BEDROCK", "");

    const response = await GET(
      new Request(
        "http://localhost/api/requirements/generation-availability?refresh=1",
      ),
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: true,
    });
  });

  it("returns 401 when Supabase auth is configured without a user", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    createClientMock.mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const response = await GET(
      new Request("http://localhost/api/requirements/generation-availability"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Authentication required.",
    });
  });
});
