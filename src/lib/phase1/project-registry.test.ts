import { describe, expect, it } from "vitest";
import {
  createFixtureSourceMetadata,
  createFixtureWorkspaceState,
  createRequirementsWorkspaceState,
  createUploadSourceMetadata,
  saveRequirementsWorkspaceState,
} from "@/lib/requirements";
import type { ParsedRequirement } from "@/lib/requirements/parser";
import type { ReviewProjectMetadata } from "@/lib/requirements/review";
import type { StorageLike } from "@/lib/requirements/review-storage";
import {
  PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
  createPhase1ProjectRecordFromWorkspaceState,
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

  it("normalizes a persisted registry entry without falling back to the fixture workspace", () => {
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
        version: 1,
        activeProjectId: project.projectId,
        projects: [project],
      }),
    );

    const registry = loadPhase1ProjectRegistry(storage, fallbackWorkspaceState);

    expect(registry.projects).toHaveLength(1);
    expect(registry.projects[0]).toMatchObject({
      projectId: "pilot-review-project",
      currentStep: "review",
      workspaceState: {
        source: {
          sourceFilename: "Pilot Workbook.xlsx",
          sourceKind: "upload",
        },
      },
    });
  });
});
