import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";
import type {
  GeneratedDemoStepReviewStatus,
  RequirementGenerationConfidenceLevel,
  RequirementSupportAssessment,
} from "../generation";
import type {
  RequirementGenerationUnavailableReason,
} from "../generation-api";
import type { ParsedRequirement } from "../types";
import type { McpDocumentationChunk } from "./mcp-client";

const generatedDraftSchema = z.object({
  generatedComment: z.string().trim().min(1),
  confidenceLevel: z.enum(["high", "medium", "low"]),
  confidenceRationale: z.string().trim().min(1),
  assumptions: z.array(z.string().trim().min(1)).max(5),
  warnings: z.array(z.string().trim().min(1)).max(5),
  demoSteps: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        mesModuleOrScreen: z.string().trim().min(1),
        reviewStatus: z.enum(["draft", "consultant-review"]),
        instructions: z.array(z.string().trim().min(1)).min(2).max(5),
      }),
    )
    .min(1)
    .max(4),
});

export interface BedrockRequirementGenerationDraft {
  generatedComment: string;
  confidenceLevel: RequirementGenerationConfidenceLevel;
  confidenceRationale: string;
  assumptions: string[];
  warnings: string[];
  demoSteps: Array<{
    title: string;
    mesModuleOrScreen: string;
    reviewStatus: GeneratedDemoStepReviewStatus;
    instructions: string[];
  }>;
}

export interface BedrockRequirementGenerationClient {
  checkAvailability(): Promise<void>;
  generateDraft(input: {
    requirement: ParsedRequirement;
    assessment: RequirementSupportAssessment;
    documentation: McpDocumentationChunk[];
    mesBaseUrl: string | null;
  }): Promise<BedrockRequirementGenerationDraft>;
}

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

      const parsed = parseBedrockDraftResponse(responseText);
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

function buildSystemPrompt(): string {
  return [
    "You are helping generate Phase 1 outputs for a Critical Manufacturing MES demo advisor.",
    "Return JSON only.",
    "Base the answer on the provided MES documentation excerpts and requirement row.",
    "Do not invent MES features, screens, clicks, or traceability that are not supported by the evidence.",
    "Treat any existing Excel comment as a hint that must be confirmed against the documentation, not as ground truth.",
    "Make the generated comment clearly explain both what MES does and how the consultant should demonstrate it.",
    "Write demo steps with action verbs and observable outcomes.",
    "If support is partial or unclear, prefer workaround-first language and consultant review warnings rather than blunt unsupported wording.",
    "If the path is indirect, partial, custom, or extension-driven, keep the tone review-oriented and use consultant-review steps where needed.",
    "When evidence is weak, lower confidence and keep the output review-oriented.",
  ].join(" ");
}

