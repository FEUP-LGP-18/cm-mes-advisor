import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";
import type { RequirementGenerationUnavailableReason } from "@/lib/requirements/generation-api";
import { classifyBedrockAvailabilityFailure } from "@/lib/requirements/server/bedrock-client";
import {
  getMissingRealGenerationConfigKeys,
  readRequirementGenerationServerConfig,
  type RequirementGenerationServerConfig,
} from "@/lib/requirements/server/config";
import {
  AnthropicRequestError,
  AnthropicResponseFormatError,
  classifyAnthropicAvailabilityFailure,
} from "@/lib/requirements/server/anthropic-client";
import {
  createRequirementDocumentationClient,
  type McpDocumentationChunk,
  type RequirementDocumentationClient,
} from "@/lib/requirements/server/mcp-client";
import { createSelfHostedRequirementDocumentationClient } from "@/lib/requirements/server/self-mcp-docs";
import type { MasterDataGenerateRequestBody } from "../api";
import type { MasterDataConfidence, MasterDataObjectType } from "../types";

const anthropicMessagesEndpoint = "https://api.anthropic.com/v1/messages";
const masterDataSuggestionToolName = "emit_master_data_suggestion";
const masterDataSuggestionTool = {
  name: masterDataSuggestionToolName,
  description:
    "Emit one structured CM MES Phase 2 Master Data suggestion. Use this tool for every Master Data suggestion response.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      description: {
        type: "string",
        description:
          "Short review-friendly object description grounded in the selected requirements and documentation.",
      },
      nameHint: {
        type: "string",
        description: "Optional object name hint.",
      },
      typeHint: {
        type: "string",
        description: "Optional object type or schema hint.",
      },
      confidenceLevel: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
      confidenceRationale: {
        type: "string",
      },
      warnings: {
        type: "array",
        maxItems: 5,
        items: { type: "string" },
      },
    },
    required: [
      "description",
      "confidenceLevel",
      "confidenceRationale",
      "warnings",
    ],
  },
};

const masterDataSuggestionSchema = z.object({
  description: z.string().trim().min(1),
  nameHint: z.string().trim().optional(),
  typeHint: z.string().trim().optional(),
  confidenceLevel: z.enum(["high", "medium", "low"]),
  confidenceRationale: z.string().trim().min(1),
  warnings: z.array(z.string().trim().min(1)).max(5).default([]),
});

interface MasterDataAiSuggestion {
  confidence: MasterDataConfidence;
  description?: string;
  nameHint?: string;
  typeHint?: string;
  warnings?: string[];
}

type MasterDataModelClient =
  | {
      provider: "anthropic";
      anthropicApiKey: string;
      anthropicMaxTokens: number;
      anthropicModel: string;
      anthropicTemperature: number;
      anthropicVersion: string;
    }
  | {
      provider: "bedrock";
      bedrockModelId: string;
      bedrockRuntimeClient: BedrockRuntimeClient;
    };

export class MasterDataRealGenerationUnavailableError extends Error {
  readonly reason: RequirementGenerationUnavailableReason;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      reason: RequirementGenerationUnavailableReason;
    },
  ) {
    super(message, options);
    this.name = "MasterDataRealGenerationUnavailableError";
    this.reason = options.reason;
  }
}

