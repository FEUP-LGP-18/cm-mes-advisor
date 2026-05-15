import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFixtureWorkspaceState } from "@/lib/phase1/fixture";
import {
  createMockGeneratedRequirementDraft,
  createFixtureSourceMetadata,
  createFixtureWorkspaceState,
  updateRequirementsReviewState,
} from "@/lib/requirements";
import type { ParsedRequirement } from "@/lib/requirements/parser";
import { requireProjectCapability } from "@/lib/projects/permissions.server";
import {
  getProjectForUser,
  getProjectPhaseState,
  saveProjectPhaseState,
} from "@/lib/projects/repository.server";
import { PATCH } from "./route";

vi.mock("@/lib/phase1/fixture", () => ({
  getFixtureWorkspaceState: vi.fn(),
}));

vi.mock("@/lib/projects/permissions.server", () => ({
  requireProjectCapability: vi.fn(),
}));

vi.mock("@/lib/projects/repository.server", () => ({
  getProjectForUser: vi.fn(),
  getProjectPhaseState: vi.fn(),
  saveProjectPhaseState: vi.fn(),
}));

const requireProjectCapabilityMock = vi.mocked(requireProjectCapability);
const getFixtureWorkspaceStateMock = vi.mocked(getFixtureWorkspaceState);
const getProjectForUserMock = vi.mocked(getProjectForUser);
const getProjectPhaseStateMock = vi.mocked(getProjectPhaseState);
const saveProjectPhaseStateMock = vi.mocked(saveProjectPhaseState);

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

const workspaceState = createFixtureWorkspaceState(
  createFixtureSourceMetadata({
    customerName: "Acme",
    projectId: "project-1",
    projectName: "Acme MES",
    sourceFilename: "requirements.xlsx",
    sourceRowCount: 1,
  }),
  [parsedRequirement],
);
const generatedWorkspaceState = {
  ...workspaceState,
  reviewState: updateRequirementsReviewState(
    workspaceState.reviewState,
    parsedRequirement,
    {
      generatedOutput: createMockGeneratedRequirementDraft(parsedRequirement),
      type: "storeMockGeneratedDraft",
    },
  ),
};

const user = {
  email: "editor@example.com",
  emailConfirmedAt: "2026-05-01T00:00:00.000Z",
  id: "user-1",
};

const project = {
  archivedAt: null,
  createdAt: "2026-05-01T00:00:00.000Z",
  createdBy: "user-1",
  customerName: "Acme",
  description: null,
  id: "project-1",
  name: "Acme MES",
  status: "active" as const,
  updatedAt: "2026-05-01T00:00:00.000Z",
  updatedBy: "user-1",
};

function createRequest(body: unknown) {
  return new Request("http://localhost/projects/project-1/phase1/state", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "PATCH",
  });
}

const context = {
  params: Promise.resolve({ projectId: "project-1" }),
};

