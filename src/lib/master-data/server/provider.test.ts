import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMasterDataAiSuggestions,
  MasterDataRealGenerationUnavailableError,
} from "./provider";
import { readRequirementGenerationServerConfig } from "@/lib/requirements/server/config";
import { createRequirementDocumentationClient } from "@/lib/requirements/server/mcp-client";
import { createSelfHostedRequirementDocumentationClient } from "@/lib/requirements/server/self-mcp-docs";

const bedrockSendMock = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: class {
    send = bedrockSendMock;
  },
  ConverseCommand: class {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

vi.mock("@/lib/requirements/server/config", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/requirements/server/config")
  >("@/lib/requirements/server/config");

  return {
    ...actual,
    readRequirementGenerationServerConfig: vi.fn(),
  };
});

vi.mock("@/lib/requirements/server/mcp-client", () => ({
  createRequirementDocumentationClient: vi.fn(),
}));

vi.mock("@/lib/requirements/server/self-mcp-docs", () => ({
  createSelfHostedRequirementDocumentationClient: vi.fn(),
}));

const readConfigMock = vi.mocked(readRequirementGenerationServerConfig);
const createExternalDocumentationClientMock = vi.mocked(
  createRequirementDocumentationClient,
);
const createSelfDocumentationClientMock = vi.mocked(
  createSelfHostedRequirementDocumentationClient,
);

const requirement = {
  availability: "Available",
  availabilityCm: "Standard",
  consultantComment: "Consultant approved product setup for the demo.",
  demo: true,
  demoRaw: "x",
  descriptionAvailability: "Standard configuration.",
  detailDescriptionAndMotivation:
    "Products and materials must be ready for traceable execution.",
  l2Process: "Manufacturing Execution",
  l3Process: "Product Setup",
  mvp: true,
  mvpRaw: "x",
  operation: "Create product",
  prioCws: "1",
  prioEms: "1",
  requirementDescription:
    "Create product master data with traceability for finished goods.",
  requirementId: "03.01",
  requirementKey: "12:03.01",
  reviewNote: "",
  reviewStatus: "approved",
  sourceComment: "Use product setup in the demo.",
  sourceRowNumber: 12,
  supportedPercent: "100%",
};

const documentationClient = {
  close: vi.fn(async () => {}),
  lookupRequirementDocumentation: vi.fn(async () => ({
    adjacentChunks: [],
    allChunks: [
      {
        docSource: "CM MES Demo Advisor docs",
        docVersion: "repo",
        id: "product-setup",
        nextChunkId: null,
        previousChunkId: null,
        sourceUrl: "/docs/product-setup",
        text: "Product setup supports traceable finished goods in CM MES.",
        title: "Product setup",
      },
    ],
    primaryChunks: [],
  })),
};

