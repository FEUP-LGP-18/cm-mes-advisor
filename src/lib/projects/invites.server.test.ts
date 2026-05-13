import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  requireProjectCapability,
  requireUser,
} from "./permissions.server";
import { sendInviteEmail } from "./email.server";
import { acceptInvite, createInvite, getInviteDetails, listInvites, resendInvite, revokeInvite } from "./invites.server";

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

    it("returns not_authenticated when the caller is not signed in", async () => {
      requireUserMock.mockResolvedValueOnce({
        ok: false,
        status: "not_authenticated",
        message: "Authentication required.",
      });

      const result = await createInvite(projectId, email, "editor", appUrl);
      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_authenticated");
      expect(requireProjectCapabilityMock).not.toHaveBeenCalled();
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns validation_error for a malformed email address", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: "owner@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z", id: userId },
        ok: true,
        status: "success",
      });
      // requireProjectCapability is never reached — the email check fires first.

      const result = await createInvite(projectId, "not-an-email", "editor", appUrl);
      expect(result.ok).toBe(false);
      expect(result.status).toBe("validation_error");
      expect(requireProjectCapabilityMock).not.toHaveBeenCalled();
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns validation_error when the email is missing", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: "owner@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z", id: userId },
        ok: true,
        status: "success",
      });

      const result = await createInvite(projectId, undefined as never, "editor", appUrl);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("validation_error");
      expect(requireProjectCapabilityMock).not.toHaveBeenCalled();
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns conflict when a duplicate pending invite wins the insert race", async () => {
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

      const single = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "23505",
          message: "duplicate key value violates unique constraint",
        },
      });
      const selectInsert = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select: selectInsert });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn((table) => {
          if (table === "project_invites") {
            return {
              insert,
              select: selectExisting,
            };
          }
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await createInvite(projectId, email, "editor", appUrl);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("conflict");
      expect(result).toMatchObject({
        message: "A pending invite already exists for this email.",
      });
      expect(sendInviteEmailMock).not.toHaveBeenCalled();
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

    it("calls the accept_project_invite RPC and returns the updated invite", async () => {
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

      const acceptedRow = {
        accepted_at: "2026-05-01T12:00:00.000Z",
        created_at: "2026-04-30T12:00:00.000Z",
        email: "collaborator@example.com",
        expires_at: "2099-05-07T12:00:00.000Z",
        id: inviteId,
        invited_by: userId,
        project_id: projectId,
        revoked_at: null,
        role: "owner",
        status: "accepted",
        updated_at: "2026-05-01T12:00:00.000Z",
      };
      const rpc = vi.fn().mockResolvedValue({ data: [acceptedRow], error: null });

      const insertActivity = vi.fn().mockResolvedValue({ error: null });

      createAdminClientMock.mockResolvedValueOnce({
        from: vi.fn((table) => {
          if (table === "project_invites") return { select: selectInvite };
          if (table === "project_activity_events") return { insert: insertActivity };
        }),
        rpc,
      } as unknown as Awaited<ReturnType<typeof createAdminClient>>);

      const result = await acceptInvite("valid-token");

      expect(result.ok).toBe(true);
      expect(result.status).toBe("success");
      expect(rpc).toHaveBeenCalledWith("accept_project_invite", {
        p_invite_id: inviteId,
        p_user_id: userId,
      });
      expect(insertActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: "user_joined",
          event_payload: expect.objectContaining({ email: "collaborator@example.com", role: "owner" }),
        }),
      );
    });

    it("returns conflict when the RPC returns an empty set (race condition)", async () => {
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

      // RPC returns empty array: invite was accepted by a concurrent request
      const rpc = vi.fn().mockResolvedValue({ data: [], error: null });

      createAdminClientMock.mockResolvedValueOnce({
        from: vi.fn((table) => {
          if (table === "project_invites") return { select: selectInvite };
        }),
        rpc,
      } as unknown as Awaited<ReturnType<typeof createAdminClient>>);

      const result = await acceptInvite("valid-token");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("conflict");
      expect(result).toMatchObject({ message: expect.stringContaining("already been processed") });
    });

    it("fails when the authenticated user has no email address", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: null, emailConfirmedAt: null, id: userId },
        ok: true,
        status: "success",
      });

      const result = await acceptInvite("some-token");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(createAdminClientMock).not.toHaveBeenCalled();
    });

    it("fails when the authenticated user email is not confirmed", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: "collaborator@example.com", emailConfirmedAt: null, id: userId },
        ok: true,
        status: "success",
      });

      const result = await acceptInvite("some-token");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(result).toMatchObject({ message: expect.stringContaining("confirm your email") });
      expect(createAdminClientMock).not.toHaveBeenCalled();
    });

    it("returns not_found for an invalid or unknown token", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: "collaborator@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z", id: userId },
        ok: true,
        status: "success",
      });

      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const eqTokenHash = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq: eqTokenHash });

      createAdminClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createAdminClient>>);

      const result = await acceptInvite("bad-token");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_found");
    });

    it("lazily marks an expired invite and returns forbidden", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: "collaborator@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z", id: userId },
        ok: true,
        status: "success",
      });

      const maybeSingle = vi.fn().mockResolvedValue({
        data: {
          email: "collaborator@example.com",
          expires_at: "2020-01-01T00:00:00.000Z",
          id: inviteId,
          project_id: projectId,
          role: "editor",
          status: "pending",
        },
        error: null,
      });
      const eqTokenHash = vi.fn().mockReturnValue({ maybeSingle });
      const selectInvite = vi.fn().mockReturnValue({ eq: eqTokenHash });

      const eqId = vi.fn().mockResolvedValue({ error: null });
      const updateExpired = vi.fn().mockReturnValue({ eq: eqId });

      createAdminClientMock.mockResolvedValueOnce({
        from: vi.fn((table) => {
          if (table === "project_invites") {
            return { select: selectInvite, update: updateExpired };
          }
        }),
      } as unknown as Awaited<ReturnType<typeof createAdminClient>>);

      const result = await acceptInvite("expired-token");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(result).toMatchObject({ message: expect.stringContaining("expired") });
      expect(updateExpired).toHaveBeenCalledWith({ status: "expired" });
    });
  });

  describe("revokeInvite", () => {
    it("marks a pending invite as revoked", async () => {
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

      const revokedRow = {
        accepted_at: null,
        created_at: "2026-04-30T12:00:00.000Z",
        email,
        expires_at: "2026-05-07T12:00:00.000Z",
        id: inviteId,
        invited_by: userId,
        project_id: projectId,
        revoked_at: "2026-05-01T12:00:00.000Z",
        role: "editor",
        status: "revoked",
        updated_at: "2026-05-01T12:00:00.000Z",
      };

      const maybeSingle = vi.fn().mockResolvedValue({ data: revokedRow, error: null });
      const selectRevoke = vi.fn().mockReturnValue({ maybeSingle });
      const eqStatusPending = vi.fn().mockReturnValue({ select: selectRevoke });
      const eqProjectId = vi.fn().mockReturnValue({ eq: eqStatusPending });
      const eqId = vi.fn().mockReturnValue({ eq: eqProjectId });
      const update = vi.fn().mockReturnValue({ eq: eqId });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await revokeInvite(inviteId, projectId);

      expect(result.ok).toBe(true);
      expect(result.status).toBe("success");
      expect(result).toMatchObject({ data: { status: "revoked", id: inviteId } });
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "revoked" }),
      );
    });

    it("returns not_found when no pending invite matches", async () => {
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
      const selectRevoke = vi.fn().mockReturnValue({ maybeSingle });
      const eqStatusPending = vi.fn().mockReturnValue({ select: selectRevoke });
      const eqProjectId = vi.fn().mockReturnValue({ eq: eqStatusPending });
      const eqId = vi.fn().mockReturnValue({ eq: eqProjectId });
      const update = vi.fn().mockReturnValue({ eq: eqId });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await revokeInvite(inviteId, projectId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_found");
    });

    it("fails closed when the user lacks owner capabilities", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: "editor@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z", id: userId },
        ok: true,
        status: "success",
      });
      requireProjectCapabilityMock.mockResolvedValueOnce({
        message: "Forbidden",
        ok: false,
        status: "forbidden",
      });

      const result = await revokeInvite(inviteId, projectId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns not_authenticated when the caller is not signed in", async () => {
      requireUserMock.mockResolvedValueOnce({
        ok: false,
        status: "not_authenticated",
        message: "Authentication required.",
      });

      const result = await revokeInvite(inviteId, projectId);
      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_authenticated");
      expect(createClientMock).not.toHaveBeenCalled();
    });
  });

  describe("resendInvite", () => {
    it("rotates the token, extends expiry, and resends email", async () => {
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

      const existingRow = {
        created_at: "2026-04-30T12:00:00.000Z",
        email,
        expires_at: "2026-05-07T12:00:00.000Z",
        id: inviteId,
        invited_by: userId,
        project_id: projectId,
        role: "editor",
        status: "pending",
        updated_at: "2026-04-30T12:00:00.000Z",
      };

      const maybeSingleFetch = vi.fn().mockResolvedValue({ data: existingRow, error: null });
      const eqStatusFetch = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFetch });
      const eqProjectFetch = vi.fn().mockReturnValue({ eq: eqStatusFetch });
      const eqIdFetch = vi.fn().mockReturnValue({ eq: eqProjectFetch });
      const selectFetch = vi.fn().mockReturnValue({ eq: eqIdFetch });

      const updatedRow = { ...existingRow, expires_at: "2026-05-08T12:00:00.000Z" };
      const maybeSingleUpdate = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
      const selectUpdate = vi.fn().mockReturnValue({ maybeSingle: maybeSingleUpdate });
      const eqStatusUpdate = vi.fn().mockReturnValue({ select: selectUpdate });
      const eqProjectUpdate = vi.fn().mockReturnValue({ eq: eqStatusUpdate });
      const eqIdUpdate = vi.fn().mockReturnValue({ eq: eqProjectUpdate });
      const update = vi.fn().mockReturnValue({ eq: eqIdUpdate });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select: selectFetch, update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await resendInvite(inviteId, projectId, appUrl);

      expect(result.ok).toBe(true);
      expect(result.status).toBe("success");
      expect(sendInviteEmailMock).toHaveBeenCalledWith(
        email,
        expect.stringContaining(`${appUrl}/invites/`),
      );
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ token_hash: expect.any(String) }),
      );
    });

    it("returns not_found when the pending invite does not exist", async () => {
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

      const maybeSingleFetch = vi.fn().mockResolvedValue({ data: null, error: null });
      const eqStatusFetch = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFetch });
      const eqProjectFetch = vi.fn().mockReturnValue({ eq: eqStatusFetch });
      const eqIdFetch = vi.fn().mockReturnValue({ eq: eqProjectFetch });
      const selectFetch = vi.fn().mockReturnValue({ eq: eqIdFetch });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select: selectFetch }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await resendInvite(inviteId, projectId, appUrl);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_found");
      expect(sendInviteEmailMock).not.toHaveBeenCalled();
    });

    it("returns conflict when the invite is modified between fetch and update", async () => {
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

      const existingRow = {
        created_at: "2026-04-30T12:00:00.000Z",
        email,
        expires_at: "2026-05-07T12:00:00.000Z",
        id: inviteId,
        invited_by: userId,
        project_id: projectId,
        role: "editor",
        status: "pending",
        updated_at: "2026-04-30T12:00:00.000Z",
      };

      const maybeSingleFetch = vi.fn().mockResolvedValue({ data: existingRow, error: null });
      const eqStatusFetch = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFetch });
      const eqProjectFetch = vi.fn().mockReturnValue({ eq: eqStatusFetch });
      const eqIdFetch = vi.fn().mockReturnValue({ eq: eqProjectFetch });
      const selectFetch = vi.fn().mockReturnValue({ eq: eqIdFetch });

      // Update matched zero rows (invite was revoked between fetch and update)
      const maybeSingleUpdate = vi.fn().mockResolvedValue({ data: null, error: null });
      const selectUpdate = vi.fn().mockReturnValue({ maybeSingle: maybeSingleUpdate });
      const eqStatusUpdate = vi.fn().mockReturnValue({ select: selectUpdate });
      const eqProjectUpdate = vi.fn().mockReturnValue({ eq: eqStatusUpdate });
      const eqIdUpdate = vi.fn().mockReturnValue({ eq: eqProjectUpdate });
      const update = vi.fn().mockReturnValue({ eq: eqIdUpdate });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select: selectFetch, update }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await resendInvite(inviteId, projectId, appUrl);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("conflict");
      expect(sendInviteEmailMock).not.toHaveBeenCalled();
    });

    it("returns not_authenticated when the caller is not signed in", async () => {
      requireUserMock.mockResolvedValueOnce({
        ok: false,
        status: "not_authenticated",
        message: "Authentication required.",
      });

      const result = await resendInvite(inviteId, projectId, appUrl);
      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_authenticated");
      expect(createClientMock).not.toHaveBeenCalled();
    });
  });

  describe("getInviteDetails", () => {
    it("returns invite details for a valid pending token", async () => {
      const pendingRow = {
        accepted_at: null,
        created_at: "2026-04-30T12:00:00.000Z",
        email,
        expires_at: "2099-05-07T12:00:00.000Z",
        id: inviteId,
        invited_by: userId,
        project_id: projectId,
        revoked_at: null,
        role: "editor",
        status: "pending",
        updated_at: "2026-04-30T12:00:00.000Z",
      };

      const maybeSingle = vi.fn().mockResolvedValue({ data: pendingRow, error: null });
      const eqTokenHash = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq: eqTokenHash });

      createAdminClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createAdminClient>>);

      const result = await getInviteDetails("valid-token");

      expect(result.ok).toBe(true);
      expect(result.status).toBe("success");
      expect(result).toMatchObject({ data: { email, role: "editor", status: "pending" } });
    });

    it("returns not_found for an unknown token", async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const eqTokenHash = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq: eqTokenHash });

      createAdminClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createAdminClient>>);

      const result = await getInviteDetails("unknown-token");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_found");
    });

    it("returns forbidden for a non-pending invite", async () => {
      const acceptedRow = {
        email,
        expires_at: "2099-05-07T12:00:00.000Z",
        id: inviteId,
        project_id: projectId,
        status: "accepted",
      };

      const maybeSingle = vi.fn().mockResolvedValue({ data: acceptedRow, error: null });
      const eqTokenHash = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq: eqTokenHash });

      createAdminClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createAdminClient>>);

      const result = await getInviteDetails("used-token");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(result).toMatchObject({ message: expect.stringContaining("no longer active") });
    });

    it("returns forbidden for an expired invite", async () => {
      const expiredRow = {
        email,
        expires_at: "2020-01-01T00:00:00.000Z",
        id: inviteId,
        project_id: projectId,
        status: "pending",
      };

      const maybeSingle = vi.fn().mockResolvedValue({ data: expiredRow, error: null });
      const eqTokenHash = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq: eqTokenHash });

      createAdminClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createAdminClient>>);

      const result = await getInviteDetails("expired-token");

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(result).toMatchObject({ message: expect.stringContaining("expired") });
    });
  });

  describe("listInvites", () => {
    it("returns all invites for the project ordered by created_at desc", async () => {
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

      const rows = [
        {
          accepted_at: null,
          created_at: "2026-05-01T12:00:00.000Z",
          email: "b@example.com",
          expires_at: "2026-05-08T12:00:00.000Z",
          id: inviteId,
          invited_by: userId,
          project_id: projectId,
          revoked_at: null,
          role: "viewer",
          status: "pending",
          updated_at: "2026-05-01T12:00:00.000Z",
        },
      ];

      const order = vi.fn().mockResolvedValue({ data: rows, error: null });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });

      createClientMock.mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await listInvites(projectId);

      expect(result.ok).toBe(true);
      expect(result.status).toBe("success");
      if (!result.ok) throw new Error("expected success");
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("fails closed when the user lacks owner capabilities", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: "viewer@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z", id: userId },
        ok: true,
        status: "success",
      });
      requireProjectCapabilityMock.mockResolvedValueOnce({
        message: "Forbidden",
        ok: false,
        status: "forbidden",
      });

      const result = await listInvites(projectId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("forbidden");
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("returns not_authenticated when the caller is not signed in", async () => {
      requireUserMock.mockResolvedValueOnce({
        ok: false,
        status: "not_authenticated",
        message: "Authentication required.",
      });

      const result = await listInvites(projectId);
      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_authenticated");
      expect(createClientMock).not.toHaveBeenCalled();
    });
  });

  describe("createInvite — role validation", () => {
    it("rejects an invalid role before touching the database", async () => {
      requireUserMock.mockResolvedValueOnce({
        data: { email: "owner@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z", id: userId },
        ok: true,
        status: "success",
      });
      // requireProjectCapability is never reached — the role check fires first.

      const result = await createInvite(projectId, email, "superadmin" as never, appUrl);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("validation_error");
      expect(requireProjectCapabilityMock).not.toHaveBeenCalled();
      expect(createClientMock).not.toHaveBeenCalled();
    });
  });
});
