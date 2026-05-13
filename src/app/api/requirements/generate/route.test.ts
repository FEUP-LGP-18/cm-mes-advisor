import { afterEach, describe, expect, it, vi } from "vitest";
import { requireProjectCapability } from "../../../../lib/projects/permissions.server";
import { POST } from "./route";

vi.mock("../../../../lib/projects/permissions.server", () => ({
  requireProjectCapability: vi.fn(),
}));

const requireProjectCapabilityMock = vi.mocked(requireProjectCapability);

const parsedRequirement = {
  sourceRowNumber: 3,
  requirementId: "01.01",
  requirementDescription: "Support electronic batch review",
  l2Process: "Manufacturing Execution",
  l3Process: "Review by Exception",
  operation: "Batch review",
  demo: true,
  demoRaw: "x",
  detailDescriptionAndMotivation: "Consultants need a clear demo flow.",
  prioEms: "1",
  prioCws: "1",
  mvp: true,
  mvpRaw: "x",
  availability: "Available",
  availabilityCm: "Standard configuration",
  descriptionAvailability: "Supported by configuration.",
  supportedPercent: "100%",
  sourceComment: "Existing Excel Comment feedback.",
} as const;

const validRequestBody = {
  projectId: "123e4567-e89b-12d3-a456-426614174000",
  requirements: [parsedRequirement],
};

describe("POST /api/requirements/generate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns mock drafts for valid requests", async () => {
    requireProjectCapabilityMock.mockResolvedValueOnce({
      ok: true,
      status: "success",
      data: { id: "user1", email: "test@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z" },
    });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

    const response = await POST(
      new Request("http://localhost/api/requirements/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(validRequestBody),
      }),
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: true,
      mode: "mock",
    });

    const drafts = body.drafts as Array<Record<string, unknown>>;
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      generator: "mock-ai",
      requirement: {
        requirementId: "01.01",
      },
    });
  });

  it("allows an explicit mock request even when real mode is misconfigured", async () => {
    requireProjectCapabilityMock.mockResolvedValueOnce({
      ok: true,
      status: "success",
      data: { id: "user1", email: "test@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z" },
    });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("GENERATION_MODE", "real");
    vi.stubEnv("MCP_SERVER_URL", "https://example.invalid/mcp");
    vi.stubEnv("BEDROCK_MODEL_ID", "example-bedrock-model-id");
    vi.stubEnv("AWS_REGION", "eu-west-1");
    vi.stubEnv("AWS_BEARER_TOKEN_BEDROCK", "");

    const response = await POST(
      new Request("http://localhost/api/requirements/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          mode: "mock",
          ...validRequestBody,
        }),
      }),
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: true,
      mode: "mock",
    });
  });

  it("rejects malformed payloads with a safe 400 response", async () => {
    const response = await POST(
      new Request("http://localhost/api/requirements/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectId: validRequestBody.projectId,
          requirements: [{ ...parsedRequirement, sourceRowNumber: "bad" }],
        }),
      }),
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: "invalid-request",
      },
    });
  });

  it("rejects missing projectId with a safe 400 response", async () => {
    const response = await POST(
      new Request("http://localhost/api/requirements/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requirements: [parsedRequirement],
        }),
      }),
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: "invalid-request",
      },
    });
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
      new Request("http://localhost/api/requirements/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(validRequestBody),
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

  it("returns 403 when user does not have the edit_project_state capability", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    requireProjectCapabilityMock.mockResolvedValueOnce({
      message: "Project access denied.",
      ok: false,
      status: "forbidden",
    });

    const response = await POST(
      new Request("http://localhost/api/requirements/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(validRequestBody),
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

  it("rejects unsupported generation modes", async () => {
    const response = await POST(
      new Request("http://localhost/api/requirements/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          mode: "prototype",
          ...validRequestBody,
        }),
      }),
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: "invalid-request",
      },
    });
  });

  it("returns a safe 503 when real mode is selected without Bedrock auth", async () => {
    requireProjectCapabilityMock.mockResolvedValueOnce({
      ok: true,
      status: "success",
      data: { id: "user1", email: "test@example.com", emailConfirmedAt: "2026-05-01T12:00:00.000Z" },
    });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("GENERATION_MODE", "real");
    vi.stubEnv("MCP_SERVER_URL", "https://example.invalid/mcp");
    vi.stubEnv("BEDROCK_MODEL_ID", "example-bedrock-model-id");
    vi.stubEnv("AWS_REGION", "eu-west-1");
    vi.stubEnv("AWS_BEARER_TOKEN_BEDROCK", "");

    const response = await POST(
      new Request("http://localhost/api/requirements/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(validRequestBody),
      }),
    );

    expect(response.status).toBe(503);

    const text = await response.text();
    expect(text).toContain("real-generation-unavailable");
    expect(text).toContain("not configured yet");
    expect(text).toContain("AWS_BEARER_TOKEN_BEDROCK");
    expect(text).toContain("missing-config");
    expect(text).not.toContain("example-bedrock-model-id");
  });
});
