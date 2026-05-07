import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";
import type { RequirementGenerationUnavailableReason } from "@/lib/requirements/generation-api";
import {
  classifyBedrockAvailabilityFailure,
} from "@/lib/requirements/server/bedrock-client";
import { readRequirementGenerationServerConfig } from "@/lib/requirements/server/config";
import {
  createRequirementDocumentationClient,
  type McpDocumentationChunk,
} from "@/lib/requirements/server/mcp-client";
import type { MasterDataGenerateRequestBody } from "../api";
import type {
  MasterDataConfidence,
  MasterDataObjectType,
} from "../types";

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
  if (
    config.mcpServerUrl === null ||
    config.bedrockModelId === null ||
    config.awsRegion === null ||
    (config.awsBearerTokenBedrock === null &&
      (config.awsAccessKeyId === null || config.awsSecretAccessKey === null))
  ) {
    throw new MasterDataRealGenerationUnavailableError(
      "Grounded Master Data generation is not configured for this environment.",
      {
        reason: "missing-config",
      },
    );
  }

  const documentationClient = await createRequirementDocumentationClient({
    mcpServerUrl: config.mcpServerUrl,
    mcpUserAccount: config.mcpUserAccount,
  }).catch((error) => {
    throw new MasterDataRealGenerationUnavailableError(
      "The Master Data documentation lookup client could not be initialized.",
      {
        cause: error,
        reason: "check-failed",
      },
    );
  });
  const modelClient = createBedrockRuntimeClient({
    awsAccessKeyId: config.awsAccessKeyId,
    awsBearerTokenBedrock: config.awsBearerTokenBedrock,
    awsRegion: config.awsRegion,
    awsSecretAccessKey: config.awsSecretAccessKey,
    awsSessionToken: config.awsSessionToken,
  });

  try {
    const suggestions: Partial<Record<MasterDataObjectType, MasterDataAiSuggestion>> =
      {};

    for (const objectType of selectedObjectTypes) {
      const scopedRequirements = requirements
        .filter((requirement) => matchesObjectType(requirement, objectType))
        .slice(0, 2);
      const representativeRequirements =
        scopedRequirements.length > 0 ? scopedRequirements : requirements.slice(0, 2);

      const documentation = await collectDocumentationChunks(
        documentationClient,
        representativeRequirements,
      );

      if (representativeRequirements.length === 0) {
        continue;
      }

      try {
        suggestions[objectType] = await generateSuggestionForObjectType({
          documentation,
          modelClient,
          objectType,
          requirements: representativeRequirements,
          modelId: config.bedrockModelId,
        });
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

async function collectDocumentationChunks(
  documentationClient: Awaited<ReturnType<typeof createRequirementDocumentationClient>>,
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
  modelId,
  objectType,
  requirements,
}: {
  documentation: McpDocumentationChunk[];
  modelClient: BedrockRuntimeClient;
  modelId: string;
  objectType: MasterDataObjectType;
  requirements: MasterDataGenerateRequestBody["requirements"];
}) {
  let responseText = "";

  try {
    const response = await modelClient.send(
      new ConverseCommand({
        modelId,
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

function parseSuggestion(responseText: string) {
  try {
    const parsed = JSON.parse(responseText);
    const result = masterDataSuggestionSchema.safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
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
