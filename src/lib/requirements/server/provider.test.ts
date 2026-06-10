import { describe, expect, it } from "vitest";
import { readRequirementGenerationServerConfig } from "./config";
import { AnthropicRequestError } from "./anthropic-client";
import { BedrockRequestError } from "./bedrock-client";
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
  it("chooses mock generation by default and returns deterministic drafts", async () => {
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

  it("reports unavailable real generation when Bedrock auth is missing", async () => {
    const provider = createRequirementGenerationProvider(
      readRequirementGenerationServerConfig({
        GENERATION_MODE: "real",
        MCP_SERVER_URL: "https://example.invalid/mcp",
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
    if (!result.ok && result.error.code === "real-generation-unavailable") {
      expect(result.error.missingConfig).toEqual(["AWS_BEARER_TOKEN_BEDROCK"]);
      expect(result.error.message).toContain("not configured yet");
      expect(result.error.message).not.toContain("example-bedrock-model-id");
    }
  });

  it("reports real generation as available when config is complete", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      MCP_SERVER_URL: "https://example.invalid/mcp",
      BEDROCK_MODEL_ID: "example-bedrock-model-id",
      AWS_REGION: "eu-south-2",
      AWS_BEARER_TOKEN_BEDROCK: "ABSKexample-token",
    });

    expect(getRequirementGenerationAvailability(config)).toBeNull();
  });

  it("reports unavailable real generation when Anthropic config is incomplete", async () => {
    const provider = createRequirementGenerationProvider(
      readRequirementGenerationServerConfig({
        GENERATION_MODE: "real",
        REQUIREMENT_GENERATION_PROVIDER: "anthropic",
        MCP_SERVER_URL: "https://example.invalid/mcp",
        ANTHROPIC_API_KEY: "sk-ant-secret-value",
      }),
    );

    const result = await provider.generate([parsedRequirement]);

    expect(result).toMatchObject({
      ok: false,
      providerMode: "real",
      error: {
        code: "real-generation-unavailable",
        reason: "missing-config",
      },
    });
    if (!result.ok && result.error.code === "real-generation-unavailable") {
      expect(result.error.missingConfig).toEqual(["ANTHROPIC_MODEL"]);
      expect(result.error.message).toContain("not configured yet");
      expect(result.error.message).not.toContain("sk-ant-secret-value");
    }
  });

  it("reports Anthropic real generation as available when config is complete", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      REQUIREMENT_GENERATION_PROVIDER: "anthropic",
      MCP_SERVER_URL: "https://example.invalid/mcp",
      ANTHROPIC_API_KEY: "sk-ant-example-key",
      ANTHROPIC_MODEL: "claude-haiku-4-5-20251001",
    });

    expect(getRequirementGenerationAvailability(config)).toBeNull();
  });

  it("uses the real orchestration path when complete config is provided", async () => {
    const provider = createRequirementGenerationProvider(
      readRequirementGenerationServerConfig({
        GENERATION_MODE: "real",
        MCP_SERVER_URL: "https://example.invalid/mcp",
        BEDROCK_MODEL_ID: "example-bedrock-model-id",
        AWS_REGION: "eu-south-2",
        AWS_BEARER_TOKEN_BEDROCK: "ABSKexample-token",
      }),
      {
        async createDocumentationClient() {
          return {
            async lookupRequirementDocumentation() {
              return {
                primaryChunks: [],
                adjacentChunks: [],
                allChunks: [
                  {
                    id: "chunk-1",
                    title: "Electronic batch review",
                    text: "Review by exception is configured from the batch review screen.",
                    sourceUrl: "https://example.invalid/docs/review",
                    docSource: "Documentation Portal",
                    docVersion: "9.0",
                    previousChunkId: null,
                    nextChunkId: null,
                  },
                ],
              };
            },
            async close() {},
          };
        },
        createModelClient() {
          return {
            async checkAvailability() {},
            async generateDraft() {
              return {
                generatedComment:
                  "CM MES supports electronic batch review through the batch review screen.",
                confidenceLevel: "high" as const,
                confidenceRationale:
                  "The retrieved documentation explicitly covers review by exception.",
                assumptions: ["The batch review configuration is present."],
                warnings: [],
                demoSteps: [
                  {
                    title: "Open Batch Review",
                    mesModuleOrScreen: "Batch Review",
                    reviewStatus: "draft" as const,
                    instructions: [
                      "Open the batch review module.",
                      "Select the batch under review by exception.",
                    ],
                  },
                ],
              };
            },
          };
        },
      },
    );

    const result = await provider.generate([parsedRequirement]);

    expect(result).toMatchObject({
      ok: true,
      providerMode: "real",
    });
    if (result.ok) {
      expect(result.drafts[0]).toMatchObject({
        generator: "bedrock-mcp",
        sourceReferences: [
          {
            kind: "mcp-documentation",
          },
        ],
      });
    }
  });

  it("uses the Anthropic real orchestration path when selected", async () => {
    const provider = createRequirementGenerationProvider(
      readRequirementGenerationServerConfig({
        GENERATION_MODE: "real",
        REQUIREMENT_GENERATION_PROVIDER: "anthropic",
        MCP_SERVER_URL: "https://example.invalid/mcp",
        ANTHROPIC_API_KEY: "sk-ant-example-key",
        ANTHROPIC_MODEL: "claude-haiku-4-5-20251001",
      }),
      {
        async createDocumentationClient() {
          return {
            async lookupRequirementDocumentation() {
              return {
                primaryChunks: [],
                adjacentChunks: [],
                allChunks: [
                  {
                    id: "chunk-1",
                    title: "Electronic batch review",
                    text: "Review by exception is configured from the batch review screen.",
                    sourceUrl: "https://example.invalid/docs/review",
                    docSource: "Documentation Portal",
                    docVersion: "9.0",
                    previousChunkId: null,
                    nextChunkId: null,
                  },
                ],
              };
            },
            async close() {},
          };
        },
        createModelClient() {
          return {
            async checkAvailability() {},
            async generateDraft() {
              return {
                generatedComment:
                  "CM MES supports electronic batch review through the batch review screen.",
                confidenceLevel: "high" as const,
                confidenceRationale:
                  "The retrieved documentation explicitly covers review by exception.",
                assumptions: ["The batch review configuration is present."],
                warnings: [],
                demoSteps: [
                  {
                    title: "Open Batch Review",
                    mesModuleOrScreen: "Batch Review",
                    reviewStatus: "draft" as const,
                    instructions: [
                      "Open the batch review module.",
                      "Select the batch under review by exception.",
                    ],
                  },
                ],
              };
            },
          };
        },
      },
    );

    const result = await provider.generate([parsedRequirement]);

    expect(result).toMatchObject({
      ok: true,
      providerMode: "real",
    });
    if (result.ok) {
      expect(result.drafts[0]).toMatchObject({
        generator: "anthropic-mcp",
        sourceReferences: [
          {
            kind: "mcp-documentation",
          },
        ],
      });
    }
  });

  it("surfaces blocked real access as an unavailable result instead of a generic failure", async () => {
    const provider = createRequirementGenerationProvider(
      readRequirementGenerationServerConfig({
        GENERATION_MODE: "real",
        MCP_SERVER_URL: "https://example.invalid/mcp",
        BEDROCK_MODEL_ID: "example-bedrock-model-id",
        AWS_REGION: "eu-south-2",
        AWS_BEARER_TOKEN_BEDROCK: "ABSKexample-token",
      }),
      {
        async createDocumentationClient() {
          return {
            async lookupRequirementDocumentation() {
              return {
                primaryChunks: [],
                adjacentChunks: [],
                allChunks: [
                  {
                    id: "chunk-1",
                    title: "Electronic batch review",
                    text: "Review by exception is configured from the batch review screen.",
                    sourceUrl: "https://example.invalid/docs/review",
                    docSource: "Documentation Portal",
                    docVersion: "9.0",
                    previousChunkId: null,
                    nextChunkId: null,
                  },
                ],
              };
            },
            async close() {},
          };
        },
        createModelClient() {
          return {
            async checkAvailability() {},
            async generateDraft() {
              throw new BedrockRequestError("Blocked", {
                cause: {
                  message:
                    "AccessDeniedException: User is not authorized to call bedrock:CallWithBearerToken",
                  name: "AccessDeniedException",
                },
              });
            },
          };
        },
      },
    );

    const result = await provider.generate([parsedRequirement]);

    expect(result).toMatchObject({
      ok: false,
      providerMode: "real",
      error: {
        code: "real-generation-unavailable",
        reason: "blocked",
      },
    });
  });

  it("surfaces blocked Anthropic access as an unavailable result", async () => {
    const provider = createRequirementGenerationProvider(
      readRequirementGenerationServerConfig({
        GENERATION_MODE: "real",
        REQUIREMENT_GENERATION_PROVIDER: "anthropic",
        MCP_SERVER_URL: "https://example.invalid/mcp",
        ANTHROPIC_API_KEY: "sk-ant-example-key",
        ANTHROPIC_MODEL: "claude-haiku-4-5-20251001",
      }),
      {
        async createDocumentationClient() {
          return {
            async lookupRequirementDocumentation() {
              return {
                primaryChunks: [],
                adjacentChunks: [],
                allChunks: [
                  {
                    id: "chunk-1",
                    title: "Electronic batch review",
                    text: "Review by exception is configured from the batch review screen.",
                    sourceUrl: "https://example.invalid/docs/review",
                    docSource: "Documentation Portal",
                    docVersion: "9.0",
                    previousChunkId: null,
                    nextChunkId: null,
                  },
                ],
              };
            },
            async close() {},
          };
        },
        createModelClient() {
          return {
            async checkAvailability() {},
            async generateDraft() {
              throw new AnthropicRequestError("Blocked", {
                status: 403,
              });
            },
          };
        },
      },
    );

    const result = await provider.generate([parsedRequirement]);

    expect(result).toMatchObject({
      ok: false,
      providerMode: "real",
      error: {
        code: "real-generation-unavailable",
        reason: "blocked",
      },
    });
  });
});
