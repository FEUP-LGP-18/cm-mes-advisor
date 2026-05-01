import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  requireProjectCapability,
  requireUser,
} from "./permissions.server";
import { sendInviteEmail } from "./email.server";
import { acceptInvite, createInvite, resendInvite, revokeInvite } from "./invites.server";

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("./permissions.server", () => ({
  requireProjectCapability: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("./email.server", () => ({
  sendInviteEmail: vi.fn(),
}));

vi.mock("./repository.server", () => ({
  recordProjectActivity: vi.fn(),
}));

const createClientMock = vi.mocked(createClient);
const createAdminClientMock = vi.mocked(createAdminClient);
const requireUserMock = vi.mocked(requireUser);
const requireProjectCapabilityMock = vi.mocked(requireProjectCapability);
const sendInviteEmailMock = vi.mocked(sendInviteEmail);

const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const inviteId = "33333333-3333-4333-8333-333333333333";
const email = "collaborator@example.com";
const appUrl = "http://localhost:3000";

describe("invites server module", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createInvite", () => {
    it("creates a pending invite and sends an email", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: "owner@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z", id: userId },
        ok: true,
        status: "success",
      });
      requireProjectCapabilityMock.mockResolvedValueOnce({
        data: { email: "owner@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z", id: userId },
        ok: true,
        status: "success",
      });

      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const eqStatus = vi.fn().mockReturnValue({ maybeSingle });
      const eqEmail = vi.fn().mockReturnValue({ eq: eqStatus });
      const eqProjectId = vi.fn().mockReturnValue({ eq: eqEmail });
      const selectExisting = vi.fn().mockReturnValue({ eq: eqProjectId });
      const fromExisting = vi.fn().mockReturnValue({ select: selectExisting });

      const single = vi.fn().mockResolvedValue({
        data: {
          created_at: "2026-04-30T12:00:00.000Z",
          email,
          expires_at: "2026-05-07T12:00:00.000Z",
          id: inviteId,
          invited_by: userId,
          project_id: projectId,
          role: "editor",
          status: "pending",
          updated_at: "2026-04-30T12:00:00.000Z",
        },
        error: null,
      });
      const selectInsert = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select: selectInsert });
      const fromInsert = vi.fn().mockReturnValue({ insert });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn((table) => {
          if (table === "project_invites") {
             return {
               select: selectExisting,
               insert,
             };
          }
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await createInvite(projectId, email, "editor", appUrl);

      expect(result).toMatchObject({
        ok: true,
        status: "success",
        data: {
          email,
          id: inviteId,
          role: "editor",
          status: "pending",
        },
      });

      expect(sendInviteEmailMock).toHaveBeenCalledWith(
        email,
        expect.stringContaining(`${appUrl}/invites/`),
      );
    });

    it("fails closed when the user lacks owner capabilities", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: "owner@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z", id: userId },
        ok: true,
        status: "success",
      });
      requireProjectCapabilityMock.mockResolvedValueOnce({
        message: "Forbidden",
        ok: false,
        status: "forbidden",
      });

      const result = await createInvite(projectId, email, "editor", appUrl);
      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(createClientMock).not.toHaveBeenCalled();
    });
  });

  describe("acceptInvite", () => {
    it("fails when the authenticated user email does not match the invite email", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: "wrong@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z", id: userId },
        ok: true,
        status: "success",
      });

      const maybeSingle = vi.fn().mockResolvedValue({
        data: {
          email: "collaborator@example.com",
          expires_at: "2099-05-07T12:00:00.000Z",
          id: inviteId,
          project_id: projectId,
          status: "pending",
        },
        error: null,
      });
      const eqTokenHash = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq: eqTokenHash });

      createAdminClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createAdminClient>>);

      const result = await acceptInvite("some-token");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(result).toMatchObject({ message: expect.stringContaining("different email") });
    });

    it("upserts membership to handle role upgrades and atomically updates status", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: "collaborator@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z", id: userId },
        ok: true,
        status: "success",
      });

      const maybeSingleInvite = vi.fn().mockResolvedValue({
        data: {
          email: "collaborator@example.com",
          expires_at: "2099-05-07T12:00:00.000Z",
          id: inviteId,
          project_id: projectId,
          role: "owner",
          status: "pending",
        },
        error: null,
      });
      const eqTokenHash = vi.fn().mockReturnValue({ maybeSingle: maybeSingleInvite });
      const selectInvite = vi.fn().mockReturnValue({ eq: eqTokenHash });

      const upsertMembership = vi.fn().mockResolvedValue({ error: null });

      const maybeSingleUpdate = vi.fn().mockResolvedValue({
        data: {
          email: "collaborator@example.com",
          id: inviteId,
          project_id: projectId,
          role: "owner",
          status: "accepted",
        },
        error: null,
      });
      const selectUpdate = vi.fn().mockReturnValue({ maybeSingle: maybeSingleUpdate });
      const eqStatusPending = vi.fn().mockReturnValue({ select: selectUpdate });
      const eqId = vi.fn().mockReturnValue({ eq: eqStatusPending });
      const updateInvite = vi.fn().mockReturnValue({ eq: eqId });

      const insertActivity = vi.fn().mockResolvedValue({ error: null });

      createAdminClientMock.mockResolvedValueOnce({
        from: vi.fn((table) => {
          if (table === "project_invites") {
            return {
              select: selectInvite,
              update: updateInvite,
            };
          }
          if (table === "project_memberships") {
            return {
              upsert: upsertMembership,
            };
          }
          if (table === "project_activity_events") {
            return {
              insert: insertActivity,
            };
          }
        }),
      } as unknown as Awaited<ReturnType<typeof createAdminClient>>);

      const result = await acceptInvite("valid-token");

      expect(result.ok).toBe(true);
      expect(result.status).toBe("success");
      
      expect(upsertMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: projectId,
          user_id: userId,
          role: "owner",
        }),
        { onConflict: "project_id, user_id" }
      );

      expect(eqStatusPending).toHaveBeenCalledWith("status", "pending");
    });

    it("returns conflict if the invite was already processed (race condition)", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: "collaborator@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z", id: userId },
        ok: true,
        status: "success",
      });

      const maybeSingleInvite = vi.fn().mockResolvedValue({
        data: {
          email: "collaborator@example.com",
          expires_at: "2099-05-07T12:00:00.000Z",
          id: inviteId,
          project_id: projectId,
          role: "owner",
          status: "pending",
        },
        error: null,
      });
      const eqTokenHash = vi.fn().mockReturnValue({ maybeSingle: maybeSingleInvite });
      const selectInvite = vi.fn().mockReturnValue({ eq: eqTokenHash });

      const upsertMembership = vi.fn().mockResolvedValue({ error: null });

      const maybeSingleUpdate = vi.fn().mockResolvedValue({
        data: null, // No row returned because status was no longer pending
        error: null,
      });
      const selectUpdate = vi.fn().mockReturnValue({ maybeSingle: maybeSingleUpdate });
      const eqStatusPending = vi.fn().mockReturnValue({ select: selectUpdate });
      const eqId = vi.fn().mockReturnValue({ eq: eqStatusPending });
      const updateInvite = vi.fn().mockReturnValue({ eq: eqId });

      createAdminClientMock.mockResolvedValueOnce({
        from: vi.fn((table) => {
          if (table === "project_invites") {
            return {
              select: selectInvite,
              update: updateInvite,
            };
          }
          if (table === "project_memberships") {
            return {
              upsert: upsertMembership,
            };
          }
        }),
      } as unknown as Awaited<ReturnType<typeof createAdminClient>>);

      const result = await acceptInvite("valid-token");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("conflict");
      expect(result).toMatchObject({ message: expect.stringContaining("already been processed") });
    });
  });
});
