import type { ParsedRequirement } from "./types";
import {
  isGeneratedRequirementDraft,
  type GeneratedRequirementDraft,
} from "./generation";
import {
  createDefaultDemoScriptDraft,
  type DemoScriptDraft,
  type DemoScriptDraftAction,
  updateDemoScriptDraft,
} from "./demo-script";

export type RequirementReviewStatus =
  | "pending"
  | "review"
  | "approved"
  | "skipped";

export type RequirementReviewFilter =
  | "all"
  | "demo"
  | "mvp"
  | "pending"
  | "review"
  | "approved"
  | "skipped";

export type RequirementReviewAction =
  | { type: "approve" }
  | { type: "flag" }
  | { type: "skip" }
  | { type: "resetToDraft" }
  | {
      type: "storeMockGeneratedDraft";
      generatedOutput: GeneratedRequirementDraft;
    }
  | { type: "edit"; consultantComment?: string; reviewNote?: string };

export interface NotGeneratedOutput {
  state: "not-generated";
  hasGeneratedOutput: false;
  generatedCommentDraft: null;
  demoStepsDraft: string[];
}

export interface MockGeneratedDraftOutput {
  state: "mock-generated-draft";
  hasGeneratedOutput: true;
  generatedCommentDraft: string;
  demoStepsDraft: string[];
  draft: GeneratedRequirementDraft;
}

export type RequirementGeneratedOutput =
  | NotGeneratedOutput
  | MockGeneratedDraftOutput;

export interface RequirementReviewEntry {
  requirementKey: string;
  reviewStatus: RequirementReviewStatus;
  consultantComment: string;
  reviewNote: string;
  generatedOutput: RequirementGeneratedOutput;
}

export type RequirementReviewStateByKey = Record<
  string,
  RequirementReviewEntry
>;

export interface ReviewRequirement
  extends ParsedRequirement, RequirementReviewEntry {}

export interface RequirementsReviewSummary {
  allCount: number;
  demoCount: number;
  mvpCount: number;
  pendingCount: number;
  reviewCount: number;
  approvedCount: number;
  skippedCount: number;
}

export interface ReviewProjectMetadata {
  projectId: string;
  projectName: string;
  customerName: string;
  sourceFilename: string;
  sourceRowCount: number;
}

export interface RequirementsReviewState {
  version: 2;
  project: ReviewProjectMetadata;
  requirements: RequirementReviewStateByKey;
  demoScriptDraft: DemoScriptDraft;
}

export const requirementReviewFilters: RequirementReviewFilter[] = [
  "all",
  "demo",
  "mvp",
  "pending",
  "review",
  "approved",
  "skipped",
];

export const requirementReviewStatuses: RequirementReviewStatus[] = [
  "pending",
  "review",
  "approved",
  "skipped",
];

export function buildReviewRequirements(
  requirements: ParsedRequirement[],
  reviewStateByKey: RequirementReviewStateByKey = {},
): ReviewRequirement[] {
  return requirements.map((requirement) => {
    const entry = normalizeRequirementReviewEntry(
      requirement,
      reviewStateByKey[getRequirementReviewKey(requirement)],
    );

    return {
      ...requirement,
      ...entry,
    };
  });
}

export function filterReviewRequirements(
  requirements: ReviewRequirement[],
  filter: RequirementReviewFilter,
): ReviewRequirement[] {
  switch (filter) {
    case "all":
      return requirements;
    case "demo":
      return requirements.filter((requirement) => requirement.demo);
    case "mvp":
      return requirements.filter((requirement) => requirement.mvp);
    case "pending":
    case "review":
    case "approved":
    case "skipped":
      return requirements.filter(
        (requirement) => requirement.reviewStatus === filter,
      );
  }
}

export function summarizeReviewRequirements(
  requirements: ReviewRequirement[],
): RequirementsReviewSummary {
  return {
    allCount: requirements.length,
    demoCount: filterReviewRequirements(requirements, "demo").length,
    mvpCount: filterReviewRequirements(requirements, "mvp").length,
    pendingCount: filterReviewRequirements(requirements, "pending").length,
    reviewCount: filterReviewRequirements(requirements, "review").length,
    approvedCount: filterReviewRequirements(requirements, "approved").length,
    skippedCount: filterReviewRequirements(requirements, "skipped").length,
  };
}

export function createRequirementsReviewState(
  project: ReviewProjectMetadata,
  requirements: RequirementReviewStateByKey = {},
  demoScriptDraft: DemoScriptDraft = createDefaultDemoScriptDraft(
    project.projectName,
  ),
): RequirementsReviewState {
  return {
    version: 2,
    project,
    requirements,
    demoScriptDraft,
  };
}

export function updateRequirementsDemoScriptDraft(
  state: RequirementsReviewState,
  action: DemoScriptDraftAction,
): RequirementsReviewState {
  return {
    ...state,
    demoScriptDraft: updateDemoScriptDraft(state.demoScriptDraft, action),
  };
}

