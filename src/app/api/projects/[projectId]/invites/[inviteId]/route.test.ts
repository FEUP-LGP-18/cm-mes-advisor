import { afterEach, describe, expect, it, vi } from "vitest";
import { revokeInvite } from "@/lib/projects/invites.server";
import { DELETE } from "./route";

vi.mock("@/lib/projects/invites.server", () => ({
  revokeInvite: vi.fn(),
}));

const revokeInviteMock = vi.mocked(revokeInvite);

const projectId = "22222222-2222-4222-8222-222222222222";
const inviteId = "33333333-3333-4333-8333-333333333333";
const params = Promise.resolve({ projectId, inviteId });

function makeDeleteRequest() {
  return new Request(
    `http://localhost/api/projects/${projectId}/invites/${inviteId}`,
    { method: "DELETE" },
  );
}

const revokedInvite = {
  id: inviteId,
  projectId,
  email: "collaborator@example.com",
  role: "editor" as const,
  status: "revoked" as const,
  invitedBy: null,
  expiresAt: "2026-05-08T12:00:00.000Z",
  acceptedAt: null,
  revokedAt: "2026-05-01T12:00:00.000Z",
  createdAt: "2026-05-01T12:00:00.000Z",
  updatedAt: "2026-05-01T12:00:00.000Z",
};

describe("DELETE /api/projects/[projectId]/invites/[inviteId]", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 200 with the revoked invite", async () => {
    revokeInviteMock.mockResolvedValueOnce({
      ok: true,
      status: "success",
      data: revokedInvite,
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ id: inviteId, status: "revoked" });
    expect(revokeInviteMock).toHaveBeenCalledWith(inviteId, projectId);
  });

  it("returns 404 when the invite is not pending or does not exist", async () => {
    revokeInviteMock.mockResolvedValueOnce({
      ok: false,
      status: "not_found",
      message: "Active invite not found.",
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    revokeInviteMock.mockResolvedValueOnce({
      ok: false,
      status: "not_authenticated",
      message: "Authentication required.",
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(401);
  });

  it("returns 403 when the user lacks owner access", async () => {
    revokeInviteMock.mockResolvedValueOnce({
      ok: false,
      status: "forbidden",
      message: "Project access denied.",
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(403);
  });
});
