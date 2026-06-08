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
      const response = await postAnthropicMessages({
        anthropicApiKey,
        anthropicVersion,
        body: {
          model: anthropicModel,
          max_tokens: anthropicMaxTokens,
          temperature: anthropicTemperature,
          system: buildSystemPrompt(),
          messages: [
            {
              role: "user",
              content: buildUserPrompt(input),
            },
          ],
        },
        fetcher,
      });

      const responseText = extractAnthropicTextResponse(response);
      const parsed = parseDraftResponse(responseText);
      if (!parsed.success) {
        throw new AnthropicResponseFormatError(
          "Anthropic returned a draft that did not match the expected structure.",
          { cause: parsed.error },
        );
      }

      return parsed.data;
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
