import { describe, expect, it } from "vitest";
import {
  assessRequirementSupport,
  createMockGeneratedRequirementDraft,
  isGeneratedRequirementDraft,
  mockGenerationStageLabels,
  type ParsedRequirement,
} from ".";

const standardRequirement: ParsedRequirement = {
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
};

const partialRequirement: ParsedRequirement = {
  ...standardRequirement,
  sourceRowNumber: 4,
  requirementId: "01.02",
  requirementDescription: "Support specialized customer approval workflow",
  availability: "Partially available",
  availabilityCm: "Custom workflow required",
  descriptionAvailability: "Can be supported with a workaround.",
  supportedPercent: "60%",
};

describe("mock requirement generation", () => {
  it("defines the deck-aligned mock generation stages", () => {
    expect(mockGenerationStageLabels).toEqual([
      "Excel parsing",
      "MES knowledge lookup",
      "Comment generation",
      "Demo script generation",
    ]);
  });

  it("creates a deterministic structured generation contract", () => {
    const firstDraft = createMockGeneratedRequirementDraft(standardRequirement);
    const secondDraft =
      createMockGeneratedRequirementDraft(standardRequirement);

    expect(firstDraft).toEqual(secondDraft);
    expect(isGeneratedRequirementDraft(firstDraft)).toBe(true);
    expect(firstDraft).toMatchObject({
      schemaVersion: 1,
      generator: "mock-ai",
      generatedAt: "deterministic-mock",
      requirement: {
        requirementKey: "3:01.01",
        requirementId: "01.01",
        sourceRowNumber: 3,
      },
      confidence: {
        level: "high",
        score: 0.9,
      },
    });
    expect(firstDraft.generatedComment).toContain(
      "through standard configuration",
    );
    expect(firstDraft.demoSteps[0]).toMatchObject({
      relatedRequirementIds: ["01.01"],
      reviewStatus: "draft",
    });
    expect(
      firstDraft.sourceReferences.map((reference) => reference.kind),
    ).toEqual(["mock-ai", "mcp-placeholder"]);
    expect(firstDraft.sourceReferences[1]?.note).toContain(
      "not a real citation",
    );
  });

  it("uses different confidence and warnings for standard and partial/custom rows", () => {
    const standardAssessment = assessRequirementSupport(standardRequirement);
    const partialAssessment = assessRequirementSupport(partialRequirement);

    expect(standardAssessment.supportType).toBe("standard");
    expect(standardAssessment.confidence.level).toBe("high");
    expect(standardAssessment.warnings).toHaveLength(0);

    expect(partialAssessment.supportType).toBe("partial-or-custom");
    expect(partialAssessment.confidence.level).toBe("medium");
    expect(partialAssessment.confidence.score).toBeLessThan(
      standardAssessment.confidence.score,
    );
    expect(partialAssessment.warnings.join(" ")).toContain(
      "Consultant review recommended",
    );

    const partialDraft =
      createMockGeneratedRequirementDraft(partialRequirement);

    expect(partialDraft.generatedComment).toContain("workaround");
    expect(partialDraft.demoSteps[1]?.reviewStatus).toBe("consultant-review");
  });
});
