import {
  assembleDemoScript,
  createDefaultDemoScriptDraft,
} from "../requirements/demo-script";
import type { RequirementGenerationAvailabilityBody } from "../requirements/generation-api";
import { createMockGeneratedRequirementDraft } from "../requirements/generation";
import {
  buildReviewRequirements,
  createRequirementsReviewState,
  filterReviewRequirements,
  updateRequirementsReviewState,
  type ReviewProjectMetadata,
  type ReviewRequirement,
} from "../requirements/review";
import { createFixtureSourceMetadata } from "../requirements/source";
import type { ParsedRequirement } from "../requirements/types";
import { createRequirementsWorkspaceState } from "../requirements/workspace-state";
import {
  createPhase1ProjectRecordFromWorkspaceState,
  createPhase1ProjectRegistry,
  type Phase1ProjectRecord,
  type Phase1ProjectRegistry,
} from "./project-registry";
import type { Phase1WorkflowStep } from "./workflow";

export const phase1UiFixtureProjectMetadata: ReviewProjectMetadata = {
  projectId: "customer-x-fixture",
  projectName: "Customer X Demo",
  customerName: "Customer X",
  sourceFilename: "fixtures/customer-x-functional-requirements.xlsx",
  sourceRowCount: 2,
};

export const phase1UiFixtureParsedRequirements: ParsedRequirement[] = [
  {
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
  },
  {
    sourceRowNumber: 4,
    requirementId: "01.02",
    requirementDescription: "Resource scheduling support",
    l2Process: "Planning",
    l3Process: "Resource assignment",
    operation: "Assign resource",
    demo: false,
    demoRaw: "",
    detailDescriptionAndMotivation: "The queue needs a second realistic row.",
    prioEms: "1",
    prioCws: "2",
    mvp: false,
    mvpRaw: "",
    availability: "Available",
    availabilityCm: "Standard configuration",
    descriptionAvailability: "Supported by configuration.",
    supportedPercent: "100%",
    sourceComment: "Check planning coverage in the review queue.",
  },
];

export const phase1UiFixtureBlockedRealAvailability: RequirementGenerationAvailabilityBody =
  {
    ok: true,
    checkedAt: "2026-04-21T10:00:00.000Z",
    modes: {
      mock: {
        available: true,
        message: "Prototype drafts are available locally.",
        mode: "mock",
        status: "available",
      },
      real: {
        available: false,
        message: "Grounded real generation is not configured yet.",
        missingConfig: ["AWS_BEARER_TOKEN_BEDROCK"],
        mode: "real",
        status: "missing-config",
      },
    },
  };

export function createPhase1UiFixtureSource() {
  return createFixtureSourceMetadata(phase1UiFixtureProjectMetadata);
}

export function createPhase1UiFixtureWorkspaceState(
  statusesByRequirementId: Partial<
    Record<string, ReviewRequirement["reviewStatus"]>
  > = {},
) {
  const source = createPhase1UiFixtureSource();
  const reviewState = phase1UiFixtureParsedRequirements.reduce(
    (state, requirement) => {
      const nextState = updateRequirementsReviewState(state, requirement, {
        type: "storeMockGeneratedDraft",
        generatedOutput: createMockGeneratedRequirementDraft(requirement),
      });
      const nextStatus = statusesByRequirementId[requirement.requirementId];

      if (!nextStatus || nextStatus === "pending") {
        return nextState;
      }

      if (nextStatus === "approved") {
        return updateRequirementsReviewState(nextState, requirement, {
          type: "approve",
        });
      }

      if (nextStatus === "review") {
        return updateRequirementsReviewState(nextState, requirement, {
          type: "flag",
        });
      }

      if (nextStatus === "skipped") {
        return updateRequirementsReviewState(nextState, requirement, {
          type: "skip",
        });
      }

      return nextState;
    },
    createRequirementsReviewState(phase1UiFixtureProjectMetadata),
  );

  return createRequirementsWorkspaceState(
    source,
    phase1UiFixtureParsedRequirements,
    reviewState,
  );
}

export function createPhase1UiFixtureReviewRequirements(
  statusesByRequirementId: Partial<
    Record<string, ReviewRequirement["reviewStatus"]>
  > = {},
) {
  const workspaceState =
    createPhase1UiFixtureWorkspaceState(statusesByRequirementId);

  return buildReviewRequirements(
    workspaceState.parsedRequirements,
    workspaceState.reviewState.requirements,
  );
}

export function createPhase1UiFixtureReviewQueue(
  statusesByRequirementId: Partial<
    Record<string, ReviewRequirement["reviewStatus"]>
  > = {},
) {
  return createPhase1UiFixtureReviewRequirements(statusesByRequirementId).filter(
    (requirement) =>
      requirement.generatedOutput.state === "mock-generated-draft" &&
      requirement.reviewStatus === "pending",
  );
}

export function createPhase1UiFixtureProjectRecord({
  currentStep = "review",
  statusesByRequirementId = {},
}: {
  currentStep?: Phase1WorkflowStep;
  statusesByRequirementId?: Partial<
    Record<string, ReviewRequirement["reviewStatus"]>
  >;
} = {}): Phase1ProjectRecord {
  const workspaceState =
    createPhase1UiFixtureWorkspaceState(statusesByRequirementId);

  return createPhase1ProjectRecordFromWorkspaceState(workspaceState, {
    currentStep,
  });
}

export function createPhase1UiFixtureRegistry({
  currentStep = "review",
  statusesByRequirementId = {},
}: {
  currentStep?: Phase1WorkflowStep;
  statusesByRequirementId?: Partial<
    Record<string, ReviewRequirement["reviewStatus"]>
  >;
} = {}): Phase1ProjectRegistry {
  const project = createPhase1UiFixtureProjectRecord({
    currentStep,
    statusesByRequirementId,
  });

  return createPhase1ProjectRegistry([project], project.projectId);
}

export function createPhase1UiFixtureDemoRequirements(
  statusesByRequirementId: Partial<
    Record<string, ReviewRequirement["reviewStatus"]>
  > = {},
) {
  return filterReviewRequirements(
    createPhase1UiFixtureReviewRequirements(statusesByRequirementId),
    "demo",
  );
}

export function createPhase1UiFixtureScriptAssembly(
  statusesByRequirementId: Partial<
    Record<string, ReviewRequirement["reviewStatus"]>
  > = {},
) {
  const reviewRequirements =
    createPhase1UiFixtureReviewRequirements(statusesByRequirementId);
  const draft = createDefaultDemoScriptDraft(
    phase1UiFixtureProjectMetadata.projectName,
  );

  return {
    assembly: assembleDemoScript(reviewRequirements, draft),
    draft,
    reviewRequirements,
  };
}
