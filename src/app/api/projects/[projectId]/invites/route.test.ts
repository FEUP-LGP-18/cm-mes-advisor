import { afterEach, describe, expect, it, vi } from "vitest";
import { createInvite, listInvites } from "@/lib/projects/invites.server";
import { GET, POST } from "./route";

vi.mock("@/lib/projects/invites.server", () => ({
  createInvite: vi.fn(),
  listInvites: vi.fn(),
}));

const createInviteMock = vi.mocked(createInvite);
const listInvitesMock = vi.mocked(listInvites);

const projectId = "22222222-2222-4222-8222-222222222222";
const inviteId = "33333333-3333-4333-8333-333333333333";

function makeGetRequest() {
  return new Request(`http://localhost/api/projects/${projectId}/invites`);
}

function makePostRequest(body: Record<string, unknown>) {
  return new Request(`http://localhost/api/projects/${projectId}/invites`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ projectId });

const pendingInvite = {
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

describe("GET /api/projects/[projectId]/invites", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 200 with the invite list", async () => {
    listInvitesMock.mockResolvedValueOnce({
      ok: true,
      status: "success",
      data: [pendingInvite],
    });

    const response = await GET(makeGetRequest(), { params });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: inviteId, role: "editor" });
  });

  it("returns 401 when not authenticated", async () => {
    listInvitesMock.mockResolvedValueOnce({
      ok: false,
      status: "not_authenticated",
      message: "Authentication required.",
    });

    const response = await GET(makeGetRequest(), { params });

    expect(response.status).toBe(401);
  });

  it("returns 403 when the user lacks owner access", async () => {
    listInvitesMock.mockResolvedValueOnce({
      ok: false,
      status: "forbidden",
      message: "Project access denied.",
    });

    const response = await GET(makeGetRequest(), { params });

    expect(response.status).toBe(403);
  });
});

describe("POST /api/projects/[projectId]/invites", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 201 with the created invite", async () => {
    createInviteMock.mockResolvedValueOnce({
      ok: true,
      status: "success",
      data: pendingInvite,
    });

    const response = await POST(
      makePostRequest({ email: "collaborator@example.com", role: "editor" }),
      { params },
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ id: inviteId, role: "editor" });
    expect(createInviteMock).toHaveBeenCalledWith(
      projectId,
      "collaborator@example.com",
      "editor",
      "http://localhost",
    );
  });

  it("returns 401 when not authenticated", async () => {
    createInviteMock.mockResolvedValueOnce({
      ok: false,
      status: "not_authenticated",
      message: "Authentication required.",
    });

    const response = await POST(
      makePostRequest({ email: "collaborator@example.com", role: "editor" }),
      { params },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when the user lacks owner access", async () => {
    createInviteMock.mockResolvedValueOnce({
      ok: false,
      status: "forbidden",
      message: "Project access denied.",
    });

    const response = await POST(
      makePostRequest({ email: "collaborator@example.com", role: "editor" }),
      { params },
    );

    expect(response.status).toBe(403);
  });

  it("returns 409 when a pending invite already exists for this email", async () => {
    createInviteMock.mockResolvedValueOnce({
      ok: false,
      status: "conflict",
      message: "A pending invite already exists for this email.",
    });

    const response = await POST(
      makePostRequest({ email: "collaborator@example.com", role: "editor" }),
      { params },
    );

    expect(response.status).toBe(409);
  });

  it("returns 400 for a validation error such as an invalid email", async () => {
    createInviteMock.mockResolvedValueOnce({
      ok: false,
      status: "validation_error",
      message: "A valid email address is required.",
    });

    const response = await POST(
      makePostRequest({ email: "not-an-email", role: "editor" }),
      { params },
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 when a database error occurs", async () => {
    createInviteMock.mockResolvedValueOnce({
      ok: false,
      status: "internal_error",
      message: "Failed to create invite.",
    });

    const response = await POST(
      makePostRequest({ email: "collaborator@example.com", role: "editor" }),
      { params },
    );

    expect(response.status).toBe(500);
  });

  it("returns 400 when the request body is malformed JSON", async () => {
    const response = await POST(
      new Request(`http://localhost/api/projects/${projectId}/invites`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
      { params },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid JSON body." });
    expect(createInviteMock).not.toHaveBeenCalled();
  });
});