function buildUserPrompt(input: {
  requirement: ParsedRequirement;
  assessment: RequirementSupportAssessment;
  documentation: McpDocumentationChunk[];
  mesBaseUrl: string | null;
}): string {
  const requirement = input.requirement;
  const evidence = input.documentation
    .slice(0, 4)
    .map((chunk, index) => {
      const title = chunk.title ?? "Untitled chunk";
      const source = [
        chunk.docSource,
        chunk.docVersion ? `v${chunk.docVersion}` : null,
        chunk.sourceUrl,
      ]
        .filter((value): value is string => typeof value === "string")
        .join(" | ");
      const excerpt =
        chunk.text.length > 1600
          ? `${chunk.text.slice(0, 1600).trim()}...`
          : chunk.text;

      return [
        `Evidence ${index + 1}`,
        `Title: ${title}`,
        source ? `Source: ${source}` : null,
        `Excerpt: ${excerpt}`,
      ]
        .filter((value): value is string => typeof value === "string")
        .join("\n");
    })
    .join("\n\n");

  return [
    "Generate one consultant-facing draft for this requirement row.",
    "",
    "Requirement row",
    `- Requirement ID: ${requirement.requirementId || requirement.sourceRowNumber}`,
    `- Description: ${requirement.requirementDescription || "(blank)"}`,
    `- L2 process: ${requirement.l2Process || "(blank)"}`,
    `- L3 process: ${requirement.l3Process || "(blank)"}`,
    `- Operation: ${requirement.operation || "(blank)"}`,
    `- Detail / motivation: ${requirement.detailDescriptionAndMotivation || "(blank)"}`,
    `- Existing Excel comment hint: ${requirement.sourceComment || "(blank)"}`,
    `- Availability: ${requirement.availability || "(blank)"}`,
    `- Availability CM: ${requirement.availabilityCm || "(blank)"}`,
    `- Availability description: ${requirement.descriptionAvailability || "(blank)"}`,
    `- Supported percent: ${requirement.supportedPercent || "(blank)"}`,
    `- MES base URL: ${input.mesBaseUrl ?? "(not provided)"}`,
    "",
    "Support assessment from workbook heuristics",
    `- Support type: ${input.assessment.supportType}`,
    `- Workbook confidence: ${input.assessment.confidence.level} (${input.assessment.confidence.score})`,
    `- Workbook rationale: ${input.assessment.confidence.rationale}`,
    `- Workbook assumptions: ${input.assessment.assumptions.join(" | ") || "(none)"}`,
    `- Workbook warnings: ${input.assessment.warnings.join(" | ") || "(none)"}`,
    "",
    "MES documentation evidence",
    evidence || "(no documentation excerpts were provided)",
    "",
    "Output requirements",
    "- Return valid JSON only, no markdown fences.",
    "- generatedComment must be 2-4 sentences and customer-demo ready.",
    "- generatedComment must make clear what MES does and how the consultant should demo it.",
    "- Treat the Excel comment as a hint only. Never repeat it blindly if the evidence does not support it.",
    "- demoSteps must be practical consultant steps with action verbs and observable outcomes.",
    "- Use exact click, module, or screen wording only when the documentation evidence supports that level of specificity.",
    "- If the row is indirect, partial, custom, or extension-driven, use reviewStatus 'consultant-review' for the relevant steps and keep the wording review-oriented.",
    "- Never say a feature is unsupported unless the evidence explicitly says so.",
    "",
    "Return exactly this JSON shape",
    JSON.stringify(
      {
        generatedComment: "string",
        confidenceLevel: "high",
        confidenceRationale: "string",
        assumptions: ["string"],
        warnings: ["string"],
        demoSteps: [
          {
            title: "string",
            mesModuleOrScreen: "string",
            reviewStatus: "draft",
            instructions: ["string", "string"],
          },
        ],
      },
      null,
      2,
    ),
  ].join("\n");
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

function parseBedrockDraftResponse(
  responseText: string,
):
  | { success: true; data: BedrockRequirementGenerationDraft }
  | { success: false; error: unknown } {
  const jsonValue = extractJsonValue(responseText);
  if (jsonValue === null) {
    return {
      success: false,
      error: new Error("No JSON object was found in the Bedrock response."),
    };
  }

  const parsed = generatedDraftSchema.safeParse(jsonValue);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  return {
    success: true,
    data: {
      generatedComment: parsed.data.generatedComment,
      confidenceLevel: parsed.data.confidenceLevel,
      confidenceRationale: parsed.data.confidenceRationale,
      assumptions: parsed.data.assumptions,
      warnings: parsed.data.warnings,
      demoSteps: parsed.data.demoSteps,
    },
  };
}

function extractJsonValue(text: string): unknown | null {
  const trimmed = text.trim();

  const direct = tryParseJson(trimmed);
  if (direct !== null) {
    return direct;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const parsed = tryParseJson(fenced[1].trim());
    if (parsed !== null) {
      return parsed;
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return tryParseJson(trimmed.slice(firstBrace, lastBrace + 1));
  }

  return null;
}

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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