export async function buildMasterDataAiSuggestions({
  mode,
  requirements,
  selectedObjectTypes,
}: Pick<
  MasterDataGenerateRequestBody,
  "mode" | "requirements" | "selectedObjectTypes"
>): Promise<Partial<Record<MasterDataObjectType, MasterDataAiSuggestion>>> {
  if (mode !== "real") {
    return {};
  }

  const config = readRequirementGenerationServerConfig();
  if (getMissingRealGenerationConfigKeys(config).length > 0) {
    throw new MasterDataRealGenerationUnavailableError(
      "Grounded Master Data generation is not configured for this environment.",
      {
        reason: "missing-config",
      },
    );
  }

  const documentationClient = await createMasterDataDocumentationClient(
    config,
  ).catch((error) => {
    throw new MasterDataRealGenerationUnavailableError(
      "The Master Data documentation lookup client could not be initialized.",
      {
        cause: error,
        reason: "check-failed",
      },
    );
  });
  const modelClient = createMasterDataModelClient(config);

  try {
    const suggestions: Partial<
      Record<MasterDataObjectType, MasterDataAiSuggestion>
    > = {};

    for (const objectType of selectedObjectTypes) {
      const scopedRequirements = requirements
        .filter((requirement) => matchesObjectType(requirement, objectType))
        .slice(0, 2);
      const representativeRequirements =
        scopedRequirements.length > 0
          ? scopedRequirements
          : requirements.slice(0, 2);

      const documentation = await collectDocumentationChunks(
        documentationClient,
        representativeRequirements,
      );

      if (representativeRequirements.length === 0) {
        continue;
      }

      try {
        const suggestion = await generateSuggestionForObjectType({
          documentation,
          modelClient,
          objectType,
          requirements: representativeRequirements,
        });
        if (suggestion !== undefined) {
          suggestions[objectType] = suggestion;
        }
      } catch (error) {
        if (error instanceof MasterDataRealGenerationUnavailableError) {
          throw error;
        }
      }
    }

    return suggestions;
  } finally {
    await documentationClient.close();
  }
}

async function createMasterDataDocumentationClient(
  config: RequirementGenerationServerConfig,
): Promise<RequirementDocumentationClient> {
  if (config.mcpServerUrlKind === "self") {
    return createSelfHostedRequirementDocumentationClient();
  }

  return createRequirementDocumentationClient({
    mcpServerUrl: config.mcpServerUrl!,
    mcpUserAccount: config.mcpUserAccount,
  });
}

function createMasterDataModelClient(
  config: RequirementGenerationServerConfig,
): MasterDataModelClient {
  if (config.generationProvider === "anthropic") {
    return {
      provider: "anthropic",
      anthropicApiKey: config.anthropicApiKey!,
      anthropicMaxTokens: config.anthropicMaxTokens,
      anthropicModel: config.anthropicModel!,
      anthropicTemperature: config.anthropicTemperature,
      anthropicVersion: config.anthropicVersion,
    };
  }

  return {
    provider: "bedrock",
    bedrockModelId: config.bedrockModelId!,
    bedrockRuntimeClient: createBedrockRuntimeClient({
      awsAccessKeyId: config.awsAccessKeyId,
      awsBearerTokenBedrock: config.awsBearerTokenBedrock,
      awsRegion: config.awsRegion!,
      awsSecretAccessKey: config.awsSecretAccessKey,
      awsSessionToken: config.awsSessionToken,
    }),
  };
}

async function collectDocumentationChunks(
  documentationClient: RequirementDocumentationClient,
  requirements: MasterDataGenerateRequestBody["requirements"],
) {
  const chunks = await Promise.all(
    requirements.map(async (requirement) => {
      try {
        const result =
          await documentationClient.lookupRequirementDocumentation(requirement);
        return result.allChunks;
      } catch {
        return [] as McpDocumentationChunk[];
      }
    }),
  );

  return dedupeChunks(chunks.flat()).slice(0, 4);
}

async function generateSuggestionForObjectType({
  documentation,
  modelClient,
  objectType,
  requirements,
}: {
  documentation: McpDocumentationChunk[];
  modelClient: MasterDataModelClient;
  objectType: MasterDataObjectType;
  requirements: MasterDataGenerateRequestBody["requirements"];
}) {
  if (modelClient.provider === "anthropic") {
    return generateAnthropicSuggestionForObjectType({
      documentation,
      modelClient,
      objectType,
      requirements,
    });
  }

  return generateBedrockSuggestionForObjectType({
    documentation,
    modelClient,
    objectType,
    requirements,
  });
}

