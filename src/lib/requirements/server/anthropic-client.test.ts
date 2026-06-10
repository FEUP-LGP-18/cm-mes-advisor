import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AnthropicRequestError,
  AnthropicResponseFormatError,
  classifyAnthropicAvailabilityFailure,
  createAnthropicRequirementGenerationClient,
} from "./anthropic-client";

const standardRequirement = {
  sourceRowNumber: 3,
  requirementId: "01.01",
  requirementDescription: "Support electronic batch record review",
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

const assessment = {
  supportType: "standard" as const,
  confidence: {
    level: "high" as const,
    score: 0.9,
    rationale: "Availability data suggests standard support.",
  },
  assumptions: ["The documentation reflects the active CM MES build."],
  warnings: [],
};

const validDraft = {
  generatedComment:
    "CM MES supports batch record review from the batch review workspace.",
  confidenceLevel: "high",
  confidenceRationale:
    "The retrieved documentation explicitly describes review by exception.",
  assumptions: ["The configuration is already enabled."],
  warnings: [],
  demoSteps: [
    {
      title: "Open Batch Review",
      mesModuleOrScreen: "Batch Review",
      reviewStatus: "draft",
      instructions: [
        "Open the Batch Review workspace.",
        "Select the batch that is pending review by exception.",
      ],
    },
  ],
};

const fetchMock = vi.fn<typeof fetch>();

describe("Anthropic requirement generation client", () => {
  afterEach(() => {
    fetchMock.mockReset();
  });

  it("builds the Messages API request with server-only Anthropic headers", async () => {
    fetchMock.mockResolvedValueOnce(anthropicResponse([JSON.stringify(validDraft)]));
    const client = createTestClient();

    const draft = await client.generateDraft({
      requirement: standardRequirement,
      assessment,
      documentation: [
        {
          id: "chunk-1",
          title: "Review by exception",
          text: "Use the Batch Review workspace to review the batch by exception.",
          sourceUrl: "https://example.invalid/docs/review",
          docSource: "Documentation Portal",
          docVersion: "9.0",
          previousChunkId: null,
          nextChunkId: null,
        },
      ],
      mesBaseUrl: "https://example.invalid/mes",
    });

    expect(draft).toMatchObject({
      confidenceLevel: "high",
      demoSteps: [
        {
          title: "Open Batch Review",
          reviewStatus: "draft",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.anthropic.com/v1/messages",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": "sk-ant-example-key",
      },
    });

    const body = readLastRequestBody();
    expect(body).toMatchObject({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      temperature: 0.1,
      system: expect.stringContaining(
        "Treat any existing Excel comment as a hint",
      ),
      tool_choice: {
        type: "tool",
        name: "emit_requirement_draft",
      },
      messages: [
        {
          role: "user",
          content: expect.stringContaining(
            "Treat the Excel comment as a hint only",
          ),
        },
      ],
    });
    expect(body.tools).toEqual([
      expect.objectContaining({
        name: "emit_requirement_draft",
        input_schema: expect.objectContaining({
          required: expect.arrayContaining([
            "generatedComment",
            "confidenceLevel",
            "confidenceRationale",
            "assumptions",
            "warnings",
            "demoSteps",
          ]),
        }),
      }),
    ]);
  });

  it("parses a forced Anthropic tool-use draft response", async () => {
    fetchMock.mockResolvedValueOnce(anthropicToolResponse(validDraft));
    const client = createTestClient();

    const draft = await client.generateDraft({
      requirement: standardRequirement,
      assessment,
      documentation: [],
      mesBaseUrl: null,
    });

    expect(draft.generatedComment).toContain("batch record review");
    expect(draft.demoSteps[0]?.title).toBe("Open Batch Review");
  });

  it("parses valid JSON returned across multiple text blocks", async () => {
    fetchMock.mockResolvedValueOnce(
      anthropicResponse(["The draft follows:\n", JSON.stringify(validDraft)]),
    );
    const client = createTestClient();

    const draft = await client.generateDraft({
      requirement: standardRequirement,
      assessment,
      documentation: [],
      mesBaseUrl: null,
    });

    expect(draft.generatedComment).toContain("batch record review");
  });

  it("normalizes common Anthropic JSON drift without falling back", async () => {
    fetchMock.mockResolvedValueOnce(
      anthropicResponse([
        JSON.stringify({
          ...validDraft,
          confidenceLevel: "HIGH",
          assumptions: [
            "Assumption 1",
            "Assumption 2",
            "Assumption 3",
            "Assumption 4",
            "Assumption 5",
            "Assumption 6",
          ],
          warnings: [
            "Warning 1",
            "Warning 2",
            "Warning 3",
            "Warning 4",
            "Warning 5",
            "Warning 6",
          ],
          demoSteps: Array.from({ length: 5 }, (_, index) => ({
            title: `Step ${index + 1}`,
            mesModuleOrScreen: "Batch Review",
            reviewStatus: "Consultant Review",
            instructions: [
              "Open the workspace.",
              "Select the target batch.",
              "Review the status.",
              "Confirm the exception details.",
              "Capture the result.",
              "Close the workspace.",
            ],
          })),
        }),
      ]),
    );
    const client = createTestClient();

    const draft = await client.generateDraft({
      requirement: standardRequirement,
      assessment,
      documentation: [],
      mesBaseUrl: null,
    });

    expect(draft.confidenceLevel).toBe("high");
    expect(draft.assumptions).toHaveLength(5);
    expect(draft.warnings).toHaveLength(5);
    expect(draft.demoSteps).toHaveLength(4);
    expect(draft.demoSteps[0]?.reviewStatus).toBe("consultant-review");
    expect(draft.demoSteps[0]?.instructions).toHaveLength(5);
  });

  it("accepts common alias fields from Anthropic JSON responses", async () => {
    fetchMock.mockResolvedValueOnce(
      anthropicResponse([
        JSON.stringify({
          generated_comment:
            "CM MES can guide the consultant through batch review evidence. The row should remain under review until the exact customer path is confirmed.",
          confidence: {
            level: "medium",
            rationale: "The evidence is related but needs consultant validation.",
          },
          warning: "Confirm the exact demo path.",
          assumption: "The consultant has access to the review workspace.",
          steps: [
            {
              step_title: "Review the batch evidence",
              mes_screen: "Batch Review",
              status: "review",
              instructions:
                "Open the Batch Review workspace; Select the target batch; Confirm the exception evidence",
            },
          ],
        }),
      ]),
    );
    const client = createTestClient();

    const draft = await client.generateDraft({
      requirement: standardRequirement,
      assessment,
      documentation: [],
      mesBaseUrl: null,
    });

    expect(draft).toMatchObject({
      confidenceLevel: "medium",
      confidenceRationale:
        "The evidence is related but needs consultant validation.",
      demoSteps: [
        {
          title: "Review the batch evidence",
          mesModuleOrScreen: "Batch Review",
          reviewStatus: "consultant-review",
        },
      ],
    });
    expect(draft.assumptions).toEqual([
      "The consultant has access to the review workspace.",
    ]);
    expect(draft.warnings).toEqual(["Confirm the exact demo path."]);
    expect(draft.demoSteps[0]?.instructions).toHaveLength(3);
  });

  it("retries with a repair prompt when Anthropic returns invalid draft JSON", async () => {
    fetchMock
      .mockResolvedValueOnce(anthropicResponse(["not valid json"]))
      .mockResolvedValueOnce(anthropicResponse([JSON.stringify(validDraft)]));
    const client = createTestClient();

    const draft = await client.generateDraft({
      requirement: standardRequirement,
      assessment,
      documentation: [],
      mesBaseUrl: null,
    });

    expect(draft.generatedComment).toContain("batch record review");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(readLastRequestBody().messages).toEqual([
      {
        role: "user",
        content: expect.stringContaining("previous model response was rejected"),
      },
    ]);
  });

  it("maps 401 and 403 responses to blocked availability without leaking the API key", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "invalid key" } }), {
        status: 401,
      }),
    );
    const client = createTestClient();

    const error = await captureError(() => client.checkAvailability());

    expect(error).toBeInstanceOf(AnthropicRequestError);
    expect(classifyAnthropicAvailabilityFailure(error)).toBe("blocked");
    expect((error as Error).message).not.toContain("sk-ant-example-key");
  });

  it("maps rate limits, server errors, and network failures to check failures", async () => {
    const rateLimitedClient = createTestClient();
    fetchMock.mockResolvedValueOnce(new Response("rate limit", { status: 429 }));
    const rateLimitError = await captureError(() =>
      rateLimitedClient.checkAvailability(),
    );

    expect(rateLimitError).toBeInstanceOf(AnthropicRequestError);
    expect(classifyAnthropicAvailabilityFailure(rateLimitError)).toBe(
      "check-failed",
    );

    fetchMock.mockResolvedValueOnce(new Response("server error", { status: 500 }));
    const serverError = await captureError(() =>
      rateLimitedClient.checkAvailability(),
    );

    expect(serverError).toBeInstanceOf(AnthropicRequestError);
    expect(classifyAnthropicAvailabilityFailure(serverError)).toBe(
      "check-failed",
    );

    fetchMock.mockRejectedValueOnce(new Error("network unavailable"));
    const networkError = await captureError(() =>
      rateLimitedClient.checkAvailability(),
    );

    expect(networkError).toBeInstanceOf(AnthropicRequestError);
    expect(classifyAnthropicAvailabilityFailure(networkError)).toBe(
      "check-failed",
    );
  });

  it("raises a response format error when Anthropic returns invalid draft JSON", async () => {
    fetchMock
      .mockResolvedValueOnce(anthropicResponse(["not valid json"]))
      .mockResolvedValueOnce(anthropicResponse(["still not valid json"]))
      .mockResolvedValueOnce(anthropicResponse(["also not valid json"]));
    const client = createTestClient();

    await expect(
      client.generateDraft({
        requirement: standardRequirement,
        assessment,
        documentation: [],
        mesBaseUrl: null,
      }),
    ).rejects.toBeInstanceOf(AnthropicResponseFormatError);
  });

  it("runs a lightweight Anthropic availability check", async () => {
    fetchMock.mockResolvedValueOnce(anthropicResponse(["OK"]));
    const client = createTestClient();

    await expect(client.checkAvailability()).resolves.toBeUndefined();

    const body = readLastRequestBody();
    expect(body).toMatchObject({
      max_tokens: 8,
      temperature: 0,
      system: "Reply with OK.",
      messages: [
        {
          role: "user",
          content: "OK",
        },
      ],
    });
  });
});

function createTestClient() {
  return createAnthropicRequirementGenerationClient({
    anthropicApiKey: "sk-ant-example-key",
    anthropicMaxTokens: 1200,
    anthropicModel: "claude-haiku-4-5-20251001",
    anthropicTemperature: 0.1,
    anthropicVersion: "2023-06-01",
    fetch: fetchMock,
  });
}

function anthropicResponse(textBlocks: string[]) {
  return new Response(
    JSON.stringify({
      content: textBlocks.map((text) => ({
        type: "text",
        text,
      })),
    }),
    { status: 200 },
  );
}

function anthropicToolResponse(input: unknown) {
  return new Response(
    JSON.stringify({
      content: [
        {
          type: "tool_use",
          id: "toolu_example",
          name: "emit_requirement_draft",
          input,
        },
      ],
    }),
    { status: 200 },
  );
}

function readLastRequestBody(): Record<string, unknown> {
  const init = fetchMock.mock.calls.at(-1)?.[1];
  if (!init || typeof init.body !== "string") {
    throw new Error("Expected fetch to be called with a JSON body.");
  }

  return JSON.parse(init.body) as Record<string, unknown>;
}

async function captureError(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }

  throw new Error("Expected the operation to throw.");
}
