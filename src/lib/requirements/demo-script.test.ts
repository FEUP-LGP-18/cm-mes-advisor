import { describe, expect, it } from "vitest";
import {
  buildReviewRequirements,
  createMockGeneratedRequirementDraft,
  createRequirementsReviewState,
  updateDemoScriptDraft,
  updateRequirementsReviewState,
  type GeneratedRequirementDraft,
  type ParsedRequirement,
  type ReviewProjectMetadata,
} from ".";
import {
  assembleDemoScript,
  createDefaultDemoScriptDraft,
} from "./demo-script";

const projectMetadata: ReviewProjectMetadata = {
  projectId: "customer-x-fixture",
  projectName: "Customer X Demo",
  customerName: "Customer X",
  sourceFilename: "fixtures/customer-x-functional-requirements.xlsx",
  sourceRowCount: 167,
};

const baseRequirement: ParsedRequirement = {
  sourceRowNumber: 3,
  requirementId: "01.01",
  requirementDescription: "Batch review support",
  l2Process: "Manufacturing Execution",
  l3Process: "Batch review",
  operation: "Release batch",
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

const alternateRequirement: ParsedRequirement = {
  ...baseRequirement,
  sourceRowNumber: 4,
  requirementId: "01.02",
  requirementDescription: "Resource scheduling support",
  l2Process: "Planning",
  l3Process: "Resource assignment",
  operation: "Assign resource",
};

const noStepRequirement: ParsedRequirement = {
  ...baseRequirement,
  sourceRowNumber: 5,
  requirementId: "01.03",
  requirementDescription: "Quality review support",
  l2Process: "Quality",
  l3Process: "Inspection",
  operation: "Record result",
};

describe("demo script assembly", () => {
  it("groups approved drafts by process bucket and preserves traceability", () => {
    const reviewRequirements = buildApprovedReviewRequirements([
      baseRequirement,
      alternateRequirement,
    ]);
    const defaultDraft = createDefaultDemoScriptDraft(
      projectMetadata.projectName,
    );
    const assembly = assembleDemoScript(reviewRequirements, defaultDraft);

    expect(assembly.title).toBe("Customer X Demo Script");
    expect(assembly.emptyState).toBeNull();
    expect(assembly.sections).toHaveLength(2);
    expect(assembly.sections[0]).toMatchObject({
      key: "l2:manufacturing-execution",
      title: "Manufacturing Execution",
      sourceLabel: "L2 process",
      subtitle: "1 approved requirement · 2 steps",
    });

    const firstStep = assembly.sections[0]?.steps[0];
    expect(firstStep).toMatchObject({
      traceability: {
        requirementKey: "3:01.01",
        requirementId: "01.01",
        sourceRowNumber: 3,
      },
      generatedComment: firstStep?.currentComment,
    });
    expect(firstStep?.groupLabel).toContain("L3: Batch review");
    expect(
      firstStep?.sourceReferences.map((reference) => reference.kind),
    ).toEqual(["mock-ai", "mcp-placeholder"]);
  });

  it("preserves section ordering and step edits from the persisted draft", () => {
    const reviewRequirements = buildApprovedReviewRequirements([
      baseRequirement,
      alternateRequirement,
    ]);
    const defaultDraft = createDefaultDemoScriptDraft(
      projectMetadata.projectName,
    );
    const initialAssembly = assembleDemoScript(
      reviewRequirements,
      defaultDraft,
    );
    const reversedDraft = updateDemoScriptDraft(defaultDraft, {
      type: "setSectionOrder",
      sectionOrder: [...initialAssembly.sections]
        .reverse()
        .map((section) => section.key),
    });
    const firstSectionKey = initialAssembly.sections[0]?.key;
    const firstStepKey = initialAssembly.sections[0]?.steps[0]?.key;

    expect(firstSectionKey).toBeTruthy();
    expect(firstStepKey).toBeTruthy();

    const editedDraft = updateDemoScriptDraft(reversedDraft, {
      type: "editStep",
      stepKey: firstStepKey as string,
      title: "Custom opening step",
      note: "Use the consultant-approved wording.",
    });
    const editedAssembly = assembleDemoScript(reviewRequirements, editedDraft);

    expect(editedAssembly.sections.map((section) => section.key)).toEqual(
      [...initialAssembly.sections].reverse().map((section) => section.key),
    );
    expect(editedAssembly.sections[1]?.steps[0]).toMatchObject({
      title: "Custom opening step",
      note: "Use the consultant-approved wording.",
    });
  });

  it("returns a no-generated-drafts empty state when no drafts exist", () => {
    const reviewRequirements = buildReviewRequirements([baseRequirement]);
    const assembly = assembleDemoScript(
      reviewRequirements,
      createDefaultDemoScriptDraft(projectMetadata.projectName),
    );

    expect(assembly.emptyState).toBe("no-generated-drafts");
    expect(assembly.sections).toHaveLength(0);
  });

  it("returns a no-approved-drafts empty state when generated drafts are still pending", () => {
    const reviewRequirements = buildRequirementsWithGeneratedDrafts([
      baseRequirement,
    ]);

    const assembly = assembleDemoScript(
      reviewRequirements,
      createDefaultDemoScriptDraft(projectMetadata.projectName),
    );

    expect(assembly.emptyState).toBe("no-approved-drafts");
    expect(assembly.sections).toHaveLength(0);
  });

  it("returns a no-demo-steps empty state when approved drafts have no steps", () => {
    const requirement = noStepRequirement;
    const generatedDraft = createEmptyGeneratedDraft(requirement);
    const reviewRequirements = buildReviewRequirements([requirement], {
      [requirementKey(requirement)]: {
        requirementKey: requirementKey(requirement),
        reviewStatus: "approved",
        consultantComment: generatedDraft.generatedComment,
        reviewNote: "",
        generatedOutput: {
          state: "mock-generated-draft",
          hasGeneratedOutput: true,
          generatedCommentDraft: generatedDraft.generatedComment,
          demoStepsDraft: [],
          draft: generatedDraft,
        },
      },
    });

    const assembly = assembleDemoScript(
      reviewRequirements,
      createDefaultDemoScriptDraft(projectMetadata.projectName),
    );

    expect(assembly.emptyState).toBe("no-demo-steps");
    expect(assembly.sections).toHaveLength(0);
  });
});

function buildApprovedReviewRequirements(requirements: ParsedRequirement[]) {
  const state = requirements.reduce((currentState, requirement) => {
    const draft = createMockGeneratedRequirementDraft(requirement);
    const generatedState = updateRequirementsReviewState(
      currentState,
      requirement,
      {
        type: "storeMockGeneratedDraft",
        generatedOutput: draft,
      },
    );

    return updateRequirementsReviewState(generatedState, requirement, {
      type: "approve",
    });
  }, createRequirementsReviewState(projectMetadata));

  return buildReviewRequirements(requirements, state.requirements);
}

function buildRequirementsWithGeneratedDrafts(
  requirements: ParsedRequirement[],
) {
  const state = requirements.reduce((currentState, requirement) => {
    const draft = createMockGeneratedRequirementDraft(requirement);
    return updateRequirementsReviewState(currentState, requirement, {
      type: "storeMockGeneratedDraft",
      generatedOutput: draft,
    });
  }, createRequirementsReviewState(projectMetadata));

  return buildReviewRequirements(requirements, state.requirements);
}

function createEmptyGeneratedDraft(
  requirement: ParsedRequirement,
): GeneratedRequirementDraft {
  return {
    schemaVersion: 1,
    generator: "mock-ai",
    generatedAt: "deterministic-mock",
    requirement: {
      requirementKey: `${requirement.sourceRowNumber}:${
        requirement.requirementId.trim() || "no-id"
      }`,
      requirementId: requirement.requirementId.trim(),
      sourceRowNumber: requirement.sourceRowNumber,
    },
    generatedComment: "Consultant review required before assembly.",
    demoSteps: [],
    confidence: {
      level: "low",
      score: 0.1,
      rationale: "No demo steps were produced for this draft.",
    },
    assumptions: [
      "Consultant review is required before the script can be built.",
    ],
    warnings: ["No demo steps were generated."],
    sourceReferences: [],
  };
}

function requirementKey(requirement: ParsedRequirement): string {
  return `${requirement.sourceRowNumber}:${
    requirement.requirementId.trim() || "no-id"
  }`;
}
