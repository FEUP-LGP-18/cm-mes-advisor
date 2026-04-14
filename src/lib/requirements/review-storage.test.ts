import { describe, expect, it } from "vitest";
import {
  CUSTOMER_X_REVIEW_STORAGE_KEY,
  createDefaultRequirementReviewEntry,
  createRequirementsReviewState,
  loadRequirementsReviewState,
  saveRequirementsReviewState,
  type ReviewProjectMetadata,
  type StorageLike,
} from ".";

const projectMetadata: ReviewProjectMetadata = {
  projectId: "customer-x-fixture",
  projectName: "Customer X Demo",
  customerName: "Customer X",
  sourceFilename: "fixtures/customer-x-functional-requirements.xlsx",
  sourceRowCount: 167,
};

const requirementIdentity = {
  sourceRowNumber: 3,
  requirementId: "01.01",
};

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("requirements review local storage adapter", () => {
  it("saves and loads a review state", () => {
    const storage = new MemoryStorage();
    const requirementKey = "3:01.01";
    const state = createRequirementsReviewState(projectMetadata, {
      [requirementKey]: {
        ...createDefaultRequirementReviewEntry(requirementIdentity),
        reviewStatus: "approved",
        consultantComment: "Ready for the demo script.",
      },
    });

    saveRequirementsReviewState(storage, state);

    expect(
      loadRequirementsReviewState(
        storage,
        createRequirementsReviewState(projectMetadata),
      ).requirements[requirementKey],
    ).toMatchObject({
      reviewStatus: "approved",
      consultantComment: "Ready for the demo script.",
      generatedOutput: {
        hasGeneratedOutput: false,
        generatedCommentDraft: null,
        demoStepsDraft: [],
      },
    });
  });

  it("falls back when stored JSON is invalid", () => {
    const storage = new MemoryStorage();
    const fallbackState = createRequirementsReviewState(projectMetadata);

    storage.setItem(CUSTOMER_X_REVIEW_STORAGE_KEY, "{not json");

    expect(loadRequirementsReviewState(storage, fallbackState)).toEqual(
      fallbackState,
    );
  });

  it("does not load state from a different project id", () => {
    const storage = new MemoryStorage();
    const fallbackState = createRequirementsReviewState(projectMetadata);
    const otherProjectState = createRequirementsReviewState({
      ...projectMetadata,
      projectId: "different-project",
    });

    saveRequirementsReviewState(storage, otherProjectState);

    expect(loadRequirementsReviewState(storage, fallbackState)).toEqual(
      fallbackState,
    );
  });
});