async function generateBedrockSuggestionForObjectType({
  documentation,
  modelClient,
  objectType,
  requirements,
}: {
  documentation: McpDocumentationChunk[];
  modelClient: Extract<MasterDataModelClient, { provider: "bedrock" }>;
  objectType: MasterDataObjectType;
  requirements: MasterDataGenerateRequestBody["requirements"];
}) {
  let responseText = "";

  try {
    const response = await modelClient.bedrockRuntimeClient.send(
      new ConverseCommand({
        modelId: modelClient.bedrockModelId,
        inferenceConfig: {
          maxTokens: 800,
          temperature: 0.1,
        },
        system: [
          {
            text: buildSuggestionSystemPrompt(),
          },
        ],
        messages: [
          {
            role: "user",
            content: [
              {
                text: buildSuggestionUserPrompt({
                  documentation,
                  objectType,
                  requirements,
                }),
              },
            ],
          },
        ],
      }),
    );
    responseText = extractBedrockTextResponse(response);
  } catch (error) {
    throw new MasterDataRealGenerationUnavailableError(
      "Grounded Master Data generation could not reach Bedrock.",
      {
        cause: error,
        reason: classifyBedrockAvailabilityFailure(error),
      },
    );
  }

  const parsed = parseSuggestion(responseText);
  if (!parsed) {
    return undefined;
  }

  return {
    confidence: {
      level: parsed.confidenceLevel,
      rationale: parsed.confidenceRationale,
    },
    description: parsed.description,
    nameHint: parsed.nameHint,
    typeHint: parsed.typeHint,
    warnings: parsed.warnings,
  } satisfies MasterDataAiSuggestion;
}

