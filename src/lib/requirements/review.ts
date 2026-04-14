import type { ParsedRequirement } from "./parser";

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
  | { type: "edit"; consultantComment?: string; reviewNote?: string };

export interface GeneratedOutputPlaceholder {
  hasGeneratedOutput: false;
  generatedCommentDraft: null;
  demoStepsDraft: string[];
}

export interface RequirementReviewEntry {
  requirementKey: string;
  reviewStatus: RequirementReviewStatus;
  consultantComment: string;
  reviewNote: string;
  generatedOutput: GeneratedOutputPlaceholder;
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
  version: 1;
  project: ReviewProjectMetadata;
  requirements: RequirementReviewStateByKey;
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
): RequirementsReviewState {
  return {
    version: 1,
    project,
    requirements,
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
    generatedOutput: createGeneratedOutputPlaceholder(),
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
        consultantComment: "",
        reviewNote: "",
        generatedOutput: createGeneratedOutputPlaceholder(),
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
  return {
    hasGeneratedOutput: false,
    generatedCommentDraft: null,
    demoStepsDraft: [],
  };
}
