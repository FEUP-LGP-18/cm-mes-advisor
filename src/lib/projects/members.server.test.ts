import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  requireProjectCapability,
  requireUser,
} from "./permissions.server";
import { listMembers, removeMember, updateMemberRole } from "./members.server";

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("./permissions.server", () => ({
  requireProjectCapability: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("./repository.server", () => ({
  recordProjectActivity: vi.fn().mockResolvedValue({ ok: true }),
}));

const createClientMock = vi.mocked(createClient);
const createAdminClientMock = vi.mocked(createAdminClient);
const requireUserMock = vi.mocked(requireUser);
const requireProjectCapabilityMock = vi.mocked(requireProjectCapability);

const userId = "11111111-1111-4111-8111-111111111111";
const targetUserId = "44444444-4444-4444-8444-444444444444";
const projectId = "22222222-2222-4222-8222-222222222222";

const ownerSuccess = {
  data: {
    email: "owner@example.com",
    emailConfirmedAt: "2026-05-01T12:00:00.000Z",
    id: userId,
  },
  ok: true as const,
  status: "success" as const,
};

const memberRow = {
  created_at: "2026-04-01T10:00:00.000Z",
  role: "editor" as const,
  user_id: targetUserId,
};

function makeAdminClient(overrides?: {
  getUserById?: ReturnType<typeof vi.fn>;
}) {
  const getUserById =
    overrides?.getUserById ??
    vi.fn().mockResolvedValue({
      data: {
        user: {
          email: "member@example.com",
          user_metadata: { name: "Member Name" },
        },
      },
    });

  return {
    auth: { admin: { getUserById } },
  } as unknown as Awaited<ReturnType<typeof createAdminClient>>;
}

describe("members.server", () => {
  afterEach(() => vi.clearAllMocks());

  describe("listMembers", () => {
    it("returns mapped members with resolved profiles", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const order = vi.fn().mockResolvedValue({
        data: [memberRow],
        error: null,
      });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      createAdminClientMock.mockResolvedValueOnce(makeAdminClient());

      const result = await listMembers(projectId);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected success");
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        email: "member@example.com",
        name: "Member Name",
        role: "editor",
        userId: targetUserId,
        joinedAt: memberRow.created_at,
      });
    });

    it("handles a member whose auth profile is missing", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const order = vi.fn().mockResolvedValue({
        data: [memberRow],
        error: null,
      });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      createAdminClientMock.mockResolvedValueOnce(
        makeAdminClient({
          getUserById: vi.fn().mockResolvedValue({ data: { user: null } }),
        }),
      );

      const result = await listMembers(projectId);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected success");
      expect(result.data[0]).toMatchObject({ email: null, name: null });
    });

    it("returns not_authenticated when the caller is not signed in", async () => {
      requireUserMock.mockResolvedValueOnce({
        message: "Authentication required.",
        ok: false,
        status: "not_authenticated",
      });

      const result = await listMembers(projectId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_authenticated");
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns forbidden when the caller lacks manage_project_members", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce({
        message: "Project access denied.",
        ok: false,
        status: "forbidden",
      });

      const result = await listMembers(projectId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns internal_error on a database failure", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const order = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "DB failure" },
      });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await listMembers(projectId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("internal_error");
    });

    it("returns an empty list when the project has no memberships", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const order = vi.fn().mockResolvedValue({ data: [], error: null });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      createAdminClientMock.mockResolvedValueOnce(makeAdminClient());

      const result = await listMembers(projectId);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected success");
      expect(result.data).toHaveLength(0);
    });
  });

  describe("updateMemberRole", () => {
    it("updates the role and returns the updated member", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const updatedRow = { ...memberRow, role: "viewer" as const };
      const maybeSingle = vi.fn().mockResolvedValue({
        data: updatedRow,
        error: null,
      });
      const selectUpdate = vi.fn().mockReturnValue({ maybeSingle });
      const eqUser = vi.fn().mockReturnValue({ select: selectUpdate });
      const eqProject = vi.fn().mockReturnValue({ eq: eqUser });
      const update = vi.fn().mockReturnValue({ eq: eqProject });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      createAdminClientMock.mockResolvedValueOnce(makeAdminClient());

      const result = await updateMemberRole(projectId, targetUserId, "viewer");

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected success");
      expect(result.data.role).toBe("viewer");
      expect(update).toHaveBeenCalledWith({ role: "viewer" });
    });

    it("returns validation_error for an invalid role", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);

      const result = await updateMemberRole(
        projectId,
        targetUserId,
        "superadmin" as never,
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe("validation_error");
      expect(requireProjectCapabilityMock).not.toHaveBeenCalled();
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns conflict when the DB trigger blocks last-owner demotion", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Cannot demote the last project owner" },
      });
      const selectUpdate = vi.fn().mockReturnValue({ maybeSingle });
      const eqUser = vi.fn().mockReturnValue({ select: selectUpdate });
      const eqProject = vi.fn().mockReturnValue({ eq: eqUser });
      const update = vi.fn().mockReturnValue({ eq: eqProject });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await updateMemberRole(projectId, targetUserId, "editor");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("conflict");
      expect(result).toMatchObject({ message: expect.stringContaining("last project owner") });
    });

    it("returns not_found when the target member does not exist", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const selectUpdate = vi.fn().mockReturnValue({ maybeSingle });
      const eqUser = vi.fn().mockReturnValue({ select: selectUpdate });
      const eqProject = vi.fn().mockReturnValue({ eq: eqUser });
      const update = vi.fn().mockReturnValue({ eq: eqProject });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await updateMemberRole(projectId, targetUserId, "viewer");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_found");
    });

    it("returns not_authenticated when the caller is not signed in", async () => {
      requireUserMock.mockResolvedValueOnce({
        message: "Authentication required.",
        ok: false,
        status: "not_authenticated",
      });

      const result = await updateMemberRole(projectId, targetUserId, "viewer");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_authenticated");
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns forbidden when the caller lacks manage_project_members", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce({
        message: "Project access denied.",
        ok: false,
        status: "forbidden",
      });

      const result = await updateMemberRole(projectId, targetUserId, "viewer");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(createClientMock).not.toHaveBeenCalled();
    });
  });

  describe("removeMember", () => {
    it("removes the member and returns the userId", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const eqUser = vi.fn().mockResolvedValue({ error: null });
      const eqProject = vi.fn().mockReturnValue({ eq: eqUser });
      const del = vi.fn().mockReturnValue({ eq: eqProject });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ delete: del }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await removeMember(projectId, targetUserId);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected success");
      expect(result.data).toEqual({ userId: targetUserId });
      expect(del).toHaveBeenCalled();
    });

    it("returns conflict when the DB trigger blocks last-owner removal", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const eqUser = vi
        .fn()
        .mockResolvedValue({
          error: { message: "Cannot remove the last project owner" },
        });
      const eqProject = vi.fn().mockReturnValue({ eq: eqUser });
      const del = vi.fn().mockReturnValue({ eq: eqProject });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ delete: del }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await removeMember(projectId, targetUserId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("conflict");
      expect(result).toMatchObject({ message: expect.stringContaining("last project owner") });
    });

    it("returns not_authenticated when the caller is not signed in", async () => {
      requireUserMock.mockResolvedValueOnce({
        message: "Authentication required.",
        ok: false,
        status: "not_authenticated",
      });

      const result = await removeMember(projectId, targetUserId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_authenticated");
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns forbidden when the caller lacks manage_project_members", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce({
        message: "Project access denied.",
        ok: false,
        status: "forbidden",
      });

      const result = await removeMember(projectId, targetUserId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns internal_error on an unexpected database failure", async () => {
      requireUserMock.mockResolvedValueOnce(ownerSuccess);
      requireProjectCapabilityMock.mockResolvedValueOnce(ownerSuccess);

      const eqUser = vi.fn().mockResolvedValue({ error: { message: "DB error" } });
      const eqProject = vi.fn().mockReturnValue({ eq: eqUser });
      const del = vi.fn().mockReturnValue({ eq: eqProject });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ delete: del }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await removeMember(projectId, targetUserId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("internal_error");
    });
  });
});