async function generateAnthropicSuggestionForObjectType({
  documentation,
  modelClient,
  objectType,
  requirements,
}: {
  documentation: McpDocumentationChunk[];
  modelClient: Extract<MasterDataModelClient, { provider: "anthropic" }>;
  objectType: MasterDataObjectType;
  requirements: MasterDataGenerateRequestBody["requirements"];
}) {
  let response: unknown;

  try {
    response = await postAnthropicMessages({
      anthropicApiKey: modelClient.anthropicApiKey,
      anthropicVersion: modelClient.anthropicVersion,
      body: {
        model: modelClient.anthropicModel,
        max_tokens: modelClient.anthropicMaxTokens,
        temperature: modelClient.anthropicTemperature,
        system: buildSuggestionSystemPrompt(),
        tools: [masterDataSuggestionTool],
        tool_choice: {
          type: "tool",
          name: masterDataSuggestionToolName,
        },
        messages: [
          {
            role: "user",
            content: buildSuggestionUserPrompt({
              documentation,
              objectType,
              requirements,
            }),
          },
        ],
      },
      fetcher: fetch,
    });
  } catch (error) {
    if (error instanceof AnthropicRequestError) {
      throw new MasterDataRealGenerationUnavailableError(
        "Anthropic Master Data generation is currently unavailable.",
        {
          cause: error,
          reason: classifyAnthropicAvailabilityFailure(error),
        },
      );
    }

    if (error instanceof AnthropicResponseFormatError) {
      throw new MasterDataRealGenerationUnavailableError(
        "Anthropic Master Data generation returned an unreadable response.",
        {
          cause: error,
          reason: "check-failed",
        },
      );
    }

    throw error;
  }

  const parsed = parseSuggestion(extractAnthropicSuggestionResponse(response));
  if (!parsed) {
    return undefined;
  }

  return {
    confidence: {
      level: parsed.confidenceLevel,
      rationale: parsed.confidenceRationale,
    },
    description: parsed.description,
    nameHint: parsed.nameHint,
    typeHint: parsed.typeHint,
    warnings: parsed.warnings,
  } satisfies MasterDataAiSuggestion;
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

async function postAnthropicMessages({
  anthropicApiKey,
  anthropicVersion,
  body,
  fetcher,
}: {
  anthropicApiKey: string;
  anthropicVersion: string;
  body: Record<string, unknown>;
  fetcher: typeof fetch;
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
      "Real Master Data generation could not reach Anthropic.",
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new AnthropicRequestError(
      `Real Master Data generation could not reach Anthropic. HTTP status ${response.status}.`,
      { status: response.status },
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new AnthropicResponseFormatError(
      "Anthropic returned a Master Data response body that could not be parsed.",
      { cause: error },
    );
  }
}

function buildSuggestionSystemPrompt() {
  return [
    "You are helping generate Phase 2 Master Data objects for Critical Manufacturing MES.",
    "Return JSON only with no markdown fences.",
    "Use the selected requirements and documentation excerpts to suggest a safe object description and any useful type hints.",
    "Do not invent schema fields beyond the requested output.",
    "Keep the result cautious and review-oriented when documentation is indirect.",
  ].join(" ");
}

function buildSuggestionUserPrompt({
  documentation,
  objectType,
  requirements,
}: {
  documentation: McpDocumentationChunk[];
  objectType: MasterDataObjectType;
  requirements: MasterDataGenerateRequestBody["requirements"];
}) {
  const requirementSummary = requirements
    .map(
      (requirement) =>
        `- ${requirement.requirementId || requirement.sourceRowNumber}: ${requirement.requirementDescription} | ${requirement.l2Process} | ${requirement.l3Process} | ${requirement.operation}`,
    )
    .join("\n");
  const evidence = documentation
    .map((chunk, index) => {
      return [
        `Evidence ${index + 1}`,
        `Title: ${chunk.title ?? "Untitled chunk"}`,
        `Excerpt: ${chunk.text.slice(0, 900)}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    `Object type: ${objectType}`,
    "",
    "Selected requirements",
    requirementSummary || "(none)",
    "",
    "Documentation evidence",
    evidence || "(none)",
    "",
    "Return JSON with this exact shape:",
    "{",
    '  "description": "short review-friendly description",',
    '  "nameHint": "optional object name hint",',
    '  "typeHint": "optional schema/type hint",',
    '  "confidenceLevel": "high|medium|low",',
    '  "confidenceRationale": "why",',
    '  "warnings": ["warning"]',
    "}",
  ].join("\n");
}

function parseSuggestion(responsePayload: unknown) {
  try {
    const parsed =
      typeof responsePayload === "string"
        ? JSON.parse(extractJsonObject(responsePayload))
        : responsePayload;
    const result = masterDataSuggestionSchema.safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function extractAnthropicSuggestionResponse(response: unknown): unknown {
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
      item.name === masterDataSuggestionToolName &&
      "input" in item
    ) {
      return item.input;
    }
  }

  return null;
}

function extractAnthropicTextResponse(response: unknown): string {
  if (!isRecord(response) || !Array.isArray(response.content)) {
    return "";
  }

  return response.content
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
}

function extractJsonObject(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractBedrockTextResponse(response: {
  output?: {
    message?: {
      content?: Array<{
        text?: string;
      }>;
    };
  };
}) {
  const text = response.output?.message?.content
    ?.map((entry) => entry.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Bedrock returned an empty response.");
  }

  return text;
}

function dedupeChunks(chunks: McpDocumentationChunk[]) {
  const byId = new Map<string, McpDocumentationChunk>();

  chunks.forEach((chunk) => {
    const key = `${chunk.id}:${chunk.sourceUrl ?? ""}`;
    if (!byId.has(key)) {
      byId.set(key, chunk);
    }
  });

  return Array.from(byId.values());
}

function matchesObjectType(
  requirement: MasterDataGenerateRequestBody["requirements"][number],
  objectType: MasterDataObjectType,
) {
  const text = [
    requirement.requirementDescription,
    requirement.detailDescriptionAndMotivation,
    requirement.l2Process,
    requirement.l3Process,
    requirement.operation,
    requirement.sourceComment,
    requirement.consultantComment,
  ]
    .join(" ")
    .toLowerCase();

  switch (objectType) {
    case "enterprise":
      return text.includes("enterprise") || text.includes("multi-site");
    case "site":
      return text.includes("site") || text.includes("plant");
    case "facility":
      return text.includes("facility") || text.includes("factory");
    case "area":
      return text.includes("area") || text.includes("manufacturing");
    case "resource":
      return (
        text.includes("resource") ||
        text.includes("equipment") ||
        text.includes("operation") ||
        text.includes("packing")
      );
    case "product":
      return text.includes("product") || text.includes("setup");
    case "material":
      return (
        text.includes("material") ||
        text.includes("trace") ||
        text.includes("batch") ||
        text.includes("serial")
      );
  }
}
