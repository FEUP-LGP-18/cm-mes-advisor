import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import {
  requireProjectCapability,
  requireUser,
} from "./permissions.server";
import {
  createProjectForUser,
  listProjectsForUser,
  saveProjectFileMetadata,
  saveProjectPhaseState,
} from "./repository.server";

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
    const from = vi.fn((table: string) =>
      table === "projects"
        ? { select: projectsSelect }
        : { select: membershipsSelect },
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
        },
      ],
      ok: true,
    });
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
});
