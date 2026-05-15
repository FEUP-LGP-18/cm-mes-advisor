import { afterEach, describe, expect, it, vi } from "vitest";
import {
  archiveProject,
  unarchiveProject,
} from "@/lib/projects/settings.server";
import { POST } from "./route";

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/projects/settings.server", () => ({
  archiveProject: vi.fn(),
  unarchiveProject: vi.fn(),
}));

const archiveProjectMock = vi.mocked(archiveProject);
const unarchiveProjectMock = vi.mocked(unarchiveProject);

const projectId = "22222222-2222-4222-8222-222222222222";
const params = Promise.resolve({ projectId });

function makePostRequest(body: unknown) {
  return new Request(
    `http://localhost/api/projects/${projectId}/settings/archive`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

const sampleProject = {
  id: projectId,
  name: "Test Project",
  status: "archived",
};

describe("POST /api/projects/[projectId]/settings/archive", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 200 after archiving a project", async () => {
    archiveProjectMock.mockResolvedValueOnce({
      data: sampleProject,
      ok: true,
      status: "success",
    });

    const response = await POST(makePostRequest({ action: "archive" }), {
      params,
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: "archived" });
    expect(archiveProjectMock).toHaveBeenCalledWith(projectId);
    expect(unarchiveProjectMock).not.toHaveBeenCalled();
  });

  it("returns 200 after unarchiving a project", async () => {
    unarchiveProjectMock.mockResolvedValueOnce({
      data: { ...sampleProject, status: "active" },
      ok: true,
      status: "success",
    });

    const response = await POST(makePostRequest({ action: "unarchive" }), {
      params,
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: "active" });
    expect(unarchiveProjectMock).toHaveBeenCalledWith(projectId);
    expect(archiveProjectMock).not.toHaveBeenCalled();
  });

  it("returns 400 when action field is missing", async () => {
    const response = await POST(makePostRequest({}), { params });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(archiveProjectMock).not.toHaveBeenCalled();
    expect(unarchiveProjectMock).not.toHaveBeenCalled();
  });

  it("returns 400 when action field has an invalid value", async () => {
    const response = await POST(makePostRequest({ action: "delete" }), {
      params,
    });

    expect(response.status).toBe(400);
    expect(archiveProjectMock).not.toHaveBeenCalled();
  });

  it("returns 400 when request body is invalid JSON", async () => {
    const request = new Request(
      `http://localhost/api/projects/${projectId}/settings/archive`,
      {
        body: "not-json",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    const response = await POST(request, { params });

    expect(response.status).toBe(400);
    expect(archiveProjectMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the caller is not authenticated", async () => {
    archiveProjectMock.mockResolvedValueOnce({
      message: "Authentication required.",
      ok: false,
      status: "not_authenticated",
    });

    const response = await POST(makePostRequest({ action: "archive" }), {
      params,
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 when the caller lacks archive permission", async () => {
    archiveProjectMock.mockResolvedValueOnce({
      message: "Project access denied.",
      ok: false,
      status: "forbidden",
    });

    const response = await POST(makePostRequest({ action: "archive" }), {
      params,
    });

    expect(response.status).toBe(403);
  });

  it("returns 404 when the project does not exist or is already in target state", async () => {
    archiveProjectMock.mockResolvedValueOnce({
      message: "Project not found.",
      ok: false,
      status: "not_found",
    });

    const response = await POST(makePostRequest({ action: "archive" }), {
      params,
    });

    expect(response.status).toBe(404);
  });

  it("returns 500 on an internal server error", async () => {
    archiveProjectMock.mockResolvedValueOnce({
      message: "Failed to archive project.",
      ok: false,
      status: "internal_error",
    });

    const response = await POST(makePostRequest({ action: "archive" }), {
      params,
    });

    expect(response.status).toBe(500);
  });

  it("returns 500 when the handler throws unexpectedly", async () => {
    archiveProjectMock.mockRejectedValueOnce(new Error("Unexpected failure"));

    const response = await POST(makePostRequest({ action: "archive" }), {
      params,
    });

    expect(response.status).toBe(500);
  });
});
