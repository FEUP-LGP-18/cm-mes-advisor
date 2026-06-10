import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { readRequirementGenerationServerConfig } from "@/lib/requirements/server/config";
import {
  buildMasterDataAiSuggestions,
  MasterDataRealGenerationUnavailableError,
} from "@/lib/master-data/server/provider";

vi.mock("@/lib/requirements/server/config", () => ({
  readRequirementGenerationServerConfig: vi.fn(),
}));

vi.mock("@/lib/master-data/server/provider", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/master-data/server/provider")
  >("@/lib/master-data/server/provider");

  return {
    ...actual,
    buildMasterDataAiSuggestions: vi.fn(),
  };
});

const readConfigMock = vi.mocked(readRequirementGenerationServerConfig);
const buildSuggestionsMock = vi.mocked(buildMasterDataAiSuggestions);

const realConfig = {
  anthropicApiKey: "unit-test-anthropic-key",
  anthropicMaxTokens: 1200,
  anthropicModel: "claude-haiku-4-5-20251001",
  anthropicTemperature: 0.1,
  anthropicVersion: "2023-06-01",
  awsAccessKeyId: null,
  awsBearerTokenBedrock: null,
  awsRegion: null,
  awsSecretAccessKey: null,
  awsSessionToken: null,
  bedrockModelId: null,
  generationProvider: "anthropic" as const,
  mcpServerUrl: "http://localhost:3000/api/requirements/mcp",
  mcpServerUrlKind: "self" as const,
  mcpUserAccount: null,
  mesBaseUrl: null,
  mode: "real" as const,
};

describe("POST /api/master-data/ai-smoke", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("hides the smoke endpoint when the shared token is not configured", async () => {
    const response = await POST(
      new Request("http://localhost/api/master-data/ai-smoke", {
        headers: {
          "x-ai-smoke-token": "secret",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(404);
    expect(buildSuggestionsMock).not.toHaveBeenCalled();
  });

  it("hides the smoke endpoint when the request token is missing or wrong", async () => {
    vi.stubEnv("AI_SMOKE_TEST_TOKEN", "secret");

    const response = await POST(
      new Request("http://localhost/api/master-data/ai-smoke", {
        headers: {
          "x-ai-smoke-token": "wrong",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(404);
    expect(buildSuggestionsMock).not.toHaveBeenCalled();
  });

  it("runs real Master Data generation and returns only safe summary fields", async () => {
    vi.stubEnv("AI_SMOKE_TEST_TOKEN", "secret");
    readConfigMock.mockReturnValue(realConfig);
    buildSuggestionsMock.mockResolvedValue({
      product: {
        confidence: {
          level: "medium",
          rationale: "Grounded in product setup documentation.",
        },
        description:
          "Generated product description should not be returned by smoke.",
        nameHint: "Smoke Product",
        typeHint: "Finished good",
        warnings: ["Review product naming."],
      },
    });

    const response = await POST(
      new Request("http://localhost/api/master-data/ai-smoke", {
        headers: {
          "x-ai-smoke-token": "secret",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toMatchObject({
      ok: true,
      generation: {
        generatedAtLooksRuntime: true,
        generator: "anthropic-mcp",
        mcpServerUrlKind: "self",
        mode: "real",
        objectTypesWithSuggestions: 1,
        provider: "anthropic",
      },
    });
    expect(body.generation.totalObjects).toBeGreaterThan(0);
    expect(body.generation.logCount).toBeGreaterThan(0);
    expect(body.generation.traceabilityCount).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain(
      "Generated product description should not be returned by smoke.",
    );
  });

  it("counts only usable AI suggestions in the safe smoke summary", async () => {
    vi.stubEnv("AI_SMOKE_TEST_TOKEN", "secret");
    readConfigMock.mockReturnValue(realConfig);
    buildSuggestionsMock.mockResolvedValue({
      product: undefined,
    });

    const response = await POST(
      new Request("http://localhost/api/master-data/ai-smoke", {
        headers: {
          "x-ai-smoke-token": "secret",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      generation: {
        objectTypesWithSuggestions: 0,
      },
    });
  });

  it("returns unavailable when real mode is disabled", async () => {
    vi.stubEnv("AI_SMOKE_TEST_TOKEN", "secret");
    readConfigMock.mockReturnValue({
      ...realConfig,
      mode: "mock",
    });

    const response = await POST(
      new Request("http://localhost/api/master-data/ai-smoke", {
        headers: {
          "x-ai-smoke-token": "secret",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "real-mode-disabled",
      },
      ok: false,
    });
    expect(buildSuggestionsMock).not.toHaveBeenCalled();
  });

  it("returns safe missing-config details when Master Data real generation is unavailable", async () => {
    vi.stubEnv("AI_SMOKE_TEST_TOKEN", "secret");
    readConfigMock.mockReturnValue(realConfig);
    buildSuggestionsMock.mockRejectedValue(
      new MasterDataRealGenerationUnavailableError(
        "Grounded Master Data generation is not configured for this environment.",
        { reason: "missing-config" },
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/master-data/ai-smoke", {
        headers: {
          "x-ai-smoke-token": "secret",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "real-generation-unavailable",
        message:
          "Grounded Master Data generation is not configured for this environment.",
        reason: "missing-config",
      },
      generation: {
        generator: "anthropic-mcp",
        mcpServerUrlKind: "self",
        mode: "real",
        provider: "anthropic",
      },
    });
  });
});
