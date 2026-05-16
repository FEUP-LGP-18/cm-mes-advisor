import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { requireProjectCapability, requireUser } from "./permissions.server";
import {
  archiveProject,
  deleteProject,
  unarchiveProject,
  updateProjectMetadata,
} from "./settings.server";
import type { CurrentUser } from "./types";

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

vi.mock("./repository.server", () => ({
  recordProjectActivity: vi.fn().mockResolvedValue({ ok: true }),
}));

const createClientMock = vi.mocked(createClient);
const requireUserMock = vi.mocked(requireUser);
const requireProjectCapabilityMock = vi.mocked(requireProjectCapability);

const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";

const ownerUser: CurrentUser = {
  email: "owner@example.com",
  emailConfirmedAt: "2026-05-01T12:00:00.000Z",
  id: userId,
};

const ownerSuccess = {
  data: ownerUser,
  ok: true as const,
  status: "success" as const,
};

const activeProjectRow = {
  archived_at: null,
  created_at: "2026-05-01T12:00:00.000Z",
  created_by: userId,
  customer_name: "Customer X",
  description: "Demo workspace",
  id: projectId,
  name: "Customer X MES demo",
  status: "active" as const,
  updated_at: "2026-05-10T12:00:00.000Z",
  updated_by: userId,
};

const archivedProjectRow = {
  ...activeProjectRow,
  archived_at: "2026-05-11T10:00:00.000Z",
  status: "archived" as const,
};

type MockSupabaseError = { code?: string; message?: string };

function mockProjectDelete({
  deleteError = null,
  readData = { name: activeProjectRow.name },
  readError = null,
}: {
  deleteError?: MockSupabaseError | null;
  readData?: { name: string } | null;
  readError?: MockSupabaseError | null;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: readData,
    error: readError,
  });
  const readEq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq: readEq });
  const deleteNameEq = vi.fn().mockResolvedValue({ error: deleteError });
  const deleteIdEq = vi.fn().mockReturnValue({ eq: deleteNameEq });
  const del = vi.fn().mockReturnValue({ eq: deleteIdEq });
  const from = vi.fn().mockReturnValue({ delete: del, select });

  createClientMock.mockResolvedValueOnce({
    from,
  } as unknown as Awaited<ReturnType<typeof createClient>>);

  return { del, deleteIdEq, deleteNameEq, maybeSingle, readEq, select };
}

