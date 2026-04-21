import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/requirements/generation-availability", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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
});