const anthropicConfig = {
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

describe("buildMasterDataAiSuggestions", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns no suggestions for mock mode", async () => {
    const result = await buildMasterDataAiSuggestions({
      mode: "mock",
      requirements: [requirement],
      selectedObjectTypes: ["product"],
    });

    expect(Object.keys(result)).toEqual([]);
    expect(readConfigMock).not.toHaveBeenCalled();
  });

  it("uses Anthropic with the self-hosted MCP client when selected", async () => {
    readConfigMock.mockReturnValue(anthropicConfig);
    createSelfDocumentationClientMock.mockReturnValue(documentationClient);
    const fetchMock = vi.fn(async () =>
      Response.json({
        content: [
          {
            input: {
              confidenceLevel: "medium",
              confidenceRationale:
                "The suggestion is grounded in product setup documentation.",
              description:
                "Create a CM MES product record that consultants can review before importing.",
              nameHint: "Customer X Product",
              typeHint: "Finished good",
              warnings: ["Confirm product naming with the MES consultant."],
            },
            name: "emit_master_data_suggestion",
            type: "tool_use",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await buildMasterDataAiSuggestions({
      mode: "real",
      requirements: [requirement],
      selectedObjectTypes: ["product"],
    });

    expect(createSelfDocumentationClientMock).toHaveBeenCalledTimes(1);
    expect(createExternalDocumentationClientMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "x-api-key": "unit-test-anthropic-key",
        }),
      }),
    );
    const fetchCall = fetchMock.mock.calls[0] as unknown as [
      string,
      { body?: unknown },
    ];
    const body = JSON.parse(String(fetchCall[1].body));
    expect(body).toMatchObject({
      model: "claude-haiku-4-5-20251001",
      tool_choice: {
        name: "emit_master_data_suggestion",
        type: "tool",
      },
    });
    expect(result.product).toEqual({
      confidence: {
        level: "medium",
        rationale: "The suggestion is grounded in product setup documentation.",
      },
      description:
        "Create a CM MES product record that consultants can review before importing.",
      nameHint: "Customer X Product",
      typeHint: "Finished good",
      warnings: ["Confirm product naming with the MES consultant."],
    });
    expect(documentationClient.close).toHaveBeenCalledTimes(1);
  });

  it("does not count malformed Anthropic output as a usable suggestion", async () => {
    readConfigMock.mockReturnValue(anthropicConfig);
    createSelfDocumentationClientMock.mockReturnValue(documentationClient);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          content: [
            {
              text: "not valid suggestion json",
              type: "text",
            },
          ],
        }),
      ),
    );

    const result = await buildMasterDataAiSuggestions({
      mode: "real",
      requirements: [requirement],
      selectedObjectTypes: ["product"],
    });

    expect(result).toEqual({});
    expect(documentationClient.close).toHaveBeenCalledTimes(1);
  });

  it("reports missing Anthropic config without leaking secrets", async () => {
    readConfigMock.mockReturnValue({
      ...anthropicConfig,
      anthropicModel: null,
    });

    await expect(
      buildMasterDataAiSuggestions({
        mode: "real",
        requirements: [requirement],
        selectedObjectTypes: ["product"],
      }),
    ).rejects.toMatchObject({
      message:
        "Grounded Master Data generation is not configured for this environment.",
      reason: "missing-config",
    });

    await buildMasterDataAiSuggestions({
      mode: "real",
      requirements: [requirement],
      selectedObjectTypes: ["product"],
    }).catch((error) => {
      expect(error).toBeInstanceOf(MasterDataRealGenerationUnavailableError);
      expect(error.message).not.toContain("unit-test-anthropic-key");
    });
  });

  it("preserves the Bedrock provider path for non-Anthropic environments", async () => {
    readConfigMock.mockReturnValue({
      ...anthropicConfig,
      anthropicApiKey: null,
      anthropicModel: null,
      awsBearerTokenBedrock: "bedrock-token",
      awsRegion: "eu-west-1",
      bedrockModelId: "bedrock-model",
      generationProvider: "bedrock",
      mcpServerUrl: "https://example.invalid/mcp",
      mcpServerUrlKind: "external",
    });
    createExternalDocumentationClientMock.mockResolvedValue(
      documentationClient,
    );
    bedrockSendMock.mockResolvedValue({
      output: {
        message: {
          content: [
            {
              text: JSON.stringify({
                confidenceLevel: "high",
                confidenceRationale: "Bedrock response parsed.",
                description: "Bedrock product suggestion.",
                warnings: [],
              }),
            },
          ],
        },
      },
    });

    const result = await buildMasterDataAiSuggestions({
      mode: "real",
      requirements: [requirement],
      selectedObjectTypes: ["product"],
    });

    expect(createExternalDocumentationClientMock).toHaveBeenCalledWith({
      mcpServerUrl: "https://example.invalid/mcp",
      mcpUserAccount: null,
    });
    expect(bedrockSendMock).toHaveBeenCalledTimes(1);
    expect(result.product?.description).toBe("Bedrock product suggestion.");
  });
});