describe("settings.server", () => {
  afterEach(() => vi.clearAllMocks());

  // ---------------------------------------------------------------------------
  // updateProjectMetadata
  // ---------------------------------------------------------------------------

  describe("updateProjectMetadata", () => {
    it("updates name, customer name, and description for an owner", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const updatedRow = {
        ...activeProjectRow,
        name: "Renamed project",
        customer_name: "New Customer",
        description: "Updated description",
      };
      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: updatedRow, error: null });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await updateProjectMetadata(projectId, {
        name: " Renamed project ",
        customerName: " New Customer ",
        description: " Updated description ",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected success");
      expect(result.data.name).toBe("Renamed project");
      expect(result.data.customerName).toBe("New Customer");
      expect(result.data.description).toBe("Updated description");
      expect(requireProjectCapabilityMock).toHaveBeenCalledWith(
        projectId,
        "manage_project_settings",
      );
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Renamed project",
          customer_name: "New Customer",
          description: "Updated description",
          updated_by: userId,
        }),
      );
    });

    it("trims whitespace and stores null for blank optional fields", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const updatedRow = {
        ...activeProjectRow,
        customer_name: null,
        description: null,
      };
      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: updatedRow, error: null });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await updateProjectMetadata(projectId, {
        name: "Customer X MES demo",
        customerName: "   ",
        description: "",
      });

      expect(result.ok).toBe(true);
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ customer_name: null, description: null }),
      );
    });

    it("returns validation_error when name is blank", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const result = await updateProjectMetadata(projectId, {
        name: "   ",
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe("validation_error");
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns not_found when the project does not exist", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await updateProjectMetadata(projectId, {
        name: "New name",
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_found");
    });

    it("returns not_authenticated when the caller is not signed in", async () => {
      requireUserMock.mockResolvedValueOnce({
        message: "Authentication required.",
        ok: false,
        status: "not_authenticated",
      });

      const result = await updateProjectMetadata(projectId, { name: "Name" });

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_authenticated");
      expect(requireProjectCapabilityMock).not.toHaveBeenCalled();
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns forbidden when caller lacks manage_project_settings", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce({
        message: "Project access denied.",
        ok: false,
        status: "forbidden",
      });

      const result = await updateProjectMetadata(projectId, { name: "Name" });

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(requireProjectCapabilityMock).toHaveBeenCalledWith(
        projectId,
        "manage_project_settings",
      );
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("surfaces a database error as internal_error", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "500", message: "DB error" },
      });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await updateProjectMetadata(projectId, { name: "Name" });

      expect(result.ok).toBe(false);
      expect(result.status).toBe("internal_error");
    });
  });

  // ---------------------------------------------------------------------------
  // archiveProject
  // ---------------------------------------------------------------------------

  describe("archiveProject", () => {
    it("archives an active project and returns the updated record", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: archivedProjectRow, error: null });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const statusEq = vi.fn().mockReturnValue({ select });
      const idEq = vi.fn().mockReturnValue({ eq: statusEq });
      const update = vi.fn().mockReturnValue({ eq: idEq });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await archiveProject(projectId);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected success");
      expect(result.data.status).toBe("archived");
      expect(result.data.archivedAt).not.toBeNull();
      expect(requireProjectCapabilityMock).toHaveBeenCalledWith(
        projectId,
        "archive_project",
      );
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "archived", updated_by: userId }),
      );
    });

    it("returns not_found when the project is already archived or missing", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const statusEq = vi.fn().mockReturnValue({ select });
      const idEq = vi.fn().mockReturnValue({ eq: statusEq });
      const update = vi.fn().mockReturnValue({ eq: idEq });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await archiveProject(projectId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_found");
    });

    it("returns not_authenticated when caller is not signed in", async () => {
      requireUserMock.mockResolvedValueOnce({
        message: "Authentication required.",
        ok: false,
        status: "not_authenticated",
      });

      const result = await archiveProject(projectId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_authenticated");
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns forbidden when caller lacks archive_project", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce({
        message: "Project access denied.",
        ok: false,
        status: "forbidden",
      });

      const result = await archiveProject(projectId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(requireProjectCapabilityMock).toHaveBeenCalledWith(
        projectId,
        "archive_project",
      );
      expect(createClientMock).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // unarchiveProject
  // ---------------------------------------------------------------------------

  describe("unarchiveProject", () => {
    it("restores an archived project to active", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: activeProjectRow, error: null });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const statusEq = vi.fn().mockReturnValue({ select });
      const idEq = vi.fn().mockReturnValue({ eq: statusEq });
      const update = vi.fn().mockReturnValue({ eq: idEq });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await unarchiveProject(projectId);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected success");
      expect(result.data.status).toBe("active");
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          archived_at: null,
          status: "active",
          updated_by: userId,
        }),
      );
    });

    it("returns not_found when the project is not archived", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const statusEq = vi.fn().mockReturnValue({ select });
      const idEq = vi.fn().mockReturnValue({ eq: statusEq });
      const update = vi.fn().mockReturnValue({ eq: idEq });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await unarchiveProject(projectId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_found");
    });

    it("returns forbidden when caller lacks archive_project", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce({
        message: "Project access denied.",
        ok: false,
        status: "forbidden",
      });

      const result = await unarchiveProject(projectId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(createClientMock).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // deleteProject
  // ---------------------------------------------------------------------------

  describe("deleteProject", () => {
    it("deletes the project and returns the project id", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const { del, deleteIdEq, deleteNameEq } = mockProjectDelete();

      const result = await deleteProject(projectId, activeProjectRow.name);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected success");
      expect(result.data.projectId).toBe(projectId);
      expect(requireProjectCapabilityMock).toHaveBeenCalledWith(
        projectId,
        "delete_project",
      );
      expect(del).toHaveBeenCalled();
      expect(deleteIdEq).toHaveBeenCalledWith("id", projectId);
      expect(deleteNameEq).toHaveBeenCalledWith("name", activeProjectRow.name);
    });

    it("returns validation_error for a non-UUID project id", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);

      const result = await deleteProject("not-a-uuid", activeProjectRow.name);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("validation_error");
      expect(requireProjectCapabilityMock).not.toHaveBeenCalled();
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns not_authenticated when the caller is not signed in", async () => {
      requireUserMock.mockResolvedValueOnce({
        message: "Authentication required.",
        ok: false,
        status: "not_authenticated",
      });

      const result = await deleteProject(projectId, activeProjectRow.name);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_authenticated");
      expect(requireProjectCapabilityMock).not.toHaveBeenCalled();
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns forbidden when caller lacks delete_project", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce({
        message: "Project access denied.",
        ok: false,
        status: "forbidden",
      });

      const result = await deleteProject(projectId, activeProjectRow.name);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(requireProjectCapabilityMock).toHaveBeenCalledWith(
        projectId,
        "delete_project",
      );
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns validation_error when the project name confirmation is blank", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const result = await deleteProject(projectId, "   ");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("validation_error");
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns validation_error when the project name confirmation does not match", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const { del } = mockProjectDelete();

      const result = await deleteProject(projectId, "Different project");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("validation_error");
      expect(del).not.toHaveBeenCalled();
    });

    it("returns not_found when the project is missing before delete", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const { del } = mockProjectDelete({ readData: null });

      const result = await deleteProject(projectId, activeProjectRow.name);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_found");
      expect(del).not.toHaveBeenCalled();
    });

    it("returns conflict when the DB blocks deletion of a sole-owner project", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      mockProjectDelete({
        deleteError: { message: "Cannot remove the last owner" },
      });

      const result = await deleteProject(projectId, activeProjectRow.name);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("conflict");
    });

    it("returns internal_error on an unexpected database failure", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      mockProjectDelete({
        deleteError: { code: "500", message: "Unexpected DB error" },
      });

      const result = await deleteProject(projectId, activeProjectRow.name);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("internal_error");
    });
  });
});
