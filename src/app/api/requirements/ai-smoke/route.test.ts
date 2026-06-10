import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { readRequirementGenerationServerConfig } from "../../../../lib/requirements/server/config";
import {
  getRequirementGenerationAvailabilitySnapshot,
  resetRequirementGenerationAvailabilityCache,
} from "../../../../lib/requirements/server/availability";
import { createRequirementGenerationProvider } from "../../../../lib/requirements/server/provider";

vi.mock("../../../../lib/requirements/server/config", () => ({
  readRequirementGenerationServerConfig: vi.fn(),
}));

vi.mock("../../../../lib/requirements/server/availability", () => ({
  getRequirementGenerationAvailabilitySnapshot: vi.fn(),
  resetRequirementGenerationAvailabilityCache: vi.fn(),
}));

vi.mock("../../../../lib/requirements/server/provider", () => ({
  createRequirementGenerationProvider: vi.fn(),
}));

const readConfigMock = vi.mocked(readRequirementGenerationServerConfig);
const availabilityMock = vi.mocked(getRequirementGenerationAvailabilitySnapshot);
const resetAvailabilityMock = vi.mocked(
  resetRequirementGenerationAvailabilityCache,
);
const createProviderMock = vi.mocked(createRequirementGenerationProvider);

const realConfig = {
  awsAccessKeyId: null,
  awsBearerTokenBedrock: "token",
  awsRegion: "eu-west-1",
  awsSecretAccessKey: null,
  awsSessionToken: null,
  anthropicApiKey: null,
  anthropicMaxTokens: 1200,
  anthropicModel: null,
  anthropicTemperature: 0.1,
  anthropicVersion: "2023-06-01",
  bedrockModelId: "model-id",
  generationProvider: "bedrock" as const,
  mcpServerUrl: "https://example.invalid/mcp",
  mcpUserAccount: "consultant@example.com",
  mesBaseUrl: "https://example.invalid/mes",
  mode: "real" as const,
};

describe("POST /api/requirements/ai-smoke", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("hides the smoke endpoint when the shared token is not configured", async () => {
    const response = await POST(
      new Request("http://localhost/api/requirements/ai-smoke", {
        headers: {
          "x-ai-smoke-token": "secret",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(404);
    expect(resetAvailabilityMock).not.toHaveBeenCalled();
  });

  it("hides the smoke endpoint when the request token is missing or wrong", async () => {
    vi.stubEnv("AI_SMOKE_TEST_TOKEN", "secret");

    const response = await POST(
      new Request("http://localhost/api/requirements/ai-smoke", {
        headers: {
          "x-ai-smoke-token": "wrong",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(404);
    expect(resetAvailabilityMock).not.toHaveBeenCalled();
  });

  it("runs real availability and generation without exposing generated text", async () => {
    vi.stubEnv("AI_SMOKE_TEST_TOKEN", "secret");
    readConfigMock.mockReturnValue(realConfig);
    availabilityMock.mockResolvedValue({
      checkedAt: "2026-06-02T18:00:00.000Z",
      modes: {
        mock: {
          available: true,
          message: "Draft mode is available.",
          mode: "mock",
          status: "available",
        },
        real: {
          available: true,
          message: "Grounded generation is available.",
          mode: "real",
          status: "available",
        },
      },
      ok: true,
    });
    createProviderMock.mockReturnValue({
      mode: "real",
      async generate() {
        return {
          drafts: [
            {
              assumptions: [],
              confidence: {
                level: "medium",
                rationale: "Grounded response.",
                score: 0.7,
              },
              demoSteps: [
                {
                  id: "step-1",
                  instructions: ["Open batch review.", "Review exceptions."],
                  mesModuleOrScreen: "Batch Review",
                  relatedRequirementIds: ["AI-SMOKE-001"],
                  reviewStatus: "draft",
                  sourceReferences: [],
                  title: "Review batch exceptions",
                },
              ],
              generatedAt: "2026-06-02T18:00:01.000Z",
              generatedComment: "Generated text should not be returned.",
              generator: "anthropic-mcp",
              requirement: {
                requirementId: "AI-SMOKE-001",
                requirementKey: "1:AI-SMOKE-001",
                sourceRowNumber: 1,
              },
              schemaVersion: 1,
              sourceReferences: [
                {
                  id: "doc-1",
                  kind: "mcp-documentation",
                  label: "MES docs",
                  note: "Documentation Portal",
                },
              ],
              warnings: ["Review before presenting."],
            },
          ],
          ok: true,
          providerMode: "real",
        };
      },
    });

    const response = await POST(
      new Request("http://localhost/api/requirements/ai-smoke", {
        headers: {
          "x-ai-smoke-token": "secret",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      availability: {
        available: true,
        status: "available",
      },
      generation: {
        commentLength: 38,
        confidence: "medium",
        demoSteps: 1,
        firstStepInstructions: 2,
        generatedAtLooksRuntime: true,
        generator: "anthropic-mcp",
        mcpServerUrlKind: "external",
        providerMode: "real",
        sourceReferences: 1,
        warnings: 1,
      },
    });
  });

  it("returns unavailable when production is not configured for real mode", async () => {
    vi.stubEnv("AI_SMOKE_TEST_TOKEN", "secret");
    readConfigMock.mockReturnValue({
      ...realConfig,
      mode: "mock",
    });

    const response = await POST(
      new Request("http://localhost/api/requirements/ai-smoke", {
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
    expect(availabilityMock).not.toHaveBeenCalled();
  });
});
