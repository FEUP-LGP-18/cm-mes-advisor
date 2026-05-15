import type { ParsedRequirement } from "./types";
import {
  createRequirementsReviewState,
  type RequirementsReviewState,
  type ReviewProjectMetadata,
} from "./review";
import {
  CUSTOMER_X_REVIEW_STORAGE_KEY,
  parseRequirementsReviewState,
  type StorageLike,
} from "./review-storage";
import type { RequirementsSourceMetadata } from "./source";

export const REQUIREMENTS_WORKSPACE_ACTIVE_SOURCE_STORAGE_KEY =
  "cm-mes-advisor:phase1-active-source-id";
export const REQUIREMENTS_WORKSPACE_STATE_STORAGE_KEY_PREFIX =
  "cm-mes-advisor:phase1-workspace-state:";

export interface RequirementsWorkspaceState {
  version: 1;
  source: RequirementsSourceMetadata;
  parsedRequirements: ParsedRequirement[];
  reviewState: RequirementsReviewState;
}

export function getRequirementsWorkspaceStorageKey(sourceId: string): string {
  return `${REQUIREMENTS_WORKSPACE_STATE_STORAGE_KEY_PREFIX}${sourceId}`;
}

export function createRequirementsWorkspaceState(
  source: RequirementsSourceMetadata,
  parsedRequirements: ParsedRequirement[],
  reviewState?: RequirementsReviewState,
): RequirementsWorkspaceState {
  const project = createProjectMetadataFromSource(
    source,
    parsedRequirements.length,
  );

  return {
    version: 1,
    source,
    parsedRequirements,
    reviewState:
      reviewState ?? createRequirementsReviewState(project, {}, undefined),
  };
}

export function createFixtureWorkspaceState(
  source: RequirementsSourceMetadata,
  parsedRequirements: ParsedRequirement[],
): RequirementsWorkspaceState {
  return createRequirementsWorkspaceState(source, parsedRequirements);
}

export function loadRequirementsWorkspaceState(
  storage: StorageLike,
  fallbackState: RequirementsWorkspaceState,
): RequirementsWorkspaceState {
  let activeSourceId: string | null;

  try {
    activeSourceId = storage.getItem(
      REQUIREMENTS_WORKSPACE_ACTIVE_SOURCE_STORAGE_KEY,
    );
  } catch {
    return fallbackState;
  }

  const sourceId = activeSourceId?.trim() || fallbackState.source.sourceId;
  const storageKey = getRequirementsWorkspaceStorageKey(sourceId);

  try {
    const rawState = storage.getItem(storageKey);

    if (!rawState) {
      return loadMigratedLegacyWorkspaceState(storage, fallbackState, sourceId);
    }

    return normalizeRequirementsWorkspaceState(
      JSON.parse(rawState),
      fallbackState,
    );
  } catch {
    return fallbackState;
  }
}

function loadMigratedLegacyWorkspaceState(
  storage: StorageLike,
  fallbackState: RequirementsWorkspaceState,
  activeSourceId: string,
): RequirementsWorkspaceState {
  if (activeSourceId !== fallbackState.source.sourceId) {
    return fallbackState;
  }

  let legacyRawState: string | null;

  try {
    legacyRawState = storage.getItem(CUSTOMER_X_REVIEW_STORAGE_KEY);
  } catch {
    return fallbackState;
  }

  if (!legacyRawState) {
    return fallbackState;
  }

  const legacyReviewState = parseRequirementsReviewState(
    legacyRawState,
    fallbackState.reviewState,
  );
  const migratedState = createRequirementsWorkspaceState(
    fallbackState.source,
    fallbackState.parsedRequirements,
    legacyReviewState,
  );

  saveRequirementsWorkspaceState(storage, migratedState);

  return migratedState;
}

export function loadRequirementsWorkspaceStateForSource(
  storage: StorageLike,
  sourceId: string,
  fallbackState: RequirementsWorkspaceState,
): RequirementsWorkspaceState | null {
  try {
    const rawState = storage.getItem(
      getRequirementsWorkspaceStorageKey(sourceId),
    );

    if (!rawState) {
      return null;
    }

    return normalizeRequirementsWorkspaceState(
      JSON.parse(rawState),
      fallbackState,
    );
  } catch {
    return null;
  }
}

export function parseRequirementsWorkspaceState(
  value: unknown,
  fallbackState: RequirementsWorkspaceState,
): RequirementsWorkspaceState {
  return normalizeRequirementsWorkspaceState(value, fallbackState);
}

export function saveRequirementsWorkspaceState(
  storage: StorageLike,
  state: RequirementsWorkspaceState,
): void {
  try {
    storage.setItem(
      getRequirementsWorkspaceStorageKey(state.source.sourceId),
      JSON.stringify(state),
    );
    storage.setItem(
      REQUIREMENTS_WORKSPACE_ACTIVE_SOURCE_STORAGE_KEY,
      state.source.sourceId,
    );
  } catch {
    // Local prototype persistence should not block the review UI.
  }
}

