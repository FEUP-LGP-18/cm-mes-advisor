import { beforeEach, describe, expect, it, vi } from "vitest";

const { bedrockRuntimeClientMock, sendMock } = vi.hoisted(() => {
  const sendMock = vi.fn();
  const bedrockRuntimeClientMock = vi.fn(function BedrockRuntimeClient() {
    return {
      send: sendMock,
    };
  });

  return {
    bedrockRuntimeClientMock,
    sendMock,
  };
});

vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: bedrockRuntimeClientMock,
  ConverseCommand: vi.fn(function ConverseCommand(input) {
    return input;
  }),
}));

import {
  BedrockRequestError,
  BedrockResponseFormatError,
  createBedrockRequirementGenerationClient,
} from "./bedrock-client";

const standardRequirement = {
  sourceRowNumber: 3,
  requirementId: "01.01",
  requirementDescription: "Support electronic batch record review",
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

const assessment = {
  supportType: "standard" as const,
  confidence: {
    level: "high" as const,
    score: 0.9,
    rationale: "Availability data suggests standard support.",
  },
  assumptions: ["The documentation reflects the active CM MES build."],
  warnings: [],
};

describe("bedrock requirement generation client", () => {
  beforeEach(() => {
    sendMock.mockReset();
    bedrockRuntimeClientMock.mockClear();
  });

  it("constructs the Bedrock client with bearer token auth when available", () => {
    createBedrockRequirementGenerationClient({
      awsAccessKeyId: null,
      awsBearerTokenBedrock: "ABSKexample-token",
      awsRegion: "eu-south-2",
      awsSecretAccessKey: null,
      awsSessionToken: null,
      bedrockModelId: "example-bedrock-model-id",
    });

    expect(bedrockRuntimeClientMock).toHaveBeenCalledWith({
      authSchemePreference: ["httpBearerAuth"],
      region: "eu-south-2",
      token: {
        token: "ABSKexample-token",
      },
    });
  });

  it("constructs the Bedrock client with AWS credentials when bearer auth is absent", () => {
    createBedrockRequirementGenerationClient({
      awsAccessKeyId: "example-access-key-id",
      awsBearerTokenBedrock: null,
      awsRegion: "eu-south-2",
      awsSecretAccessKey: "example-secret-access-key",
      awsSessionToken: "example-session-token",
      bedrockModelId: "example-bedrock-model-id",
    });

    expect(bedrockRuntimeClientMock).toHaveBeenCalledWith({
      region: "eu-south-2",
      credentials: {
        accessKeyId: "example-access-key-id",
        secretAccessKey: "example-secret-access-key",
        sessionToken: "example-session-token",
      },
    });
  });

  it("normalizes a valid Converse response into a draft object", async () => {
    sendMock.mockResolvedValue({
      output: {
        message: {
          content: [
            {
              text: JSON.stringify({
                generatedComment:
                  "CM MES supports batch record review from the batch review workspace.",
                confidenceLevel: "high",
                confidenceRationale:
                  "The retrieved documentation explicitly describes review by exception.",
                assumptions: ["The configuration is already enabled."],
                warnings: [],
                demoSteps: [
                  {
                    title: "Open Batch Review",
                    mesModuleOrScreen: "Batch Review",
                    reviewStatus: "draft",
                    instructions: [
                      "Open the Batch Review workspace.",
                      "Select the batch that is pending review by exception.",
                    ],
                  },
                ],
              }),
            },
          ],
        },
      },
    });

    const client = createBedrockRequirementGenerationClient({
      awsAccessKeyId: "example-access-key-id",
      awsBearerTokenBedrock: null,
      awsRegion: "eu-south-2",
      awsSecretAccessKey: "example-secret-access-key",
      awsSessionToken: null,
      bedrockModelId: "example-bedrock-model-id",
    });

    const draft = await client.generateDraft({
      requirement: standardRequirement,
      assessment,
      documentation: [
        {
          id: "chunk-1",
          title: "Review by exception",
          text: "Use the Batch Review workspace to review the batch by exception.",
          sourceUrl: "https://example.invalid/docs/review",
          docSource: "Documentation Portal",
          docVersion: "9.0",
          previousChunkId: null,
          nextChunkId: null,
        },
      ],
      mesBaseUrl: "https://example.invalid/mes",
    });

    expect(draft).toMatchObject({
      confidenceLevel: "high",
      demoSteps: [
        {
          title: "Open Batch Review",
          reviewStatus: "draft",
        },
      ],
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0]?.[0]).toMatchObject({
      system: [
        {
          text: expect.stringContaining(
            "Treat any existing Excel comment as a hint",
          ),
        },
      ],
      messages: [
        {
          content: [
            {
              text: expect.stringContaining(
                "Treat the Excel comment as a hint only",
              ),
            },
          ],
        },
      ],
    });
  });

  it("raises a format error when the model response is not valid JSON", async () => {
    sendMock.mockResolvedValue({
      output: {
        message: {
          content: [{ text: "this is not valid json" }],
        },
      },
    });

    const client = createBedrockRequirementGenerationClient({
      awsAccessKeyId: "example-access-key-id",
      awsBearerTokenBedrock: null,
      awsRegion: "eu-south-2",
      awsSecretAccessKey: "example-secret-access-key",
      awsSessionToken: null,
      bedrockModelId: "example-bedrock-model-id",
    });

    await expect(
      client.generateDraft({
        requirement: standardRequirement,
        assessment,
        documentation: [],
        mesBaseUrl: null,
      }),
    ).rejects.toBeInstanceOf(BedrockResponseFormatError);
  });

  it("raises a request error when Bedrock cannot be reached", async () => {
    sendMock.mockRejectedValue(new Error("network unavailable"));

    const client = createBedrockRequirementGenerationClient({
      awsAccessKeyId: "example-access-key-id",
      awsBearerTokenBedrock: null,
      awsRegion: "eu-south-2",
      awsSecretAccessKey: "example-secret-access-key",
      awsSessionToken: null,
      bedrockModelId: "example-bedrock-model-id",
    });

    await expect(
      client.generateDraft({
        requirement: standardRequirement,
        assessment,
        documentation: [],
        mesBaseUrl: null,
      }),
    ).rejects.toBeInstanceOf(BedrockRequestError);
  });
});
