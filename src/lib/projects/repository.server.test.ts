import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import {
  requireProjectCapability,
  requireUser,
} from "./permissions.server";
import {
  deleteUploadedProjectFileMetadata,
  createProjectForUser,
  getProjectPhaseStateForUser,
  listProjectActivity,
  listProjectsForUser,
  saveProjectFileMetadata,
  saveProjectPhaseState,
} from "./repository.server";
import type { CurrentUser, ProjectRole } from "./types";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("./permissions.server", () => ({
  isUuid: (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    ),
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

  it("lists projects with the current user's role", async () => {
    requireUserMock.mockResolvedValueOnce({
      data: {
        email: "owner@example.com",
        emailConfirmedAt: "2026-05-01T12:00:00.000Z",
        id: userId,
      },
      ok: true,
      status: "success",
    });

    const projectsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          archived_at: null,
          created_at: "2026-05-01T12:00:00.000Z",
          created_by: userId,
          customer_name: "Customer X",
          description: "Demo workspace",
          id: projectId,
          name: "Customer X MES demo",
          status: "active",
          updated_at: "2026-05-02T12:00:00.000Z",
          updated_by: userId,
        },
      ],
      error: null,
    });
    const projectsSelect = vi.fn().mockReturnValue({ order: projectsOrder });
    const membershipsEq = vi.fn().mockResolvedValue({
      data: [
        {
          project_id: projectId,
          role: "owner",
        },
      ],
      error: null,
    });
    const membershipsSelect = vi.fn().mockReturnValue({ eq: membershipsEq });
    const phaseStatesIn = vi.fn().mockResolvedValue({
      data: [
        {
          phase_key: "phase1",
          project_id: projectId,
          state_json: {
            currentStep: "review",
          },
          updated_at: "2026-05-02T12:00:00.000Z",
          updated_by: userId,
          version: 3,
        },
      ],
      error: null,
    });
    const phaseStatesEq = vi.fn().mockReturnValue({ in: phaseStatesIn });
    const phaseStatesSelect = vi.fn().mockReturnValue({ eq: phaseStatesEq });
    const from = vi.fn((table: string) =>
      table === "projects"
        ? { select: projectsSelect }
        : table === "project_memberships"
          ? { select: membershipsSelect }
          : { select: phaseStatesSelect },
    );

    createClientMock.mockResolvedValueOnce({
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    await expect(listProjectsForUser(userId)).resolves.toMatchObject({
      data: [
        {
          currentUserRole: "owner",
          customerName: "Customer X",
          id: projectId,
          name: "Customer X MES demo",
          phase1CurrentStep: "review",
        },
      ],
      ok: true,
    });
    expect(phaseStatesIn).toHaveBeenCalledWith("project_id", [projectId]);
  });

  it("creates a project with user audit fields", async () => {
    requireUserMock.mockResolvedValueOnce({
      data: {
        email: "owner@example.com",
        emailConfirmedAt: "2026-05-01T12:00:00.000Z",
        id: userId,
      },
      ok: true,
      status: "success",
    });

    const insert = vi.fn().mockResolvedValue({
      error: null,
    });
    const single = vi.fn().mockResolvedValue({
      data: {
        archived_at: null,
        created_at: "2026-05-01T12:00:00.000Z",
        created_by: userId,
        customer_name: "Customer X",
        description: "Demo workspace",
        id: projectId,
        name: "Customer X MES demo",
        status: "active",
        updated_at: "2026-05-01T12:00:00.000Z",
        updated_by: userId,
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi
      .fn()
      .mockReturnValueOnce({ insert })
      .mockReturnValueOnce({ select });

    createClientMock.mockResolvedValueOnce({
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    await expect(
      createProjectForUser(
        {
          customerName: " Customer X ",
          description: " Demo workspace ",
          name: " Customer X MES demo ",
        },
        userId,
      ),
    ).resolves.toMatchObject({
      data: {
        createdBy: userId,
        customerName: "Customer X",
        description: "Demo workspace",
        name: "Customer X MES demo",
      },
      ok: true,
    });
    expect(insert).toHaveBeenCalledWith({
      created_by: userId,
      customer_name: "Customer X",
      description: "Demo workspace",
      id: expect.any(String),
      name: "Customer X MES demo",
      updated_by: userId,
    });
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

  it("lists recent project activity for project members", async () => {
    mockAuthenticatedUser();
    mockCapabilityAllowed();

    const limit = vi.fn().mockResolvedValue({
      data: [
        {
          actor_id: userId,
          created_at: "2026-05-12T10:00:00.000Z",
          event_payload: { name: "Customer X MES demo" },
          event_type: "project_metadata_updated",
          id: "33333333-3333-4333-8333-333333333333",
          project_id: projectId,
        },
      ],
      error: null,
    });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    createClientMock.mockResolvedValueOnce({
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    await expect(listProjectActivity(projectId, userId, 6)).resolves.toMatchObject({
      data: [
        {
          actorId: userId,
          eventType: "project_metadata_updated",
          payload: { name: "Customer X MES demo" },
        },
      ],
      ok: true,
    });
    expect(requireProjectCapabilityMock).toHaveBeenCalledWith(
      projectId,
      "read_project",
    );
    expect(limit).toHaveBeenCalledWith(6);
  });

  it("saves project file metadata for editors", async () => {
    requireUserMock.mockResolvedValueOnce({
      data: {
        email: "editor@example.com",
        emailConfirmedAt: "2026-05-01T12:00:00.000Z",
        id: userId,
      },
      ok: true,
      status: "success",
    });
    requireProjectCapabilityMock.mockResolvedValueOnce({
      data: {
        email: "editor@example.com",
        emailConfirmedAt: "2026-05-01T12:00:00.000Z",
        id: userId,
      },
      ok: true,
      status: "success",
    });

    const single = vi.fn().mockResolvedValue({
      data: {
        checksum: "abc123",
        created_at: "2026-05-10T12:00:00.000Z",
        filename: "Customer X.xlsx",
        id: "33333333-3333-4333-8333-333333333333",
        mime_type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        project_id: projectId,
        size_bytes: 1024,
        source_metadata_json: {
          rowCount: 12,
        },
        storage_path: `db-backed://projects/${projectId}/source/abc123.xlsx`,
        uploaded_by: userId,
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });

    createClientMock.mockResolvedValueOnce({
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    await expect(
      saveProjectFileMetadata(
        {
          checksum: "abc123",
          filename: "Customer X.xlsx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          projectId,
          sizeBytes: 1024,
          sourceMetadata: {
            rowCount: 12,
          },
          storagePath: `db-backed://projects/${projectId}/source/abc123.xlsx`,
        },
        userId,
      ),
    ).resolves.toMatchObject({
      data: {
        checksum: "abc123",
        filename: "Customer X.xlsx",
        projectId,
        uploadedBy: userId,
      },
      ok: true,
    });
    expect(requireProjectCapabilityMock).toHaveBeenCalledWith(
      projectId,
      "upload_project_file",
    );
    expect(insert).toHaveBeenCalledWith({
      checksum: "abc123",
      filename: "Customer X.xlsx",
      mime_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      project_id: projectId,
      size_bytes: 1024,
      source_metadata_json: {
        rowCount: 12,
      },
      storage_path: `db-backed://projects/${projectId}/source/abc123.xlsx`,
      uploaded_by: userId,
    });
  });

  it("deletes only the current user's uploaded file metadata during upload cleanup", async () => {
    requireUserMock.mockResolvedValueOnce({
      data: {
        email: "editor@example.com",
        emailConfirmedAt: "2026-05-01T12:00:00.000Z",
        id: userId,
      },
      ok: true,
      status: "success",
    });
    requireProjectCapabilityMock.mockResolvedValueOnce({
      data: {
        email: "editor@example.com",
        emailConfirmedAt: "2026-05-01T12:00:00.000Z",
        id: userId,
      },
      ok: true,
      status: "success",
    });

    const uploadedByEq = vi.fn().mockResolvedValue({ error: null });
    const projectEq = vi.fn().mockReturnValue({ eq: uploadedByEq });
    const idEq = vi.fn().mockReturnValue({ eq: projectEq });
    const deleteMock = vi.fn().mockReturnValue({ eq: idEq });
    const from = vi.fn().mockReturnValue({ delete: deleteMock });

    createClientMock.mockResolvedValueOnce({
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const fileId = "33333333-3333-4333-8333-333333333333";

    await expect(
      deleteUploadedProjectFileMetadata(
        {
          fileId,
          projectId,
        },
        userId,
      ),
    ).resolves.toMatchObject({
      data: null,
      ok: true,
    });

    expect(requireProjectCapabilityMock).toHaveBeenCalledWith(
      projectId,
      "upload_project_file",
    );
    expect(deleteMock).toHaveBeenCalled();
    expect(idEq).toHaveBeenCalledWith("id", fileId);
    expect(projectEq).toHaveBeenCalledWith("project_id", projectId);
    expect(uploadedByEq).toHaveBeenCalledWith("uploaded_by", userId);
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
