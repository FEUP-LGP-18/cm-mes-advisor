import type {
  RequirementGenerationUnavailableReason,
} from "../generation-api";
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseDraftResponse,
  type RequirementGenerationModelClient,
} from "./model-draft-contract";

const anthropicMessagesEndpoint = "https://api.anthropic.com/v1/messages";
const requirementDraftToolName = "emit_requirement_draft";
const requirementDraftTool = {
  name: requirementDraftToolName,
  description:
    "Emit one structured CM MES requirement generation draft. Use this tool for every requirement generation response.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      generatedComment: {
        type: "string",
        description:
          "Two to four consultant-facing sentences explaining what CM MES can show and how to demo it.",
      },
      confidenceLevel: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
      confidenceRationale: {
        type: "string",
      },
      assumptions: {
        type: "array",
        maxItems: 5,
        items: { type: "string" },
      },
      warnings: {
        type: "array",
        maxItems: 5,
        items: { type: "string" },
      },
      demoSteps: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            mesModuleOrScreen: { type: "string" },
            reviewStatus: {
              type: "string",
              enum: ["draft", "consultant-review"],
            },
            instructions: {
              type: "array",
              minItems: 2,
              maxItems: 5,
              items: { type: "string" },
            },
          },
          required: [
            "title",
            "mesModuleOrScreen",
            "reviewStatus",
            "instructions",
          ],
        },
      },
    },
    required: [
      "generatedComment",
      "confidenceLevel",
      "confidenceRationale",
      "assumptions",
      "warnings",
      "demoSteps",
    ],
  },
};

type AnthropicFetch = typeof fetch;

export class AnthropicRequestError extends Error {
  readonly status: number | null;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      status?: number;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AnthropicRequestError";
    this.status = options.status ?? null;
  }
}

export class AnthropicResponseFormatError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AnthropicResponseFormatError";
  }
}

export function createAnthropicRequirementGenerationClient({
  anthropicApiKey,
  anthropicMaxTokens,
  anthropicModel,
  anthropicTemperature,
  anthropicVersion,
  fetch: fetcher = fetch,
}: {
  anthropicApiKey: string;
  anthropicMaxTokens: number;
  anthropicModel: string;
  anthropicTemperature: number;
  anthropicVersion: string;
  fetch?: AnthropicFetch;
}): RequirementGenerationModelClient {
  return {
    async checkAvailability() {
      await postAnthropicMessages({
        anthropicApiKey,
        anthropicVersion,
        body: {
          model: anthropicModel,
          max_tokens: 8,
          temperature: 0,
          system: "Reply with OK.",
          messages: [
            {
              role: "user",
              content: "OK",
            },
          ],
        },
        fetcher,
      });
    },
    async generateDraft(input) {
      let lastError: unknown = null;
      let previousResponseText: string | null = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await postAnthropicMessages({
          anthropicApiKey,
          anthropicVersion,
          body: {
            model: anthropicModel,
            max_tokens: anthropicMaxTokens,
            temperature: attempt === 0 ? anthropicTemperature : 0,
            system: buildSystemPrompt(),
            tools: [requirementDraftTool],
            tool_choice: {
              type: "tool",
              name: requirementDraftToolName,
            },
            messages: [
              {
                role: "user",
                content:
                  attempt === 0
                    ? buildUserPrompt(input)
                    : buildRepairPrompt(input, previousResponseText),
              },
            ],
          },
          fetcher,
        });

        const responsePayload = extractAnthropicDraftResponse(response);
        const parsed = parseDraftResponse(responsePayload);
        if (parsed.success) {
          return parsed.data;
        }

        lastError = parsed.error;
        previousResponseText = stringifyRejectedResponse(responsePayload);
      }

      throw new AnthropicResponseFormatError(
        "Anthropic returned a draft that did not match the expected structure.",
        { cause: lastError },
      );
    },
  };
}

export function classifyAnthropicAvailabilityFailure(
  cause: unknown,
): Exclude<RequirementGenerationUnavailableReason, "missing-config"> {
  const status = getStatus(cause);
  const message = getErrorMessage(cause).toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("invalid api key")
  ) {
    return "blocked";
  }

  return "check-failed";
}

async function postAnthropicMessages({
  anthropicApiKey,
  anthropicVersion,
  body,
  fetcher,
}: {
  anthropicApiKey: string;
  anthropicVersion: string;
  body: Record<string, unknown>;
  fetcher: AnthropicFetch;
}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(anthropicMessagesEndpoint, {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": anthropicVersion,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new AnthropicRequestError(
      "Real requirement generation could not reach Anthropic.",
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new AnthropicRequestError(
      `Real requirement generation could not reach Anthropic. HTTP status ${response.status}.`,
      { status: response.status },
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new AnthropicResponseFormatError(
      "Anthropic returned a response body that could not be parsed.",
      { cause: error },
    );
  }
}

function extractAnthropicDraftResponse(response: unknown): string | unknown {
  const toolInput = extractAnthropicToolInputResponse(response);
  if (toolInput !== null) {
    return toolInput;
  }

  return extractAnthropicTextResponse(response);
}

function extractAnthropicToolInputResponse(response: unknown): unknown | null {
  if (!isRecord(response) || !Array.isArray(response.content)) {
    return null;
  }

  for (const item of response.content) {
    if (
      isRecord(item) &&
      item.type === "tool_use" &&
      item.name === requirementDraftToolName &&
      "input" in item
    ) {
      return item.input;
    }
  }

  return null;
}

function extractAnthropicTextResponse(response: unknown): string {
  if (!isRecord(response) || !Array.isArray(response.content)) {
    throw new AnthropicResponseFormatError(
      "Anthropic returned an empty response body for requirement generation.",
    );
  }

  const text = response.content
    .map((item) => {
      if (
        isRecord(item) &&
        item.type === "text" &&
        typeof item.text === "string"
      ) {
        return item.text;
      }

      return null;
    })
    .filter((value): value is string => typeof value === "string")
    .join("\n")
    .trim();

  if (!text) {
    throw new AnthropicResponseFormatError(
      "Anthropic returned an empty response body for requirement generation.",
    );
  }

  return text;
}

function stringifyRejectedResponse(responsePayload: unknown): string {
  if (typeof responsePayload === "string") {
    return responsePayload;
  }

  try {
    return JSON.stringify(responsePayload);
  } catch {
    return "[unserializable structured response]";
  }
}

function buildRepairPrompt(
  input: Parameters<typeof buildUserPrompt>[0],
  previousResponseText: string | null,
) {
  return [
    buildUserPrompt(input),
    "",
    "The previous model response was rejected because it did not match the required JSON contract.",
    "Regenerate the same draft as strict JSON only.",
    "Do not include markdown, commentary, extra keys, nested confidence objects, or numbered prose outside JSON.",
    "Use these exact keys: generatedComment, confidenceLevel, confidenceRationale, assumptions, warnings, demoSteps.",
    "For each demo step, use these exact keys: title, mesModuleOrScreen, reviewStatus, instructions.",
    "Keep confidenceLevel lowercase: high, medium, or low.",
    "Keep reviewStatus lowercase: draft or consultant-review.",
    previousResponseText
      ? `Previous rejected response excerpt:\n${previousResponseText.slice(0, 2000)}`
      : null,
  ]
    .filter((value): value is string => typeof value === "string")
    .join("\n");
}

function getStatus(value: unknown): number | null {
  if (value instanceof AnthropicRequestError) {
    return value.status;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof value.status === "number"
  ) {
    return value.status;
  }

  return null;
}

function getErrorMessage(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }

  if (value instanceof Error) {
    return value.message;
  }

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
