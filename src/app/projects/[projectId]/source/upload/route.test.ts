import { afterEach, describe, expect, it, vi } from "vitest";
import { requireProjectCapability } from "@/lib/projects/permissions.server";
import { POST } from "./route";

vi.mock("@/lib/projects/permissions.server", () => ({
  requireProjectCapability: vi.fn(),
}));

vi.mock("@/lib/projects/repository.server", () => ({
  deleteUploadedProjectFileMetadata: vi.fn(),
  getProjectForUser: vi.fn(),
  getProjectPhaseState: vi.fn(),
  saveProjectFileMetadata: vi.fn(),
  saveProjectPhaseState: vi.fn(),
}));

vi.mock("@/lib/requirements/parser", () => ({
  parseRequirementsWorkbook: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const requireProjectCapabilityMock = vi.mocked(requireProjectCapability);
const projectId = "22222222-2222-4222-8222-222222222222";
const user = {
  email: "editor@example.com",
  emailConfirmedAt: "2026-05-01T12:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
};
const context = {
  params: Promise.resolve({ projectId }),
};

function createUploadRequest(file?: File) {
  const formData = new FormData();
  if (file) {
    formData.set("workbook", file);
  }

  return new Request(`http://localhost/projects/${projectId}/source/upload`, {
    body: formData,
    method: "POST",
  });
}

describe("POST /projects/[projectId]/source/upload", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 before parsing uploads when the caller is not authenticated", async () => {
    requireProjectCapabilityMock.mockResolvedValueOnce({
      message: "Authentication required.",
      ok: false,
      status: "not_authenticated",
    });

    const response = await POST(createUploadRequest(), context);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { message: "Authentication required." },
      ok: false,
    });
  });

  it("returns 403 before parsing uploads when the caller cannot upload files", async () => {
    requireProjectCapabilityMock.mockResolvedValueOnce({
      message: "Project access denied.",
      ok: false,
      status: "forbidden",
    });

    const response = await POST(createUploadRequest(), context);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { message: "Project access denied." },
      ok: false,
    });
  });

  it("rejects non-xlsx files after upload permission is granted", async () => {
    requireProjectCapabilityMock.mockResolvedValueOnce({
      data: user,
      ok: true,
      status: "success",
    });

    const response = await POST(
      createUploadRequest(new File(["not a workbook"], "notes.txt")),
      context,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
    });
  });
});
