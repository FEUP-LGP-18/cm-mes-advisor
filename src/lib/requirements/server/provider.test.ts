import { describe, expect, it } from "vitest";
import { readRequirementGenerationServerConfig } from "./config";
import {
  createRequirementGenerationProvider,
  getRequirementGenerationAvailability,
} from "./provider";

const parsedRequirement = {
  sourceRowNumber: 3,
  requirementId: "01.01",
  requirementDescription: "Support electronic batch review",
  l2Process: "Manufacturing Execution",
  l3Process: "Review by Exception",
  operation: "Batch review",
  demo: true,
  demoRaw: "x",
  detailDescriptionAndMotivation: "Consultants need a clear demo flow.",
  prioEms: "1",
  prioCws: "1",
  mvp: true,
  mvpRaw: "x",
  availability: "Available",
  availabilityCm: "Standard configuration",
  descriptionAvailability: "Supported by configuration.",
  supportedPercent: "100%",
  sourceComment: "Existing Excel Comment feedback.",
} as const;

describe("requirement generation provider", () => {
  it("chooses mock generation by default and returns Epic 4 drafts", async () => {
    const provider = createRequirementGenerationProvider(
      readRequirementGenerationServerConfig({}),
    );

    expect(provider.mode).toBe("mock");

    const result = await provider.generate([parsedRequirement]);

    expect(result).toMatchObject({
      ok: true,
      providerMode: "mock",
    });
    if (result.ok) {
      expect(result.drafts).toHaveLength(1);
      expect(result.drafts[0]).toMatchObject({
        generator: "mock-ai",
        requirement: {
          sourceRowNumber: 3,
          requirementId: "01.01",
        },
      });
    }
  });

  it("reports unavailable real generation when protocol details are missing", async () => {
    const provider = createRequirementGenerationProvider(
      readRequirementGenerationServerConfig({
        GENERATION_MODE: "real",
        MCP_SERVER_URL: "https://example.invalid/mcp",
        MES_BASE_URL: "https://example.invalid/mes",
        BEDROCK_API_KEY: "example-bedrock-api-key",
        BEDROCK_MODEL_ID: "example-bedrock-model-id",
        AWS_REGION: "eu-west-1",
      }),
    );

    expect(provider.mode).toBe("real");

    const result = await provider.generate([parsedRequirement]);

    expect(result).toMatchObject({
      ok: false,
      providerMode: "real",
      error: {
        code: "real-generation-unavailable",
        reason: "missing-config",
      },
    });
    if (!result.ok) {
      expect(result.error.missingConfig).toContain("MCP_PROTOCOL_DETAILS");
      expect(result.error.message).toContain("not configured yet");
      expect(result.error.message).toContain("LibreChat/RAG");
      expect(result.error.message).toContain(
        "callable MCP or HTTP protocol contract",
      );
      expect(result.error.message).not.toContain("example-bedrock-api-key");
    }
  });

  it("surfaces a safe availability summary for real mode with complete config", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      MCP_SERVER_URL: "https://example.invalid/mcp",
      MES_BASE_URL: "https://example.invalid/mes",
      BEDROCK_API_KEY: "example-bedrock-api-key",
      BEDROCK_MODEL_ID: "example-bedrock-model-id",
      AWS_REGION: "eu-west-1",
      MCP_PROTOCOL_DETAILS: "example-protocol-details",
    });

    expect(getRequirementGenerationAvailability(config)).toMatchObject({
      code: "real-generation-unavailable",
      reason: "not-implemented",
    });
  });

  it("describes the documented support package without leaking secret values", () => {
    const availability = getRequirementGenerationAvailability(
      readRequirementGenerationServerConfig({
        GENERATION_MODE: "real",
        MCP_SERVER_URL: "https://example.invalid/mcp",
        MES_BASE_URL: "https://example.invalid/mes",
        BEDROCK_API_KEY: "example-bedrock-api-key",
        BEDROCK_MODEL_ID: "example-bedrock-model-id",
        AWS_REGION: "eu-west-1",
        MCP_PROTOCOL_DETAILS: "example-protocol-details",
      }),
    );

    expect(availability).toMatchObject({
      code: "real-generation-unavailable",
      reason: "not-implemented",
    });
    expect(availability?.message).toContain("LibreChat/RAG");
    expect(availability?.message).toContain(
      "callable MCP or HTTP protocol contract",
    );
    expect(availability?.message).not.toContain("example-bedrock-api-key");
  });
});
