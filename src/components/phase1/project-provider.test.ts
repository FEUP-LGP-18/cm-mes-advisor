import { describe, expect, it } from "vitest";
import { createMockGeneratedRequirementDraft } from "@/lib/requirements/generation";
import type { ReviewRequirement } from "@/lib/requirements/review";
import { inferMasterDataDefaultGenerationMode } from "./project-provider";

const parsedRequirement = {
  availability: "Available",
  availabilityCm: "Standard",
  demo: true,
  demoRaw: "x",
  descriptionAvailability: "Supported by configuration.",
  detailDescriptionAndMotivation:
    "Consultants need traceable source data for demo planning.",
  l2Process: "Manufacturing Execution",
  l3Process: "Product Setup",
  mvp: true,
  mvpRaw: "x",
  operation: "Create product",
  prioCws: "1",
  prioEms: "1",
  requirementDescription: "Create product master data.",
  requirementId: "03.01",
  sourceComment: "Existing workbook note.",
  sourceRowNumber: 12,
  supportedPercent: "100%",
};

function createReviewRequirement({
  generator,
  reviewStatus,
}: {
  generator: "mock-ai" | "bedrock-mcp" | "anthropic-mcp";
  reviewStatus: "pending" | "approved";
}): Pick<ReviewRequirement, "generatedOutput" | "reviewStatus"> {
  const draft = {
    ...createMockGeneratedRequirementDraft(parsedRequirement),
    generator,
  };

  return {
    reviewStatus,
    generatedOutput: {
      state: "mock-generated-draft",
      hasGeneratedOutput: true,
      generatedCommentDraft: draft.generatedComment,
      demoStepsDraft: draft.demoSteps.flatMap((step) => step.instructions),
      draft,
    },
  };
}

describe("inferMasterDataDefaultGenerationMode", () => {
  it("keeps Phase 2 in mock mode when no approved real Phase 1 draft exists", () => {
    expect(
      inferMasterDataDefaultGenerationMode([
        createReviewRequirement({
          generator: "mock-ai",
          reviewStatus: "approved",
        }),
        createReviewRequirement({
          generator: "anthropic-mcp",
          reviewStatus: "pending",
        }),
      ]),
    ).toBe("mock");
  });

  it("inherits real mode from approved Anthropic Phase 1 draft metadata", () => {
    expect(
      inferMasterDataDefaultGenerationMode([
        createReviewRequirement({
          generator: "anthropic-mcp",
          reviewStatus: "approved",
        }),
      ]),
    ).toBe("real");
  });
});
