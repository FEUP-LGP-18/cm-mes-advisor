import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteProject,
  updateProjectMetadata,
} from "@/lib/projects/settings.server";
import { DELETE, PATCH } from "./route";

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/projects/settings.server", () => ({
  deleteProject: vi.fn(),
  updateProjectMetadata: vi.fn(),
}));

const updateProjectMetadataMock = vi.mocked(updateProjectMetadata);
const deleteProjectMock = vi.mocked(deleteProject);

const projectId = "22222222-2222-4222-8222-222222222222";
const params = Promise.resolve({ projectId });

function makePatchRequest(body: unknown) {
  return new Request(`http://localhost/api/projects/${projectId}/settings`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

function makeDeleteRequest() {
  return new Request(`http://localhost/api/projects/${projectId}/settings`, {
    method: "DELETE",
  });
}

const sampleProject = {
  archivedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  createdBy: "11111111-1111-4111-8111-111111111111",
  customerName: "Acme Corp",
  description: "A test project",
  id: projectId,
  name: "Test Project",
  status: "active" as const,
  updatedAt: "2026-01-01T00:00:00.000Z",
  updatedBy: null,
};

describe("PATCH /api/projects/[projectId]/settings", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 200 with updated project on success", async () => {
    updateProjectMetadataMock.mockResolvedValueOnce({
      data: sampleProject,
      ok: true,
      status: "success",
    });

    const response = await PATCH(
      makePatchRequest({ name: "Test Project", customerName: "Acme Corp" }),
      { params },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ name: "Test Project", customerName: "Acme Corp" });
  });

  it("returns 400 when name field is missing", async () => {
    const response = await PATCH(makePatchRequest({ customerName: "Acme" }), {
      params,
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(updateProjectMetadataMock).not.toHaveBeenCalled();
  });

  it("returns 400 when request body is invalid JSON", async () => {
    const request = new Request(
      `http://localhost/api/projects/${projectId}/settings`,
      { body: "not-json", headers: { "Content-Type": "application/json" }, method: "PATCH" },
    );

    const response = await PATCH(request, { params });

    expect(response.status).toBe(400);
    expect(updateProjectMetadataMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the caller is not authenticated", async () => {
    updateProjectMetadataMock.mockResolvedValueOnce({
      message: "Authentication required.",
      ok: false,
      status: "not_authenticated",
    });

    const response = await PATCH(makePatchRequest({ name: "Test" }), { params });

    expect(response.status).toBe(401);
  });

  it("returns 403 when the caller lacks owner access", async () => {
    updateProjectMetadataMock.mockResolvedValueOnce({
      message: "Project access denied.",
      ok: false,
      status: "forbidden",
    });

    const response = await PATCH(makePatchRequest({ name: "Test" }), { params });

    expect(response.status).toBe(403);
  });

  it("returns 500 on an internal server error", async () => {
    updateProjectMetadataMock.mockResolvedValueOnce({
      message: "Failed to update project.",
      ok: false,
      status: "internal_error",
    });

    const response = await PATCH(makePatchRequest({ name: "Test" }), { params });

    expect(response.status).toBe(500);
  });

  it("returns 500 when the handler throws unexpectedly", async () => {
    updateProjectMetadataMock.mockRejectedValueOnce(new Error("Unexpected failure"));

    const response = await PATCH(makePatchRequest({ name: "Test" }), { params });

    expect(response.status).toBe(500);
  });
});

describe("DELETE /api/projects/[projectId]/settings", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 200 on successful delete", async () => {
    deleteProjectMock.mockResolvedValueOnce({
      data: { projectId },
      ok: true,
      status: "success",
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ projectId });
  });

  it("returns 401 when the caller is not authenticated", async () => {
    deleteProjectMock.mockResolvedValueOnce({
      message: "Authentication required.",
      ok: false,
      status: "not_authenticated",
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(401);
  });

  it("returns 403 when the caller is not the project owner", async () => {
    deleteProjectMock.mockResolvedValueOnce({
      message: "Only the project owner can delete this project.",
      ok: false,
      status: "forbidden",
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(403);
  });

  it("returns 404 when the project does not exist", async () => {
    deleteProjectMock.mockResolvedValueOnce({
      message: "Project not found.",
      ok: false,
      status: "not_found",
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(404);
  });

  it("returns 409 when the project cannot be deleted due to a conflict", async () => {
    deleteProjectMock.mockResolvedValueOnce({
      message: "Cannot delete a project with active members.",
      ok: false,
      status: "conflict",
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(409);
  });

  it("returns 500 when the handler throws unexpectedly", async () => {
    deleteProjectMock.mockRejectedValueOnce(new Error("Unexpected failure"));

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(500);
  });
});
