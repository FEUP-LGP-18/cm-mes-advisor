import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import {
  requireProjectCapability,
  requireUser,
} from "./permissions.server";
import {
  getProjectPhaseStateForUser,
  saveProjectPhaseState,
} from "./repository.server";
import type { CurrentUser, ProjectRole } from "./types";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("./permissions.server", () => ({
  requireProjectCapability: vi.fn(),
  requireUser: vi.fn(),
}));

const createClientMock = vi.mocked(createClient);
const requireUserMock = vi.mocked(requireUser);
const requireProjectCapabilityMock = vi.mocked(requireProjectCapability);

const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const phase2Key = "phase2_master_data";
const currentUser: CurrentUser = {
  email: "editor@example.com",
  emailConfirmedAt: "2026-05-01T12:00:00.000Z",
  id: userId,
};

function mockAuthenticatedUser() {
  requireUserMock.mockResolvedValueOnce({
    data: currentUser,
    ok: true,
    status: "success",
  });
}

function mockCapabilityAllowed() {
  requireProjectCapabilityMock.mockResolvedValueOnce({
    data: currentUser,
    ok: true,
    status: "success",
  });
}

function mockPhaseStateSelect(data: Record<string, unknown> | null) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data,
    error: null,
  });
  const eqPhaseKey = vi.fn().mockReturnValue({ maybeSingle });
  const eqProjectId = vi.fn().mockReturnValue({ eq: eqPhaseKey });
  const select = vi.fn().mockReturnValue({ eq: eqProjectId });
  const from = vi.fn().mockReturnValue({ select });

  createClientMock.mockResolvedValueOnce({
    from,
  } as unknown as Awaited<ReturnType<typeof createClient>>);

  return { from };
}

function mockPhaseStateInsert(data: Record<string, unknown>) {
  const existingMaybeSingle = vi.fn().mockResolvedValue({
    data: null,
    error: null,
  });
  const existingEqPhaseKey = vi
    .fn()
    .mockReturnValue({ maybeSingle: existingMaybeSingle });
  const existingEqProjectId = vi
    .fn()
    .mockReturnValue({ eq: existingEqPhaseKey });
  const existingSelect = vi.fn().mockReturnValue({ eq: existingEqProjectId });

  const insertedSingle = vi.fn().mockResolvedValue({
    data,
    error: null,
  });
  const insertedSelect = vi.fn().mockReturnValue({ single: insertedSingle });
  const insert = vi.fn().mockReturnValue({ select: insertedSelect });
  const from = vi
    .fn()
    .mockReturnValueOnce({ select: existingSelect })
    .mockReturnValueOnce({ insert });

  createClientMock.mockResolvedValueOnce({
    from,
  } as unknown as Awaited<ReturnType<typeof createClient>>);

  return { insert };
}

describe("project repository", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed before saving phase state without an authenticated user", async () => {
    requireUserMock.mockResolvedValueOnce({
      message: "Authentication required.",
      ok: false,
      status: "not_authenticated",
    });

    await expect(
      saveProjectPhaseState(projectId, "review", {}, 1, userId),
    ).resolves.toMatchObject({
      ok: false,
      status: "not_authenticated",
    });

    expect(requireProjectCapabilityMock).not.toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns conflict when the expected phase state version is stale", async () => {
    mockAuthenticatedUser();
    mockCapabilityAllowed();

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        phase_key: "review",
        project_id: projectId,
        state_json: { draftCount: 3 },
        updated_at: "2026-04-30T12:00:00.000Z",
        updated_by: userId,
        version: 2,
      },
      error: null,
    });
    const eqPhaseKey = vi.fn().mockReturnValue({ maybeSingle });
    const eqProjectId = vi.fn().mockReturnValue({ eq: eqPhaseKey });
    const select = vi.fn().mockReturnValue({ eq: eqProjectId });
    const from = vi.fn().mockReturnValue({ select });

    createClientMock.mockResolvedValueOnce({
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    await expect(
      saveProjectPhaseState(projectId, "review", { draftCount: 4 }, 1, userId),
    ).resolves.toMatchObject({
      ok: false,
      status: "conflict",
    });
  });

  it.each<ProjectRole>(["viewer", "editor", "owner"])(
    "allows %s-equivalent access to read future Phase 2 master data state",
    async () => {
      mockAuthenticatedUser();
      mockCapabilityAllowed();
      mockPhaseStateSelect({
        phase_key: phase2Key,
        project_id: projectId,
        state_json: {
          objects: [{ id: "material-01", status: "draft" }],
        },
        updated_at: "2026-04-30T12:00:00.000Z",
        updated_by: userId,
        version: 3,
      });

      await expect(
        getProjectPhaseStateForUser(projectId, phase2Key, userId),
      ).resolves.toMatchObject({
        data: {
          phaseKey: phase2Key,
          state: {
            objects: [{ id: "material-01", status: "draft" }],
          },
          version: 3,
        },
        ok: true,
        status: "success",
      });

      expect(requireProjectCapabilityMock).toHaveBeenCalledWith(
        projectId,
        "read_project",
      );
    },
  );

  it("blocks viewer-equivalent access from writing future Phase 2 master data state", async () => {
    mockAuthenticatedUser();
    requireProjectCapabilityMock.mockResolvedValueOnce({
      message: "Project access denied.",
      ok: false,
      status: "forbidden",
    });

    await expect(
      saveProjectPhaseState(
        projectId,
        phase2Key,
        { objects: [] },
        0,
        userId,
      ),
    ).resolves.toMatchObject({
      ok: false,
      status: "forbidden",
    });

    expect(requireProjectCapabilityMock).toHaveBeenCalledWith(
      projectId,
      "edit_project_state",
    );
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it.each<ProjectRole>(["editor", "owner"])(
    "allows %s-equivalent access to write future Phase 2 master data state",
    async () => {
      mockAuthenticatedUser();
      mockCapabilityAllowed();
      const { insert } = mockPhaseStateInsert({
        phase_key: phase2Key,
        project_id: projectId,
        state_json: {
          objects: [{ id: "work-center-01", status: "approved" }],
        },
        updated_at: "2026-04-30T12:00:00.000Z",
        updated_by: userId,
        version: 1,
      });

      await expect(
        saveProjectPhaseState(
          projectId,
          phase2Key,
          { objects: [{ id: "work-center-01", status: "approved" }] },
          0,
          userId,
        ),
      ).resolves.toMatchObject({
        data: {
          phaseKey: phase2Key,
          state: {
            objects: [{ id: "work-center-01", status: "approved" }],
          },
          version: 1,
        },
        ok: true,
        status: "success",
      });

      expect(requireProjectCapabilityMock).toHaveBeenCalledWith(
        projectId,
        "edit_project_state",
      );
      expect(insert).toHaveBeenCalledWith({
        phase_key: phase2Key,
        project_id: projectId,
        state_json: {
          objects: [{ id: "work-center-01", status: "approved" }],
        },
        updated_by: userId,
      });
    },
  );
});