export function setActiveRequirementsWorkspaceSource(
  storage: StorageLike,
  sourceId: string,
): void {
  try {
    storage.setItem(REQUIREMENTS_WORKSPACE_ACTIVE_SOURCE_STORAGE_KEY, sourceId);
  } catch {
    // Local prototype persistence should not block the review UI.
  }
}

function normalizeRequirementsWorkspaceState(
  value: unknown,
  fallbackState: RequirementsWorkspaceState,
): RequirementsWorkspaceState {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.source)) {
    return fallbackState;
  }

  const source = normalizeSourceMetadata(value.source, fallbackState.source);
  const parsedRequirements = Array.isArray(value.parsedRequirements)
    ? value.parsedRequirements.filter(isParsedRequirement)
    : fallbackState.parsedRequirements;
  const reviewState = normalizeWorkspaceReviewState(
    value.reviewState,
    source,
    parsedRequirements.length,
    fallbackState.reviewState,
  );

  return {
    version: 1,
    source,
    parsedRequirements,
    reviewState,
  };
}

function normalizeWorkspaceReviewState(
  value: unknown,
  source: RequirementsSourceMetadata,
  rowCount: number,
  fallbackReviewState: RequirementsReviewState,
): RequirementsReviewState {
  const project = normalizeReviewProjectMetadata(value, source, rowCount);
  const fallbackState = createRequirementsReviewState(
    project,
    fallbackReviewState.requirements,
    fallbackReviewState.demoScriptDraft,
  );

  return parseRequirementsReviewState(
    isRecord(value) ? JSON.stringify(value) : null,
    fallbackState,
  );
}

function normalizeReviewProjectMetadata(
  value: unknown,
  source: RequirementsSourceMetadata,
  rowCount: number,
): ReviewProjectMetadata {
  const fallbackProject = createProjectMetadataFromSource(source, rowCount);

  if (!isRecord(value) || !isRecord(value.project)) {
    return fallbackProject;
  }

  return {
    customerName:
      typeof value.project.customerName === "string" &&
      value.project.customerName.trim().length > 0
        ? value.project.customerName
        : fallbackProject.customerName,
    projectId:
      typeof value.project.projectId === "string" &&
      value.project.projectId.trim().length > 0
        ? value.project.projectId
        : fallbackProject.projectId,
    projectName:
      typeof value.project.projectName === "string" &&
      value.project.projectName.trim().length > 0
        ? value.project.projectName
        : fallbackProject.projectName,
    sourceFilename: source.sourceFilename,
    sourceRowCount: rowCount,
  };
}

function normalizeSourceMetadata(
  value: unknown,
  fallbackSource: RequirementsSourceMetadata,
): RequirementsSourceMetadata {
  if (!isRecord(value)) {
    return fallbackSource;
  }

  return {
    sourceId:
      typeof value.sourceId === "string" && value.sourceId.trim().length > 0
        ? value.sourceId
        : fallbackSource.sourceId,
    sourceKind: value.sourceKind === "upload" ? "upload" : "fixture",
    sourceLabel:
      typeof value.sourceLabel === "string" &&
      value.sourceLabel.trim().length > 0
        ? value.sourceLabel
        : fallbackSource.sourceLabel,
    sourceFilename:
      typeof value.sourceFilename === "string" &&
      value.sourceFilename.trim().length > 0
        ? value.sourceFilename
        : fallbackSource.sourceFilename,
    projectName:
      typeof value.projectName === "string" &&
      value.projectName.trim().length > 0
        ? value.projectName
        : fallbackSource.projectName,
    customerName:
      typeof value.customerName === "string" &&
      value.customerName.trim().length > 0
        ? value.customerName
        : fallbackSource.customerName,
    uploadedAt:
      typeof value.uploadedAt === "string" || value.uploadedAt === null
        ? value.uploadedAt
        : fallbackSource.uploadedAt,
  };
}

function createProjectMetadataFromSource(
  source: RequirementsSourceMetadata,
  rowCount: number,
): ReviewProjectMetadata {
  return {
    projectId: source.sourceId,
    projectName: source.projectName,
    customerName: source.customerName,
    sourceFilename: source.sourceFilename,
    sourceRowCount: rowCount,
  };
}

function isParsedRequirement(value: unknown): value is ParsedRequirement {
  return (
    isRecord(value) &&
    typeof value.sourceRowNumber === "number" &&
    typeof value.requirementId === "string" &&
    typeof value.requirementDescription === "string" &&
    typeof value.l2Process === "string" &&
    typeof value.l3Process === "string" &&
    typeof value.operation === "string" &&
    typeof value.demo === "boolean" &&
    typeof value.demoRaw === "string" &&
    typeof value.detailDescriptionAndMotivation === "string" &&
    typeof value.prioEms === "string" &&
    typeof value.prioCws === "string" &&
    typeof value.mvp === "boolean" &&
    typeof value.mvpRaw === "string" &&
    typeof value.availability === "string" &&
    typeof value.availabilityCm === "string" &&
    typeof value.descriptionAvailability === "string" &&
    typeof value.supportedPercent === "string" &&
    typeof value.sourceComment === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
