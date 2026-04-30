import { afterEach, describe, expect, it, vi } from "vitest";
import { requireUser } from "../../../../lib/projects/permissions.server";
import { GET } from "./route";

vi.mock("../../../../lib/projects/permissions.server", () => ({
  requireUser: vi.fn(),
}));

const requireUserMock = vi.mocked(requireUser);

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
    requireUserMock.mockResolvedValueOnce({
      message: "Authentication required.",
      ok: false,
      status: "not_authenticated",
    });

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
