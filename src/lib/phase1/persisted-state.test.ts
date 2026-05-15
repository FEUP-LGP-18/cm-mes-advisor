import { describe, expect, it } from "vitest";
import type { ParsedRequirement } from "@/lib/requirements/parser";
import {
  createFixtureSourceMetadata,
  createFixtureWorkspaceState,
} from "@/lib/requirements";
import {
  createPhase1ProjectRecordFromWorkspaceState,
} from "./project-registry";
import {
  createPersistedPhase1State,
  parsePersistedPhase1State,
} from "./persisted-state";

const parsedRequirement: ParsedRequirement = {
  sourceRowNumber: 3,
  requirementId: "01.01",
  requirementDescription: "Support electronic batch review",
  l2Process: "Manufacturing Execution",
  l3Process: "Review by Exception",
  operation: "Batch review",
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
};

const fallbackWorkspaceState = createFixtureWorkspaceState(
  createFixtureSourceMetadata({
    customerName: "Acme",
    projectId: "project-1",
    projectName: "Acme MES",
    sourceFilename: "requirements.xlsx",
    sourceRowCount: 1,
  }),
  [parsedRequirement],
);

describe("persisted Phase 1 state", () => {
  it("serializes the current workflow step with the workspace state", () => {
    const project = createPhase1ProjectRecordFromWorkspaceState(
      fallbackWorkspaceState,
      {
        createdAt: "2026-05-01T00:00:00.000Z",
        currentStep: "review",
        projectId: "project-1",
        updatedAt: "2026-05-01T00:00:00.000Z",
      },
    );

    expect(createPersistedPhase1State(project)).toMatchObject({
      currentStep: "review",
      stateVersion: 1,
      workspaceState: {
        parsedRequirements: [{ requirementId: "01.01" }],
      },
    });
  });

  it("parses valid saved state", () => {
    const parsed = parsePersistedPhase1State(
      {
        currentStep: "script",
        stateVersion: 1,
        workspaceState: fallbackWorkspaceState,
      },
      fallbackWorkspaceState,
    );

    expect(parsed).toMatchObject({
      currentStep: "script",
      stateVersion: 1,
      workspaceState: {
        reviewState: {
          project: {
            projectId: "project-1",
          },
        },
      },
    });
  });

  it("rejects unknown saved state versions", () => {
    expect(
      parsePersistedPhase1State(
        {
          currentStep: "review",
          stateVersion: 999,
          workspaceState: fallbackWorkspaceState,
        },
        fallbackWorkspaceState,
      ),
    ).toBeNull();
  });

  it("falls back to source when the saved step is invalid", () => {
    const parsed = parsePersistedPhase1State(
      {
        currentStep: "not-a-step",
        stateVersion: 1,
        workspaceState: fallbackWorkspaceState,
      },
      fallbackWorkspaceState,
    );

    expect(parsed?.currentStep).toBe("source");
  });
});
