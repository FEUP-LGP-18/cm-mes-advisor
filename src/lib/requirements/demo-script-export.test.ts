import { describe, expect, it } from "vitest";
import {
  buildReviewRequirements,
  createMockGeneratedRequirementDraft,
  createRequirementsReviewState,
  updateDemoScriptDraft,
  updateRequirementsReviewState,
  type ParsedRequirement,
  type ReviewProjectMetadata,
} from ".";
import {
  createDemoScriptExportFilename,
  serializeDemoScriptToMarkdown,
} from "./demo-script-export";
import {
  assembleDemoScript,
  createDefaultDemoScriptDraft,
} from "./demo-script";
import type { DemoScriptAssembly } from "./demo-script";

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

describe("demo script markdown export", () => {
  it("serializes the assembled script in order with traceability and content", () => {
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
    const firstStepKey = initialAssembly.sections[0]?.steps[0]?.key;
    const reversedDraft = updateDemoScriptDraft(defaultDraft, {
      type: "setSectionOrder",
      sectionOrder: [...initialAssembly.sections]
        .reverse()
        .map((section) => section.key),
    });
    const editedDraft =
      firstStepKey === undefined
        ? reversedDraft
        : updateDemoScriptDraft(reversedDraft, {
            type: "editStep",
            stepKey: firstStepKey,
            title: "Consultant-edited opening step",
            note: "Use the local prototype note for the demo.",
          });
    const assembly = assembleDemoScript(reviewRequirements, editedDraft);
    const assemblyWithWarnings: DemoScriptAssembly = {
      ...assembly,
      sections: assembly.sections.map((section) => ({
        ...section,
        steps: section.steps.map((step) =>
          step.key === firstStepKey
            ? {
                ...step,
                warnings: [
                  "Confirm the configured sequence matches the shop floor demo environment.",
                ],
              }
            : step,
        ),
      })),
    };
    const markdown = serializeDemoScriptToMarkdown({
      assembly: assemblyWithWarnings,
      exportTimestamp: "2026-04-15T12:34:56.000Z",
      projectMetadata,
    });
    const firstSection = assemblyWithWarnings.sections[0];
    const secondSection = assemblyWithWarnings.sections[1];
    const firstStep = firstSection?.steps[0];

    expect(markdown).toContain("# Customer X Demo Script");
    expect(markdown).toContain("Project: Customer X Demo");
    expect(markdown).toContain("Customer: Customer X");
    expect(markdown).toContain(
      "Source file: fixtures/customer-x-functional-requirements.xlsx",
    );
    expect(markdown).toContain("Export timestamp: 2026-04-15T12:34:56.000Z");
    expect(markdown).toContain(
      "Phase 1 scope note: this demo script was generated from Excel requirements and consultant review.",
    );
    expect(markdown).toContain("Generated drafts: 2");
    expect(markdown).toContain("Approved requirements: 2");
    expect(markdown).toContain("Demo steps: 4");
    expect(markdown).toContain("Sections: 2");
    expect(firstSection).toBeTruthy();
    expect(secondSection).toBeTruthy();
    expect(firstSection && secondSection).toBeTruthy();
    expect(markdown.indexOf(`## ${firstSection?.title}`)).toBeLessThan(
      markdown.indexOf(`## ${secondSection?.title}`),
    );
    expect(markdown).toContain("### Consultant-edited opening step");
    expect(markdown).toContain(
      "Local note: Use the local prototype note for the demo.",
    );
    expect(markdown).toContain(
      `Requirement ID: ${firstStep?.traceability.requirementId}`,
    );
    expect(markdown).toContain(
      `Excel row: ${firstStep?.traceability.sourceRowNumber}`,
    );
    expect(markdown).toContain("Current consultant comment:");
    expect(markdown).toContain("Generated source comment:");
    expect(markdown).toContain("Confidence: ");
    expect(markdown).toContain("Confidence rationale:");
    expect(markdown).toContain("Demo instructions");
    expect(markdown).toContain("Assumptions");
    expect(markdown).toContain("Warnings");
    expect(markdown).toContain("Source references");
    expect(markdown).toContain(
      "Phase 2 Master Data remains an optional pilot demo continuation after this export. The generated package is not MES-validated until a partner manually imports and accepts it.",
    );
  });

  it("omits empty optional sections from the markdown output", () => {
    const assembly: DemoScriptAssembly = {
      title: "Empty Details Demo Script",
      emptyState: null,
      approvedRequirementCount: 1,
      approvedStepCount: 1,
      generatedRequirementCount: 1,
      sections: [
        {
          key: "l2:manufacturing-execution",
          title: "Manufacturing Execution",
          sourceLabel: "L2 process",
          subtitle: "1 approved requirement · 1 step",
          stepCount: 1,
          requirementCount: 1,
          steps: [
            {
              key: "3:01.01:step-1",
              sectionKey: "l2:manufacturing-execution",
              title: "Open the batch review screen",
              sourceTitle: "Open the batch review screen",
              note: "",
              groupLabel: "L3: Batch review",
              generatedComment: "Generated source comment.",
              currentComment: "Consultant comment.",
              instructions: ["Open the batch review screen"],
              confidence: {
                level: "high",
                score: 0.98,
                rationale: "The mock draft is fully supported.",
              },
              assumptions: [],
              warnings: [
                "Confirm the configured sequence matches the shop floor demo environment.",
              ],
              sourceReferences: [],
              sourceDemoStep: {
                id: "step-1",
                title: "Open the batch review screen",
                mesModuleOrScreen: "Batch review screen",
                reviewStatus: "draft",
                relatedRequirementIds: ["01.01"],
                instructions: ["Open the batch review screen"],
                sourceReferences: [],
              },
              traceability: {
                requirementKey: "3:01.01",
                requirementId: "01.01",
                sourceRowNumber: 3,
                sourceDemoStepId: "step-1",
              },
            },
          ],
        },
      ],
    };

    const markdown = serializeDemoScriptToMarkdown({
      assembly,
      exportTimestamp: "2026-04-15T12:34:56.000Z",
      projectMetadata,
    });

    expect(markdown).toContain(
      "Current consultant comment: Consultant comment.",
    );
    expect(markdown).toContain(
      "Generated source comment: Generated source comment.",
    );
    expect(markdown).toContain("Confidence: High (0.98)");
    expect(markdown).not.toContain("Local note:");
    expect(markdown).not.toContain("Assumptions");
    expect(markdown).toContain("Warnings");
    expect(markdown).not.toContain("Source references");
  });

  it("includes optional general output metadata when a caller provides it", () => {
    const assembly: DemoScriptAssembly = {
      title: "Output Metadata Demo Script",
      emptyState: null,
      approvedRequirementCount: 0,
      approvedStepCount: 0,
      generatedRequirementCount: 0,
      sections: [],
    };

    const markdown = serializeDemoScriptToMarkdown({
      assembly,
      exportTimestamp: "2026-04-15T12:34:56.000Z",
      outputPreferences: {
        consultantName: "Mahmoud Ali",
        mesVersion: "cm-v10",
        outputLanguage: "pt",
        outputLanguageStatus: "saved-for-future-outputs",
      },
      projectMetadata,
    });

    expect(markdown).toContain("Consultant: Mahmoud Ali");
    expect(markdown).toContain("MES version: CM V10");
    expect(markdown).toContain(
      "Output language preference: Portuguese (saved for future outputs; existing generated content is not translated)",
    );
  });

  it("creates a safe filename from the script title or project name", () => {
    expect(
      createDemoScriptExportFilename(
        "Customer X Demo Script",
        "Customer X Demo",
      ),
    ).toBe("customer-x-demo-script.md");
    expect(createDemoScriptExportFilename("", "")).toBe("demo-script.md");
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