describe("PATCH /projects/[projectId]/phase1/state", () => {
  beforeEach(() => {
    getFixtureWorkspaceStateMock.mockResolvedValue({
      fixturePath: "fixtures/requirements.xlsx",
      workspaceState,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("saves Phase 1 state for editors", async () => {
    requireProjectCapabilityMock.mockResolvedValueOnce({
      data: user,
      ok: true,
      status: "success",
    });
    getProjectForUserMock.mockResolvedValueOnce({
      data: project,
      ok: true,
      status: "success",
    });
    saveProjectPhaseStateMock.mockResolvedValueOnce({
      data: {
        phaseKey: "phase1",
        projectId: "project-1",
        state: {},
        updatedAt: "2026-05-01T00:00:00.000Z",
        updatedBy: "user-1",
        version: 3,
      },
      ok: true,
      status: "success",
    });

    const response = await PATCH(
      createRequest({
        expectedVersion: 2,
        state: {
          currentStep: "review",
          stateVersion: 1,
          workspaceState,
        },
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(saveProjectPhaseStateMock).toHaveBeenCalledWith(
      "project-1",
      "phase1",
      expect.objectContaining({
        currentStep: "review",
        stateVersion: 1,
      }),
      2,
      "user-1",
    );
  });

  it("blocks viewers from saving Phase 1 state", async () => {
    requireProjectCapabilityMock.mockResolvedValueOnce({
      message: "Editors or owners can save project state.",
      ok: false,
      status: "forbidden",
    });

    const response = await PATCH(
      createRequest({
        expectedVersion: 1,
        state: {
          currentStep: "review",
          stateVersion: 1,
          workspaceState,
        },
      }),
      context,
    );

    expect(response.status).toBe(403);
    expect(saveProjectPhaseStateMock).not.toHaveBeenCalled();
  });

  it("rejects stale conflicts that would regress saved workflow state", async () => {
    requireProjectCapabilityMock.mockResolvedValueOnce({
      data: user,
      ok: true,
      status: "success",
    });
    getProjectForUserMock.mockResolvedValueOnce({
      data: project,
      ok: true,
      status: "success",
    });
    saveProjectPhaseStateMock.mockResolvedValueOnce({
      message: "Saved state changed in another session.",
      ok: false,
      status: "conflict",
    });
    getProjectPhaseStateMock.mockResolvedValueOnce({
      data: {
        phaseKey: "phase1",
        projectId: "project-1",
        state: {
          currentStep: "review",
          stateVersion: 1,
          workspaceState: generatedWorkspaceState,
        },
        updatedAt: "2026-05-01T00:00:00.000Z",
        updatedBy: "user-1",
        version: 7,
      },
      ok: true,
      status: "success",
    });

    const response = await PATCH(
      createRequest({
        expectedVersion: 2,
        state: {
          currentStep: "review",
          stateVersion: 1,
          workspaceState,
        },
      }),
      context,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        currentVersion: 7,
        message:
          "A newer Phase 1 workflow state is already saved. Reload to continue from the latest project state.",
      },
      ok: false,
    });
  });

  it("recovers stale conflicts when the incoming state does not regress progress", async () => {
    requireProjectCapabilityMock.mockResolvedValueOnce({
      data: user,
      ok: true,
      status: "success",
    });
    getProjectForUserMock.mockResolvedValueOnce({
      data: project,
      ok: true,
      status: "success",
    });
    saveProjectPhaseStateMock
      .mockResolvedValueOnce({
        message: "Saved state changed in another session.",
        ok: false,
        status: "conflict",
      })
      .mockResolvedValueOnce({
        data: {
          phaseKey: "phase1",
          projectId: "project-1",
          state: {},
          updatedAt: "2026-05-01T00:00:00.000Z",
          updatedBy: "user-1",
          version: 8,
        },
        ok: true,
        status: "success",
      });
    getProjectPhaseStateMock.mockResolvedValueOnce({
      data: {
        phaseKey: "phase1",
        projectId: "project-1",
        state: {
          currentStep: "generate",
          stateVersion: 1,
          workspaceState,
        },
        updatedAt: "2026-05-01T00:00:00.000Z",
        updatedBy: "user-1",
        version: 7,
      },
      ok: true,
      status: "success",
    });

    const response = await PATCH(
      createRequest({
        expectedVersion: 2,
        state: {
          currentStep: "review",
          stateVersion: 1,
          workspaceState: generatedWorkspaceState,
        },
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(saveProjectPhaseStateMock).toHaveBeenLastCalledWith(
      "project-1",
      "phase1",
      expect.objectContaining({
        currentStep: "review",
      }),
      7,
      "user-1",
    );
  });

  it("rejects invalid saved state envelopes", async () => {
    requireProjectCapabilityMock.mockResolvedValueOnce({
      data: user,
      ok: true,
      status: "success",
    });

    const response = await PATCH(
      createRequest({
        expectedVersion: 2,
        state: {
          currentStep: "review",
          stateVersion: 999,
          workspaceState,
        },
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(saveProjectPhaseStateMock).not.toHaveBeenCalled();
  });
});
