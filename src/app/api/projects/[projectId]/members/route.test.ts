import { afterEach, describe, expect, it, vi } from "vitest";
import { listMembers } from "@/lib/projects/members.server";
import { GET } from "./route";

vi.mock("@/lib/projects/members.server", () => ({
  listMembers: vi.fn(),
}));

const listMembersMock = vi.mocked(listMembers);

const projectId = "22222222-2222-4222-8222-222222222222";

function makeGetRequest() {
  return new Request(`http://localhost/api/projects/${projectId}/members`, {
    method: "GET",
  });
}

const params = Promise.resolve({ projectId });

const sampleMember = {
  email: "alice@example.com",
  joinedAt: "2026-04-01T10:00:00.000Z",
  name: "Alice",
  role: "owner" as const,
  userId: "11111111-1111-4111-8111-111111111111",
};

describe("GET /api/projects/[projectId]/members", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 200 with the member list", async () => {
    listMembersMock.mockResolvedValueOnce({
      data: [sampleMember],
      ok: true,
      status: "success",
    });

    const response = await GET(makeGetRequest(), { params });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ email: "alice@example.com", role: "owner" });
  });

  it("returns 401 when the caller is not authenticated", async () => {
    listMembersMock.mockResolvedValueOnce({
      message: "Authentication required.",
      ok: false,
      status: "not_authenticated",
    });

    const response = await GET(makeGetRequest(), { params });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 403 when the caller lacks owner capabilities", async () => {
    listMembersMock.mockResolvedValueOnce({
      message: "Project access denied.",
      ok: false,
      status: "forbidden",
    });

    const response = await GET(makeGetRequest(), { params });

    expect(response.status).toBe(403);
  });

  it("returns 500 on an internal server error", async () => {
    listMembersMock.mockResolvedValueOnce({
      message: "Failed to load members.",
      ok: false,
      status: "internal_error",
    });

    const response = await GET(makeGetRequest(), { params });

    expect(response.status).toBe(500);
  });

  it("returns 500 when the handler throws unexpectedly", async () => {
    listMembersMock.mockRejectedValueOnce(new Error("Unexpected failure"));

    const response = await GET(makeGetRequest(), { params });

    expect(response.status).toBe(500);
  });
});
