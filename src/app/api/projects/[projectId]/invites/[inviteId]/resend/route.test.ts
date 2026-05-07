import { afterEach, describe, expect, it, vi } from "vitest";
import { resendInvite } from "@/lib/projects/invites.server";
import { POST } from "./route";

vi.mock("@/lib/projects/invites.server", () => ({
  resendInvite: vi.fn(),
}));

const resendInviteMock = vi.mocked(resendInvite);

const projectId = "22222222-2222-4222-8222-222222222222";
const inviteId = "33333333-3333-4333-8333-333333333333";
const params = Promise.resolve({ projectId, inviteId });

function makePostRequest() {
  return new Request(
    `http://localhost/api/projects/${projectId}/invites/${inviteId}/resend`,
    { method: "POST" },
  );
}

const refreshedInvite = {
  id: inviteId,
  projectId,
  email: "collaborator@example.com",
  role: "editor" as const,
  status: "pending" as const,
  invitedBy: null,
  expiresAt: "2026-05-08T12:00:00.000Z",
  acceptedAt: null,
  revokedAt: null,
  createdAt: "2026-05-01T12:00:00.000Z",
  updatedAt: "2026-05-01T12:00:00.000Z",
};

describe("POST /api/projects/[projectId]/invites/[inviteId]/resend", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 200 with the refreshed invite", async () => {
    resendInviteMock.mockResolvedValueOnce({
      ok: true,
      status: "success",
      data: refreshedInvite,
    });

    const response = await POST(makePostRequest(), { params });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ id: inviteId, status: "pending" });
    expect(resendInviteMock).toHaveBeenCalledWith(
      inviteId,
      projectId,
      "http://localhost",
    );
  });

  it("returns 404 when the invite is not pending or does not exist", async () => {
    resendInviteMock.mockResolvedValueOnce({
      ok: false,
      status: "not_found",
      message: "Active invite not found.",
    });

    const response = await POST(makePostRequest(), { params });

    expect(response.status).toBe(404);
  });

  it("returns 409 when the invite was modified before the resend completed", async () => {
    resendInviteMock.mockResolvedValueOnce({
      ok: false,
      status: "conflict",
      message: "Invite was modified before the resend could complete.",
    });

    const response = await POST(makePostRequest(), { params });

    expect(response.status).toBe(409);
  });

  it("returns 401 when not authenticated", async () => {
    resendInviteMock.mockResolvedValueOnce({
      ok: false,
      status: "not_authenticated",
      message: "Authentication required.",
    });

    const response = await POST(makePostRequest(), { params });

    expect(response.status).toBe(401);
  });

  it("returns 403 when the user lacks owner access", async () => {
    resendInviteMock.mockResolvedValueOnce({
      ok: false,
      status: "forbidden",
      message: "Project access denied.",
    });

    const response = await POST(makePostRequest(), { params });

    expect(response.status).toBe(403);
  });

  it("returns 500 when a database error occurs during the token rotation", async () => {
    resendInviteMock.mockResolvedValueOnce({
      ok: false,
      status: "internal_error",
      message: "Failed to resend invite.",
    });

    const response = await POST(makePostRequest(), { params });

    expect(response.status).toBe(500);
  });
});
