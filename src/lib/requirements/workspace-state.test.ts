import { describe, expect, it } from "vitest";
import {
  createMockGeneratedRequirementDraft,
  createRequirementsReviewState,
  createRequirementsWorkspaceState,
  createFixtureSourceMetadata,
  createUploadSourceMetadata,
  createFixtureWorkspaceState,
  getRequirementsWorkspaceStorageKey,
  loadRequirementsWorkspaceState,
  loadRequirementsWorkspaceStateForSource,
  saveRequirementsWorkspaceState,
  saveRequirementsReviewState,
  REQUIREMENTS_WORKSPACE_ACTIVE_SOURCE_STORAGE_KEY,
  type ParsedRequirement,
  type ReviewProjectMetadata,
  type StorageLike,
} from ".";
import {
  updateRequirementsReviewState,
  type RequirementReviewStateByKey,
} from "./review";
import { parseRequirementsWorkspaceState } from "./workspace-state";

const projectMetadata: ReviewProjectMetadata = {
  projectId: "customer-x-fixture",
  projectName: "Customer X Demo",
  customerName: "Customer X",
  sourceFilename: "fixtures/customer-x-functional-requirements.xlsx",
  sourceRowCount: 167,
};

const parsedRequirement: ParsedRequirement = {
  sourceRowNumber: 3,
  requirementId: "01.01",
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

describe("requirements workspace state", () => {
  it("keeps fixture and upload state isolated by source id", () => {
    const storage = new MemoryStorage();
    const fixtureSource = createFixtureSourceMetadata(projectMetadata);
    const uploadSource = createUploadSourceMetadata(
      "Customer X Upload.xlsx",
      new Uint8Array([1, 2, 3, 4]),
      {
        industryTemplateId: "electronics",
      },
    );
    const fixtureState = createFixtureWorkspaceState(fixtureSource, [
      parsedRequirement,
    ]);
    const uploadState = createRequirementsWorkspaceState(uploadSource, [
      parsedRequirement,
    ]);

    saveRequirementsWorkspaceState(storage, fixtureState);
    saveRequirementsWorkspaceState(storage, uploadState);

    expect(
      loadRequirementsWorkspaceStateForSource(
        storage,
        fixtureSource.sourceId,
        fixtureState,
      ),
    ).toMatchObject({
      source: fixtureSource,
      parsedRequirements: [parsedRequirement],
    });
    expect(
      loadRequirementsWorkspaceStateForSource(
        storage,
        uploadSource.sourceId,
        uploadState,
      ),
    ).toMatchObject({
      source: uploadSource,
      parsedRequirements: [parsedRequirement],
    });
    expect(loadRequirementsWorkspaceState(storage, fixtureState)).toMatchObject(
      {
        source: uploadSource,
        parsedRequirements: [parsedRequirement],
      },
    );
    expect(
      storage.getItem(REQUIREMENTS_WORKSPACE_ACTIVE_SOURCE_STORAGE_KEY),
    ).toBe(uploadSource.sourceId);
    expect(
      storage.getItem(
        getRequirementsWorkspaceStorageKey(fixtureSource.sourceId),
      ),
    ).toBeTruthy();
    expect(
      storage.getItem(
        getRequirementsWorkspaceStorageKey(uploadSource.sourceId),
      ),
    ).toBeTruthy();
  });

  it("normalizes a saved industry template on source metadata", () => {
    const fixtureState = createFixtureWorkspaceState(
      createFixtureSourceMetadata(projectMetadata),
      [parsedRequirement],
    );
    const parsedState = parseRequirementsWorkspaceState(
      {
        version: 1,
        source: {
          ...fixtureState.source,
          industryTemplateId: "food-beverage",
        },
        parsedRequirements: [parsedRequirement],
        reviewState: fixtureState.reviewState,
      },
      fixtureState,
    );

    expect(parsedState.source.industryTemplateId).toBe("food");
  });

  it("migrates the legacy fixture review state into the new workspace storage", () => {
    const storage = new MemoryStorage();
    const fixtureSource = createFixtureSourceMetadata(projectMetadata);
    const fallbackWorkspaceState = createFixtureWorkspaceState(fixtureSource, [
      parsedRequirement,
    ]);
    const legacyReviewState = createRequirementsReviewState(
      projectMetadata,
      createLegacyGeneratedRequirementState(parsedRequirement),
    );

    saveRequirementsReviewState(storage, legacyReviewState);

    const migratedState = loadRequirementsWorkspaceState(
      storage,
      fallbackWorkspaceState,
    );

    expect(migratedState.source).toMatchObject(fixtureSource);
    expect(migratedState.reviewState.project).toMatchObject({
      ...projectMetadata,
      sourceRowCount: 1,
    });
    expect(
      storage.getItem(
        getRequirementsWorkspaceStorageKey(fixtureSource.sourceId),
      ),
    ).toContain('"version":1');
    expect(
      storage.getItem(REQUIREMENTS_WORKSPACE_ACTIVE_SOURCE_STORAGE_KEY),
    ).toBe(fixtureSource.sourceId);
  });

  it("keeps server project review state when project id differs from uploaded source id", () => {
    const uploadSource = createUploadSourceMetadata(
      "Customer X Upload.xlsx",
      new Uint8Array([1, 2, 3, 4]),
      {
        sourceId:
          "project-files/server-project-id/2026-05-14T12:00:00.000Z-upload.xlsx",
      },
    );
    const generatedState = updateRequirementsReviewState(
      createRequirementsReviewState({
        ...projectMetadata,
        projectId: "server-project-id",
        sourceFilename: uploadSource.sourceFilename,
        sourceRowCount: 1,
      }),
      parsedRequirement,
      {
        generatedOutput: createMockGeneratedRequirementDraft(parsedRequirement),
        type: "storeMockGeneratedDraft",
      },
    );
    const workspaceState = createRequirementsWorkspaceState(
      uploadSource,
      [parsedRequirement],
      generatedState,
    );

    const parsedState = parseRequirementsWorkspaceState(
      JSON.parse(JSON.stringify(workspaceState)),
      createFixtureWorkspaceState(createFixtureSourceMetadata(projectMetadata), [
        parsedRequirement,
      ]),
    );
    const entry = parsedState.reviewState.requirements["3:01.01"];

    expect(parsedState.reviewState.project).toMatchObject({
      projectId: "server-project-id",
      sourceFilename: "Customer X Upload.xlsx",
      sourceRowCount: 1,
    });
    expect(entry?.generatedOutput).toMatchObject({
      state: "mock-generated-draft",
    });
  });
});

function createLegacyGeneratedRequirementState(
  requirement: ParsedRequirement,
): RequirementReviewStateByKey {
  const draft = createMockGeneratedRequirementDraft(requirement);
  const generatedState = updateRequirementsReviewState(
    createRequirementsReviewState(projectMetadata),
    requirement,
    {
      type: "storeMockGeneratedDraft",
      generatedOutput: draft,
    },
  );

  return generatedState.requirements;
}
