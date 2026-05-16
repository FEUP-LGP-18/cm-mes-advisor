import { describe, expect, it } from "vitest";
import {
  createMockGeneratedRequirementDraft,
  createRequirementsReviewState,
  createFixtureSourceMetadata,
  createFixtureWorkspaceState,
  createRequirementsWorkspaceState,
  createUploadSourceMetadata,
  saveRequirementsWorkspaceState,
  updateRequirementsReviewState,
} from "@/lib/requirements";
import type { ParsedRequirement } from "@/lib/requirements/parser";
import type { ReviewProjectMetadata } from "@/lib/requirements/review";
import type { StorageLike } from "@/lib/requirements/review-storage";
import {
  LEGACY_PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
  PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
  createPhase1ProjectRegistry,
  createPhase1ProjectRecordFromWorkspaceState,
  ensureLocalProjectForRoute,
  loadPhase1ProjectRegistry,
} from "./project-registry";

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

describe("phase 1 project registry", () => {
  it("returns an empty registry for a fresh local workspace with no persisted data", () => {
    const storage = new MemoryStorage();
    const fixtureSource = createFixtureSourceMetadata(projectMetadata);
    const fallbackWorkspaceState = createFixtureWorkspaceState(fixtureSource, [
      parsedRequirement,
    ]);

    const registry = loadPhase1ProjectRegistry(storage, fallbackWorkspaceState);

    expect(registry).toMatchObject({
      version: 4,
      activeProjectId: null,
      projects: [],
    });
    expect(storage.getItem(PHASE1_PROJECT_REGISTRY_STORAGE_KEY)).toBeNull();
  });

  it("creates a fixture-backed local project for a direct project route", () => {
    const fixtureSource = createFixtureSourceMetadata(projectMetadata);
    const fallbackWorkspaceState = createFixtureWorkspaceState(fixtureSource, [
      parsedRequirement,
    ]);

    const registry = ensureLocalProjectForRoute(
      createPhase1ProjectRegistry(),
      fallbackWorkspaceState,
      "customer-x-demo",
    );

    expect(registry.activeProjectId).toBe("customer-x-demo");
    expect(registry.projects).toHaveLength(1);
    expect(registry.projects[0]).toMatchObject({
      currentStep: "source",
      customerName: "Customer X",
      projectId: "customer-x-demo",
      projectName: "Customer X Demo",
      workspaceState: {
        reviewState: {
          project: {
            projectId: "customer-x-demo",
            projectName: "Customer X Demo",
          },
        },
      },
    });
  });

  it("activates an existing local project route without duplicating it", () => {
    const fixtureSource = createFixtureSourceMetadata(projectMetadata);
    const fallbackWorkspaceState = createFixtureWorkspaceState(fixtureSource, [
      parsedRequirement,
    ]);
    const existingProject = createPhase1ProjectRecordFromWorkspaceState(
      fallbackWorkspaceState,
      {
        currentStep: "review",
        projectId: "customer-x-demo",
      },
    );

    const registry = ensureLocalProjectForRoute(
      createPhase1ProjectRegistry([existingProject], null),
      fallbackWorkspaceState,
      "customer-x-demo",
    );

    expect(registry.activeProjectId).toBe("customer-x-demo");
    expect(registry.projects).toHaveLength(1);
    expect(registry.projects[0]?.currentStep).toBe("review");
  });

  it("migrates the active workspace into a local project registry", () => {
    const storage = new MemoryStorage();
    const fixtureSource = createFixtureSourceMetadata(projectMetadata);
    const fallbackWorkspaceState = createFixtureWorkspaceState(fixtureSource, [
      parsedRequirement,
    ]);
    const uploadSource = createUploadSourceMetadata(
      "Customer X Upload.xlsx",
      new Uint8Array([1, 2, 3, 4]),
    );
    const uploadWorkspaceState = createRequirementsWorkspaceState(
      uploadSource,
      [parsedRequirement],
    );

    saveRequirementsWorkspaceState(storage, uploadWorkspaceState);

    const registry = loadPhase1ProjectRegistry(storage, fallbackWorkspaceState);

    expect(registry.projects).toHaveLength(1);
    expect(registry.activeProjectId).toBe(
      registry.projects[0]?.projectId ?? null,
    );
    expect(registry.projects[0]).toMatchObject({
      currentStep: "generate",
      workspaceState: {
        source: {
          sourceFilename: "Customer X Upload.xlsx",
          sourceKind: "upload",
        },
      },
    });
    expect(storage.getItem(PHASE1_PROJECT_REGISTRY_STORAGE_KEY)).toContain(
      '"projects"',
    );
  });

  it("normalizes a current persisted registry entry without falling back to the fixture workspace", () => {
    const storage = new MemoryStorage();
    const fixtureSource = createFixtureSourceMetadata(projectMetadata);
    const fallbackWorkspaceState = createFixtureWorkspaceState(fixtureSource, [
      parsedRequirement,
    ]);
    const uploadSource = createUploadSourceMetadata(
      "Pilot Workbook.xlsx",
      new Uint8Array([4, 3, 2, 1]),
    );
    const uploadWorkspaceState = createRequirementsWorkspaceState(
      uploadSource,
      [parsedRequirement],
    );
    const project = createPhase1ProjectRecordFromWorkspaceState(
      uploadWorkspaceState,
      {
        currentStep: "review",
        projectId: "pilot-review-project",
      },
    );

    storage.setItem(
      PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
      JSON.stringify({
        version: 4,
        activeProjectId: project.projectId,
        projects: [project],
      }),
    );

    const registry = loadPhase1ProjectRegistry(storage, fallbackWorkspaceState);

    expect(registry.projects).toHaveLength(1);
    expect(registry.projects[0]).toMatchObject({
      projectId: "pilot-review-project",
      phase2: {
        active: false,
      },
      currentStep: "review",
      workspaceState: {
        source: {
          sourceFilename: "Pilot Workbook.xlsx",
          sourceKind: "upload",
        },
      },
    });
  });

  it("migrates a legacy v1 registry key and maps five-step values into the new flow", () => {
    const storage = new MemoryStorage();
    const fixtureSource = createFixtureSourceMetadata(projectMetadata);
    const fallbackWorkspaceState = createFixtureWorkspaceState(fixtureSource, [
      parsedRequirement,
    ]);
    const uploadSource = createUploadSourceMetadata(
      "Legacy Workbook.xlsx",
      new Uint8Array([9, 8, 7, 6]),
    );
    const uploadWorkspaceState = createRequirementsWorkspaceState(
      uploadSource,
      [parsedRequirement],
    );
    const legacyProject = createPhase1ProjectRecordFromWorkspaceState(
      uploadWorkspaceState,
      {
        currentStep: "script",
        projectId: "legacy-script-project",
      },
    );

    storage.setItem(
      LEGACY_PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeProjectId: legacyProject.projectId,
        projects: [
          {
            ...legacyProject,
            version: 1,
            currentStep: "script",
          },
        ],
      }),
    );

    const registry = loadPhase1ProjectRegistry(storage, fallbackWorkspaceState);

    expect(registry.projects).toHaveLength(1);
    expect(registry.projects[0]).toMatchObject({
      version: 4,
      projectId: "legacy-script-project",
      currentStep: "script",
      workspaceState: {
        source: {
          sourceFilename: "Legacy Workbook.xlsx",
          sourceKind: "upload",
        },
      },
    });
    expect(storage.getItem(PHASE1_PROJECT_REGISTRY_STORAGE_KEY)).toContain(
      '"version":4',
    );
  });

  it("migrates a current three-step registry entry back into the five-step model", () => {
    const storage = new MemoryStorage();
    const fixtureSource = createFixtureSourceMetadata(projectMetadata);
    const fallbackWorkspaceState = createFixtureWorkspaceState(fixtureSource, [
      parsedRequirement,
    ]);
    const uploadSource = createUploadSourceMetadata(
      "Merged Setup Workbook.xlsx",
      new Uint8Array([5, 5, 5, 5]),
    );
    const uploadWorkspaceState = createRequirementsWorkspaceState(
      uploadSource,
      [parsedRequirement],
    );

    storage.setItem(
      LEGACY_PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        activeProjectId: "merged-setup-project",
        projects: [
          {
            version: 2,
            projectId: "merged-setup-project",
            projectName: "Merged Setup Project",
            customerName: "Customer X",
            createdAt: "2026-04-21T10:00:00.000Z",
            updatedAt: "2026-04-21T10:00:00.000Z",
            currentStep: "setup",
            workspaceState: uploadWorkspaceState,
            snapshot: {
              sourceRowCount: 1,
              demoCount: 0,
              mvpCount: 0,
              generatedCount: 0,
              generatedReviewableCount: 0,
              approvedCount: 0,
              approvedStepCount: 0,
              selectedCount: 0,
              scriptVisited: false,
              exportReady: false,
              sourceFilename: "Merged Setup Workbook.xlsx",
              sourceKind: "upload",
              sourceLabel: "Merged Setup Workbook.xlsx",
            },
          },
        ],
      }),
    );

    const registry = loadPhase1ProjectRegistry(storage, fallbackWorkspaceState);

    expect(registry.projects).toHaveLength(1);
    expect(registry.projects[0]).toMatchObject({
      version: 4,
      currentStep: "generate",
      workspaceState: {
        source: {
          sourceFilename: "Merged Setup Workbook.xlsx",
          sourceKind: "upload",
        },
      },
    });
  });

  it("maps a three-step handoff project to export when the deliverable is already ready", () => {
    const storage = new MemoryStorage();
    const fixtureSource = createFixtureSourceMetadata(projectMetadata);
    const fallbackWorkspaceState = createFixtureWorkspaceState(fixtureSource, [
      parsedRequirement,
    ]);
    const uploadSource = createUploadSourceMetadata(
      "Merged Handoff Workbook.xlsx",
      new Uint8Array([7, 7, 7, 7]),
    );
    let workspaceState = createRequirementsWorkspaceState(uploadSource, [
      parsedRequirement,
    ]);
    let reviewState = createRequirementsReviewState(
      workspaceState.reviewState.project,
    );
    reviewState = updateRequirementsReviewState(reviewState, parsedRequirement, {
      type: "storeMockGeneratedDraft",
      generatedOutput: createMockGeneratedRequirementDraft(parsedRequirement),
    });
    reviewState = updateRequirementsReviewState(reviewState, parsedRequirement, {
      type: "approve",
    });
    workspaceState = {
      ...workspaceState,
      reviewState,
    };

    storage.setItem(
      LEGACY_PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        activeProjectId: "merged-handoff-project",
        projects: [
          {
            version: 2,
            projectId: "merged-handoff-project",
            projectName: "Merged Handoff Project",
            customerName: "Customer X",
            createdAt: "2026-04-21T10:00:00.000Z",
            updatedAt: "2026-04-21T10:00:00.000Z",
            currentStep: "handoff",
            workspaceState,
            snapshot: {
              sourceRowCount: 1,
              demoCount: 0,
              mvpCount: 0,
              generatedCount: 1,
              generatedReviewableCount: 0,
              approvedCount: 1,
              approvedStepCount: 1,
              selectedCount: 0,
              scriptVisited: true,
              exportReady: true,
              sourceFilename: "Merged Handoff Workbook.xlsx",
              sourceKind: "upload",
              sourceLabel: "Merged Handoff Workbook.xlsx",
            },
          },
        ],
      }),
    );

    const registry = loadPhase1ProjectRegistry(storage, fallbackWorkspaceState);

    expect(registry.projects[0]).toMatchObject({
      version: 4,
      currentStep: "export",
    });
    expect(storage.getItem(PHASE1_PROJECT_REGISTRY_STORAGE_KEY)).toContain(
      '"version":4',
    );
  });

  it("marks export as ready even before the script route is visited", () => {
    const uploadSource = createUploadSourceMetadata(
      "Ready Workbook.xlsx",
      new Uint8Array([5, 5, 5, 5]),
    );
    let workspaceState = createRequirementsWorkspaceState(uploadSource, [
      parsedRequirement,
    ]);
    let reviewState = createRequirementsReviewState(
      workspaceState.reviewState.project,
    );

    reviewState = updateRequirementsReviewState(reviewState, parsedRequirement, {
      type: "storeMockGeneratedDraft",
      generatedOutput: createMockGeneratedRequirementDraft(parsedRequirement),
    });
    reviewState = updateRequirementsReviewState(reviewState, parsedRequirement, {
      type: "approve",
    });
    workspaceState = {
      ...workspaceState,
      reviewState,
    };

    const project = createPhase1ProjectRecordFromWorkspaceState(workspaceState, {
      currentStep: "review",
      projectId: "ready-before-script-project",
    });

    expect(project.snapshot.scriptVisited).toBe(false);
    expect(project.snapshot.exportReady).toBe(true);
  });
});
