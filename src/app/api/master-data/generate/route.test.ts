import { afterEach, describe, expect, it, vi } from "vitest";
import { requireProjectCapability } from "@/lib/projects/permissions.server";
import { POST } from "./route";

vi.mock("@/lib/projects/permissions.server", () => ({
  requireProjectCapability: vi.fn(),
}));

const requireProjectCapabilityMock = vi.mocked(requireProjectCapability);

const project = {
  customerName: "Customer X",
  projectId: "customer-x-demo",
  projectName: "Customer X Demo",
};

describe("POST /api/master-data/generate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("rejects empty generation selections", async () => {
    const response = await POST(
      new Request("http://localhost/api/master-data/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          mode: "mock",
          project,
          requirements: [],
          selectedObjectTypes: ["product"],
          selectedRequirementKeys: [],
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects unsupported object types", async () => {
    const response = await POST(
      new Request("http://localhost/api/master-data/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          mode: "mock",
          project,
          requirements: [],
          selectedObjectTypes: ["work-center"],
          selectedRequirementKeys: ["28:03.01"],
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 401 when Supabase auth is configured without a user", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    requireProjectCapabilityMock.mockResolvedValueOnce({
      message: "Authentication required.",
      ok: false,
      status: "not_authenticated",
    });

    const response = await POST(
      new Request("http://localhost/api/master-data/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          mode: "real",
          project,
          requirements: [],
          selectedObjectTypes: ["product"],
          selectedRequirementKeys: ["28:03.01"],
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "unauthorized",
        message: "Authentication required.",
      },
    });
  });

  it("returns 403 when the user cannot edit project state", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    requireProjectCapabilityMock.mockResolvedValueOnce({
      message: "Project access denied.",
      ok: false,
      status: "forbidden",
    });

    const response = await POST(
      new Request("http://localhost/api/master-data/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          mode: "real",
          project,
          requirements: [],
          selectedObjectTypes: ["product"],
          selectedRequirementKeys: ["28:03.01"],
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "forbidden",
        message: "Project access denied.",
      },
    });
  });
});
