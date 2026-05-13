import { afterEach, describe, expect, it, vi } from "vitest";
import { removeMember, updateMemberRole } from "@/lib/projects/members.server";
import { DELETE, PATCH } from "./route";

vi.mock("@/lib/projects/members.server", () => ({
  removeMember: vi.fn(),
  updateMemberRole: vi.fn(),
}));

const removeMemberMock = vi.mocked(removeMember);
const updateMemberRoleMock = vi.mocked(updateMemberRole);

const projectId = "22222222-2222-4222-8222-222222222222";
const targetUserId = "44444444-4444-4444-8444-444444444444";

const params = Promise.resolve({ projectId, userId: targetUserId });

const updatedMember = {
  email: "alice@example.com",
  joinedAt: "2026-04-01T10:00:00.000Z",
  name: "Alice",
  role: "viewer" as const,
  userId: targetUserId,
};

function makePatchRequest(body: Record<string, unknown>) {
  return new Request(
    `http://localhost/api/projects/${projectId}/members/${targetUserId}`,
    {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    },
  );
}

function makeDeleteRequest() {
  return new Request(
    `http://localhost/api/projects/${projectId}/members/${targetUserId}`,
    { method: "DELETE" },
  );
}

describe("PATCH /api/projects/[projectId]/members/[userId]", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 200 with the updated member on success", async () => {
    updateMemberRoleMock.mockResolvedValueOnce({
      data: updatedMember,
      ok: true,
      status: "success",
    });

    const response = await PATCH(makePatchRequest({ role: "viewer" }), { params });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ role: "viewer", userId: targetUserId });
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await PATCH(
      new Request(
        `http://localhost/api/projects/${projectId}/members/${targetUserId}`,
        {
          body: "not-json",
          headers: { "content-type": "application/json" },
          method: "PATCH",
        },
      ),
      { params },
    );

    expect(response.status).toBe(400);
    expect(updateMemberRoleMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid role", async () => {
    updateMemberRoleMock.mockResolvedValueOnce({
      message: "Role must be viewer, editor, or owner.",
      ok: false,
      status: "validation_error",
    });

    const response = await PATCH(makePatchRequest({ role: "superadmin" }), { params });

    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    updateMemberRoleMock.mockResolvedValueOnce({
      message: "Authentication required.",
      ok: false,
      status: "not_authenticated",
    });

    const response = await PATCH(makePatchRequest({ role: "viewer" }), { params });

    expect(response.status).toBe(401);
  });

  it("returns 403 when the caller lacks owner capabilities", async () => {
    updateMemberRoleMock.mockResolvedValueOnce({
      message: "Project access denied.",
      ok: false,
      status: "forbidden",
    });

    const response = await PATCH(makePatchRequest({ role: "viewer" }), { params });

    expect(response.status).toBe(403);
  });

  it("returns 404 when the member does not exist", async () => {
    updateMemberRoleMock.mockResolvedValueOnce({
      message: "Member not found.",
      ok: false,
      status: "not_found",
    });

    const response = await PATCH(makePatchRequest({ role: "viewer" }), { params });

    expect(response.status).toBe(404);
  });

  it("returns 409 when the DB trigger blocks last-owner demotion", async () => {
    updateMemberRoleMock.mockResolvedValueOnce({
      message: "Cannot demote the last project owner.",
      ok: false,
      status: "conflict",
    });

    const response = await PATCH(makePatchRequest({ role: "editor" }), { params });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain("last project owner");
  });

  it("returns 500 when the handler throws unexpectedly", async () => {
    updateMemberRoleMock.mockRejectedValueOnce(new Error("Unexpected failure"));

    const response = await PATCH(makePatchRequest({ role: "viewer" }), { params });

    expect(response.status).toBe(500);
  });
});

describe("DELETE /api/projects/[projectId]/members/[userId]", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 200 with the userId on success", async () => {
    removeMemberMock.mockResolvedValueOnce({
      data: { userId: targetUserId },
      ok: true,
      status: "success",
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ userId: targetUserId });
  });

  it("returns 401 when not authenticated", async () => {
    removeMemberMock.mockResolvedValueOnce({
      message: "Authentication required.",
      ok: false,
      status: "not_authenticated",
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(401);
  });

  it("returns 403 when the caller lacks owner capabilities", async () => {
    removeMemberMock.mockResolvedValueOnce({
      message: "Project access denied.",
      ok: false,
      status: "forbidden",
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(403);
  });

  it("returns 409 when the DB trigger blocks last-owner removal", async () => {
    removeMemberMock.mockResolvedValueOnce({
      message: "Cannot remove the last project owner.",
      ok: false,
      status: "conflict",
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain("last project owner");
  });

  it("returns 500 when the handler throws unexpectedly", async () => {
    removeMemberMock.mockRejectedValueOnce(new Error("Unexpected failure"));

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(500);
  });
});
