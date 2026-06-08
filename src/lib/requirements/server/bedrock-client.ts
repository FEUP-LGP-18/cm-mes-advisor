import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type {
  RequirementGenerationUnavailableReason,
} from "../generation-api";
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseDraftResponse,
  type RequirementGenerationModelClient,
  type RequirementGenerationModelDraft,
} from "./model-draft-contract";

export type BedrockRequirementGenerationDraft = RequirementGenerationModelDraft;
export type BedrockRequirementGenerationClient =
  RequirementGenerationModelClient;

export class BedrockRequestError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BedrockRequestError";
  }
}

export class BedrockResponseFormatError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BedrockResponseFormatError";
  }
}

export function createBedrockRequirementGenerationClient({
  awsAccessKeyId,
  awsBearerTokenBedrock,
  awsRegion,
  awsSecretAccessKey,
  awsSessionToken,
  bedrockModelId,
}: {
  awsAccessKeyId: string | null;
  awsBearerTokenBedrock: string | null;
  awsRegion: string;
  awsSecretAccessKey: string | null;
  awsSessionToken: string | null;
  bedrockModelId: string;
}): BedrockRequirementGenerationClient {
  const client = createBedrockRuntimeClient({
    awsAccessKeyId,
    awsBearerTokenBedrock,
    awsRegion,
    awsSecretAccessKey,
    awsSessionToken,
  });

  return {
    async checkAvailability() {
      try {
        await client.send(
          new ConverseCommand({
            modelId: bedrockModelId,
            inferenceConfig: {
              maxTokens: 8,
              temperature: 0,
            },
            system: [
              {
                text: "Reply with OK.",
              },
            ],
            messages: [
              {
                role: "user",
                content: [
                  {
                    text: "OK",
                  },
                ],
              },
            ],
          }),
        );
      } catch (error) {
        throw new BedrockRequestError(
          "Real requirement generation could not reach Bedrock.",
          { cause: error },
        );
      }
    },
    async generateDraft(input) {
      const command = new ConverseCommand({
        modelId: bedrockModelId,
        inferenceConfig: {
          maxTokens: 1200,
          temperature: 0.1,
        },
        system: [
          {
            text: buildSystemPrompt(),
          },
        ],
        messages: [
          {
            role: "user",
            content: [
              {
                text: buildUserPrompt(input),
              },
            ],
          },
        ],
      });

      let responseText = "";
      try {
        const response = await client.send(command);
        responseText = extractBedrockTextResponse(response);
      } catch (error) {
        throw new BedrockRequestError(
          "Real requirement generation could not reach Bedrock.",
          { cause: error },
        );
      }

      const parsed = parseDraftResponse(responseText);
      if (!parsed.success) {
        throw new BedrockResponseFormatError(
          "Bedrock returned a draft that did not match the expected structure.",
          { cause: parsed.error },
        );
      }

      return parsed.data;
    },
  };
}

export function classifyBedrockAvailabilityFailure(
  cause: unknown,
): Exclude<RequirementGenerationUnavailableReason, "missing-config"> {
  const name = getErrorName(cause);
  const message = getErrorMessage(cause).toLowerCase();

  if (
    name === "AccessDeniedException" ||
    name === "UnrecognizedClientException" ||
    name === "InvalidSignatureException" ||
    name === "ExpiredTokenException" ||
    name === "UnauthorizedException" ||
    message.includes("accessdenied") ||
    message.includes("access denied") ||
    message.includes("callwithbearertoken") ||
    message.includes("unrecognizedclient") ||
    message.includes("invalid security token") ||
    message.includes("security token included in the request is invalid") ||
    message.includes("not authorized") ||
    message.includes("unauthorized")
  ) {
    return "blocked";
  }

  return "check-failed";
}

function createBedrockRuntimeClient({
  awsAccessKeyId,
  awsBearerTokenBedrock,
  awsRegion,
  awsSecretAccessKey,
  awsSessionToken,
}: {
  awsAccessKeyId: string | null;
  awsBearerTokenBedrock: string | null;
  awsRegion: string;
  awsSecretAccessKey: string | null;
  awsSessionToken: string | null;
}) {
  return new BedrockRuntimeClient(
    awsBearerTokenBedrock !== null
      ? {
          authSchemePreference: ["httpBearerAuth"],
          region: awsRegion,
          token: {
            token: awsBearerTokenBedrock,
          },
        }
      : {
          region: awsRegion,
          credentials: {
            accessKeyId: awsAccessKeyId!,
            secretAccessKey: awsSecretAccessKey!,
            sessionToken: awsSessionToken ?? undefined,
          },
        },
  );
}

function extractBedrockTextResponse(response: {
  output?: {
    message?: {
      content?: Array<{
        text?: string;
      }>;
    };
  };
}): string {
  const text = response.output?.message?.content
    ?.map((item) => item.text)
    .filter((value): value is string => typeof value === "string")
    .join("\n")
    .trim();

  if (!text) {
    throw new BedrockResponseFormatError(
      "Bedrock returned an empty response body for requirement generation.",
    );
  }

  return text;
}

function getErrorName(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string"
  ) {
    return value.name;
  }

  return "";
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
