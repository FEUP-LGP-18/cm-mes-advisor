import { describe, expect, it } from "vitest";
import {
  CUSTOMER_X_REVIEW_STORAGE_KEY,
  createDefaultRequirementReviewEntry,
  createMockGeneratedRequirementDraft,
  createRequirementsReviewState,
  loadRequirementsReviewState,
  saveRequirementsReviewState,
  updateRequirementsDemoScriptDraft,
  updateRequirementsReviewState,
  type ParsedRequirement,
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

const parsedRequirement: ParsedRequirement = {
  ...requirementIdentity,
  requirementDescription: "UI supporting local language",
  l2Process: "General",
  l3Process: "Localization",
  operation: "",
  demo: false,
  demoRaw: "",
  detailDescriptionAndMotivation: "Consultants need traceable source data.",
  prioEms: "1",
  prioCws: "2",
  mvp: false,
  mvpRaw: "",
  availability: "Available",
  availabilityCm: "Standard",
  descriptionAvailability: "Supported by configuration.",
  supportedPercent: "100%",
  sourceComment: "Existing Excel Comment feedback.",
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

  it("persists generated output and reset restores the generated draft", () => {
    const storage = new MemoryStorage();
    const generatedDraft =
      createMockGeneratedRequirementDraft(parsedRequirement);
    const generatedState = updateRequirementsReviewState(
      createRequirementsReviewState(projectMetadata),
      parsedRequirement,
      {
        type: "storeMockGeneratedDraft",
        generatedOutput: generatedDraft,
      },
    );
    const editedState = updateRequirementsReviewState(
      generatedState,
      parsedRequirement,
      {
        type: "edit",
        consultantComment: "Manual consultant rewrite.",
        reviewNote: "Check wording.",
      },
    );
    const resetState = updateRequirementsReviewState(
      editedState,
      parsedRequirement,
      { type: "resetToDraft" },
    );

    saveRequirementsReviewState(storage, resetState);

    const loadedState = loadRequirementsReviewState(
      storage,
      createRequirementsReviewState(projectMetadata),
    );
    const loadedEntry = loadedState.requirements["3:01.01"];

    expect(loadedEntry).toMatchObject({
      reviewStatus: "pending",
      consultantComment: generatedDraft.generatedComment,
      reviewNote: "",
      generatedOutput: {
        state: "mock-generated-draft",
        hasGeneratedOutput: true,
        generatedCommentDraft: generatedDraft.generatedComment,
      },
    });
    expect(loadedEntry?.consultantComment).not.toBe(
      parsedRequirement.sourceComment,
    );
  });

  it("migrates a version 1 review state with a default demo script draft", () => {
    const storage = new MemoryStorage();
    const fallbackState = createRequirementsReviewState(projectMetadata);
    const legacyState = {
      version: 1,
      project: projectMetadata,
      requirements: {
        [requirementKey(requirementIdentity)]: {
          requirementKey: requirementKey(requirementIdentity),
          reviewStatus: "approved",
          consultantComment: "Legacy approved comment.",
          reviewNote: "",
          generatedOutput: {
            state: "not-generated",
            hasGeneratedOutput: false,
            generatedCommentDraft: null,
            demoStepsDraft: [],
          },
        },
      },
    };

    storage.setItem(CUSTOMER_X_REVIEW_STORAGE_KEY, JSON.stringify(legacyState));

    const loadedState = loadRequirementsReviewState(storage, fallbackState);

    expect(loadedState.version).toBe(2);
    expect(loadedState.demoScriptDraft.title).toBe("Customer X Demo Script");
    expect(
      loadedState.requirements[requirementKey(requirementIdentity)],
    ).toMatchObject({
      reviewStatus: "approved",
      consultantComment: "Legacy approved comment.",
    });
  });

  it("persists demo script title, section order, and step edits", () => {
    const storage = new MemoryStorage();
    const generatedDraft =
      createMockGeneratedRequirementDraft(parsedRequirement);
    const generatedState = updateRequirementsReviewState(
      createRequirementsReviewState(projectMetadata),
      parsedRequirement,
      {
        type: "storeMockGeneratedDraft",
        generatedOutput: generatedDraft,
      },
    );
    const approvedState = updateRequirementsReviewState(
      generatedState,
      parsedRequirement,
      { type: "approve" },
    );
    const scriptedState = updateRequirementsDemoScriptDraft(approvedState, {
      type: "renameTitle",
      title: "Customer X Custom Script",
    });
    const sectionKey = "l2:manufacturing-execution";
    const stepKey = `${requirementKey(requirementIdentity)}:${generatedDraft.demoSteps[0]?.id}`;
    const editedState = updateRequirementsDemoScriptDraft(
      updateRequirementsDemoScriptDraft(scriptedState, {
        type: "setSectionOrder",
        sectionOrder: [sectionKey],
      }),
      {
        type: "editStep",
        stepKey,
        title: "Opening demo step",
        note: "Use the consultant-approved introduction.",
      },
    );

    saveRequirementsReviewState(storage, editedState);

    const loadedState = loadRequirementsReviewState(
      storage,
      createRequirementsReviewState(projectMetadata),
    );

    expect(loadedState.demoScriptDraft).toMatchObject({
      version: 1,
      title: "Customer X Custom Script",
      sectionOrder: [sectionKey],
      stepEdits: {
        [stepKey]: {
          title: "Opening demo step",
          note: "Use the consultant-approved introduction.",
        },
      },
    });
  });
});

function requirementKey(value: {
  requirementId: string;
  sourceRowNumber: number;
}): string {
  return `${value.sourceRowNumber}:${value.requirementId.trim() || "no-id"}`;
}
