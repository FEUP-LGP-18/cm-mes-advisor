import { describe, expect, it } from "vitest";
import {
  BedrockRequestError,
  BedrockResponseFormatError,
} from "./bedrock-client";
import {
  generateRealRequirementDrafts,
  RequirementGenerationInfrastructureError,
} from "./real-generation";

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

const partialRequirement = {
  ...standardRequirement,
  sourceRowNumber: 4,
  requirementId: "01.02",
  requirementDescription: "Support specialized approval routing",
  availability: "Partially available",
  availabilityCm: "Custom workflow required",
  descriptionAvailability: "Use a workaround and validate with consulting.",
  supportedPercent: "60%",
} as const;

const config = {
  mode: "real" as const,
  mcpServerUrl: "https://example.invalid/mcp",
  mesBaseUrl: "https://example.invalid/mes",
  bedrockModelId: "example-bedrock-model-id",
  awsRegion: "eu-south-2",
  awsAccessKeyId: "example-access-key-id",
  awsSecretAccessKey: "example-secret-access-key",
  awsSessionToken: null,
  awsBearerTokenBedrock: null,
  mcpUserAccount: null,
};

describe("real requirement generation orchestration", () => {
  it("returns grounded drafts for multiple rows when the real dependencies succeed", async () => {
    const drafts = await generateRealRequirementDrafts(
      [standardRequirement, partialRequirement],
      config,
      {
        async createDocumentationClient() {
          return {
            async lookupRequirementDocumentation(requirement) {
              return {
                primaryChunks: [],
                adjacentChunks: [],
                allChunks: [
                  {
                    id: `chunk-${requirement.sourceRowNumber}`,
                    title: "Batch review workspace",
                    text: "Open the Batch Review workspace and review by exception.",
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
            async generateDraft({ requirement }) {
              return {
                generatedComment: `Generated comment for ${requirement.requirementId}.`,
                confidenceLevel:
                  requirement.requirementId === "01.02" ? "medium" : "high",
                confidenceRationale: "Grounded by the supplied documentation.",
                assumptions: ["The demo tenant contains the needed data."],
                warnings: [],
                demoSteps: [
                  {
                    title: `Open screen for ${requirement.requirementId}`,
                    mesModuleOrScreen: "Batch Review",
                    reviewStatus:
                      requirement.requirementId === "01.02"
                        ? ("consultant-review" as const)
                        : ("draft" as const),
                    instructions: [
                      "Open the target workspace.",
                      "Demonstrate the supported behavior.",
                    ],
                  },
                ],
              };
            },
          };
        },
        now: () => new Date("2026-04-20T10:00:00.000Z"),
      },
    );

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      generator: "bedrock-mcp",
      sourceReferences: [{ kind: "mcp-documentation" }],
    });
    expect(drafts[1]?.warnings.join(" ")).toContain("Consultant review");
  });

  it("degrades one row safely when the model response is malformed", async () => {
    const drafts = await generateRealRequirementDrafts(
      [standardRequirement, partialRequirement],
      config,
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
                    title: "Grounding",
                    text: "Grounded review instructions.",
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
            async generateDraft({ requirement }) {
              if (requirement.requirementId === "01.02") {
                throw new BedrockResponseFormatError("bad JSON");
              }

              return {
                generatedComment: "Grounded batch review comment.",
                confidenceLevel: "high" as const,
                confidenceRationale: "Strong grounding.",
                assumptions: [],
                warnings: [],
                demoSteps: [
                  {
                    title: "Open Batch Review",
                    mesModuleOrScreen: "Batch Review",
                    reviewStatus: "draft" as const,
                    instructions: [
                      "Open Batch Review.",
                      "Show the configured result.",
                    ],
                  },
                ],
              };
            },
          };
        },
      },
    );

    expect(drafts).toHaveLength(2);
    expect(drafts[1]?.confidence.level).toBe("low");
    expect(drafts[1]?.warnings.join(" ")).toContain("expected draft format");
  });

  it("fails the whole run when Bedrock infrastructure is unavailable", async () => {
    await expect(
      generateRealRequirementDrafts([standardRequirement], config, {
        async createDocumentationClient() {
          return {
            async lookupRequirementDocumentation() {
              return {
                primaryChunks: [],
                adjacentChunks: [],
                allChunks: [
                  {
                    id: "chunk-1",
                    title: "Grounding",
                    text: "Grounded review instructions.",
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
              throw new BedrockRequestError("network unavailable");
            },
          };
        },
      }),
    ).rejects.toBeInstanceOf(RequirementGenerationInfrastructureError);
  });
});
