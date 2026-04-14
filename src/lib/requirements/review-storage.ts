import {
  createGeneratedOutputPlaceholder,
  isRequirementReviewStatus,
  type RequirementReviewEntry,
  type RequirementReviewStateByKey,
  type RequirementsReviewState,
} from "./review";

export const CUSTOMER_X_REVIEW_STORAGE_KEY =
  "cm-mes-advisor:customer-x-fixture:review-state:v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function loadRequirementsReviewState(
  storage: StorageLike,
  fallbackState: RequirementsReviewState,
  storageKey = CUSTOMER_X_REVIEW_STORAGE_KEY,
): RequirementsReviewState {
  let rawState: string | null;

  try {
    rawState = storage.getItem(storageKey);
  } catch {
    return fallbackState;
  }

  if (!rawState) {
    return fallbackState;
  }

  return parseRequirementsReviewState(rawState, fallbackState);
}

export function parseRequirementsReviewState(
  rawState: string | null,
  fallbackState: RequirementsReviewState,
): RequirementsReviewState {
  if (!rawState) {
    return fallbackState;
  }

  try {
    return normalizeStoredReviewState(JSON.parse(rawState), fallbackState);
  } catch {
    return fallbackState;
  }
}

export function saveRequirementsReviewState(
  storage: StorageLike,
  state: RequirementsReviewState,
  storageKey = CUSTOMER_X_REVIEW_STORAGE_KEY,
): void {
  try {
    storage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Local prototype persistence should not block the review UI.
  }
}

export function clearRequirementsReviewState(
  storage: StorageLike,
  storageKey = CUSTOMER_X_REVIEW_STORAGE_KEY,
): void {
  try {
    storage.removeItem(storageKey);
  } catch {
    // Local prototype persistence should not block the review UI.
  }
}

function normalizeStoredReviewState(
  value: unknown,
  fallbackState: RequirementsReviewState,
): RequirementsReviewState {
  if (!isRecord(value)) {
    return fallbackState;
  }

  if (value.version !== 1 || !isRecord(value.project)) {
    return fallbackState;
  }

  if (value.project.projectId !== fallbackState.project.projectId) {
    return fallbackState;
  }

  return {
    ...fallbackState,
    requirements: normalizeStoredRequirements(value.requirements),
  };
}

function normalizeStoredRequirements(
  value: unknown,
): RequirementReviewStateByKey {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([requirementKey, entry]) => [
        requirementKey,
        normalizeStoredRequirementEntry(requirementKey, entry),
      ])
      .filter(
        (entry): entry is [string, RequirementReviewEntry] => entry[1] !== null,
      ),
  );
}

function normalizeStoredRequirementEntry(
  requirementKey: string,
  value: unknown,
): RequirementReviewEntry | null {
  if (!isRecord(value) || !isRequirementReviewStatus(value.reviewStatus)) {
    return null;
  }

  return {
    requirementKey,
    reviewStatus: value.reviewStatus,
    consultantComment:
      typeof value.consultantComment === "string"
        ? value.consultantComment
        : "",
    reviewNote: typeof value.reviewNote === "string" ? value.reviewNote : "",
    generatedOutput: createGeneratedOutputPlaceholder(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