export function getRequirementReviewKey(
  requirement: Pick<ParsedRequirement, "sourceRowNumber" | "requirementId">,
): string {
  return `${requirement.sourceRowNumber}:${
    requirement.requirementId.trim() || "no-id"
  }`;
}

export function createDefaultRequirementReviewEntry(
  requirement: Pick<ParsedRequirement, "sourceRowNumber" | "requirementId">,
): RequirementReviewEntry {
  return {
    requirementKey: getRequirementReviewKey(requirement),
    reviewStatus: "pending",
    consultantComment: "",
    reviewNote: "",
    generatedOutput: createGeneratedOutputPlaceholder(),
  };
}

export function normalizeRequirementReviewEntry(
  requirement: Pick<ParsedRequirement, "sourceRowNumber" | "requirementId">,
  entry: RequirementReviewEntry | undefined,
): RequirementReviewEntry {
  const defaultEntry = createDefaultRequirementReviewEntry(requirement);

  if (!entry) {
    return defaultEntry;
  }

  return {
    requirementKey: defaultEntry.requirementKey,
    reviewStatus: isRequirementReviewStatus(entry.reviewStatus)
      ? entry.reviewStatus
      : defaultEntry.reviewStatus,
    consultantComment:
      typeof entry.consultantComment === "string"
        ? entry.consultantComment
        : defaultEntry.consultantComment,
    reviewNote:
      typeof entry.reviewNote === "string"
        ? entry.reviewNote
        : defaultEntry.reviewNote,
    generatedOutput: normalizeGeneratedOutput(entry.generatedOutput),
  };
}

export function updateRequirementReviewEntry(
  entry: RequirementReviewEntry,
  action: RequirementReviewAction,
): RequirementReviewEntry {
  switch (action.type) {
    case "approve":
      return { ...entry, reviewStatus: "approved" };
    case "flag":
      return { ...entry, reviewStatus: "review" };
    case "skip":
      return { ...entry, reviewStatus: "skipped" };
    case "resetToDraft":
      return {
        ...entry,
        reviewStatus: "pending",
        consultantComment:
          entry.generatedOutput.state === "mock-generated-draft"
            ? entry.generatedOutput.generatedCommentDraft
            : "",
        reviewNote: "",
      };
    case "storeMockGeneratedDraft":
      return {
        ...entry,
        reviewStatus: "pending",
        consultantComment: action.generatedOutput.generatedComment,
        reviewNote: "",
        generatedOutput: createMockGeneratedDraftOutput(action.generatedOutput),
      };
    case "edit":
      return {
        ...entry,
        consultantComment: action.consultantComment ?? entry.consultantComment,
        reviewNote: action.reviewNote ?? entry.reviewNote,
      };
  }
}

export function updateRequirementsReviewState(
  state: RequirementsReviewState,
  requirement: Pick<ParsedRequirement, "sourceRowNumber" | "requirementId">,
  action: RequirementReviewAction,
): RequirementsReviewState {
  const requirementKey = getRequirementReviewKey(requirement);
  const currentEntry = normalizeRequirementReviewEntry(
    requirement,
    state.requirements[requirementKey],
  );

  return {
    ...state,
    requirements: {
      ...state.requirements,
      [requirementKey]: updateRequirementReviewEntry(currentEntry, action),
    },
  };
}

export function isRequirementReviewStatus(
  value: unknown,
): value is RequirementReviewStatus {
  return (
    typeof value === "string" &&
    requirementReviewStatuses.includes(value as RequirementReviewStatus)
  );
}

export function createGeneratedOutputPlaceholder(): GeneratedOutputPlaceholder {
  return createNotGeneratedOutput();
}

export function createNotGeneratedOutput(): NotGeneratedOutput {
  return {
    state: "not-generated",
    hasGeneratedOutput: false,
    generatedCommentDraft: null,
    demoStepsDraft: [],
  };
}

export function createMockGeneratedDraftOutput(
  draft: GeneratedRequirementDraft,
): MockGeneratedDraftOutput {
  return {
    state: "mock-generated-draft",
    hasGeneratedOutput: true,
    generatedCommentDraft: draft.generatedComment,
    demoStepsDraft: draft.demoSteps.flatMap((step) => step.instructions),
    draft,
  };
}

export function normalizeGeneratedOutput(
  value: unknown,
): RequirementGeneratedOutput {
  if (!isRecord(value)) {
    return createNotGeneratedOutput();
  }

  if (
    value.state === "mock-generated-draft" &&
    isGeneratedRequirementDraft(value.draft)
  ) {
    return createMockGeneratedDraftOutput(value.draft);
  }

  if (
    value.hasGeneratedOutput === true &&
    isGeneratedRequirementDraft(value.draft)
  ) {
    return createMockGeneratedDraftOutput(value.draft);
  }

  return createNotGeneratedOutput();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export type GeneratedOutputPlaceholder = NotGeneratedOutput;
