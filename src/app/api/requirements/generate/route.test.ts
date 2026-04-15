import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

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

describe("POST /api/requirements/generate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns mock drafts for valid requests", async () => {
    const response = await POST(
      new Request("http://localhost/api/requirements/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ requirements: [parsedRequirement] }),
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

  it("rejects malformed payloads with a safe 400 response", async () => {
    const response = await POST(
      new Request("http://localhost/api/requirements/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
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

  it("returns a safe 503 when real mode is selected without protocol details", async () => {
    vi.stubEnv("GENERATION_MODE", "real");
    vi.stubEnv("MCP_SERVER_URL", "https://example.invalid/mcp");
    vi.stubEnv("MES_BASE_URL", "https://example.invalid/mes");
    vi.stubEnv("BEDROCK_API_KEY", "super-secret-key");
    vi.stubEnv("BEDROCK_MODEL_ID", "example-bedrock-model-id");
    vi.stubEnv("AWS_REGION", "eu-west-1");
    vi.stubEnv("MCP_PROTOCOL_DETAILS", "");

    const response = await POST(
      new Request("http://localhost/api/requirements/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ requirements: [parsedRequirement] }),
      }),
    );

    expect(response.status).toBe(503);

    const text = await response.text();
    expect(text).toContain("real-generation-unavailable");
    expect(text).toContain("not configured yet");
    expect(text).not.toContain("super-secret-key");
  });
});
