import { z } from "zod";
import type {
  GeneratedDemoStepReviewStatus,
  RequirementGenerationConfidenceLevel,
  RequirementSupportAssessment,
} from "../generation";
import type { ParsedRequirement } from "../types";
import type { McpDocumentationChunk } from "./mcp-client";

const demoStepSchema = z.object({
  title: z.string().trim().min(1),
  mesModuleOrScreen: z.string().trim().min(1),
  reviewStatus: z.preprocess(
    normalizeReviewStatus,
    z.enum(["draft", "consultant-review"]),
  ),
  instructions: z.array(nonEmptyStringSchema()).min(2),
});

const generatedDraftSchema = z.object({
  generatedComment: z.string().trim().min(1),
  confidenceLevel: z.preprocess(
    normalizeConfidenceLevel,
    z.enum(["high", "medium", "low"]),
  ),
  confidenceRationale: z.string().trim().min(1),
  assumptions: z.preprocess(arrayOrEmpty, z.array(nonEmptyStringSchema())),
  warnings: z.preprocess(arrayOrEmpty, z.array(nonEmptyStringSchema())),
  demoSteps: z.preprocess(arrayOrEmpty, z.array(demoStepSchema).min(1)),
});

export interface RequirementGenerationModelDraft {
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

export interface RequirementGenerationModelInput {
  requirement: ParsedRequirement;
  assessment: RequirementSupportAssessment;
  documentation: McpDocumentationChunk[];
  mesBaseUrl: string | null;
}

export interface RequirementGenerationModelClient {
  checkAvailability(): Promise<void>;
  generateDraft(
    input: RequirementGenerationModelInput,
  ): Promise<RequirementGenerationModelDraft>;
}

export function buildSystemPrompt(): string {
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

export function buildUserPrompt(input: RequirementGenerationModelInput): string {
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
    "- confidenceLevel must be exactly one lowercase value: high, medium, or low.",
    "- assumptions and warnings must each contain at most 5 strings.",
    "- demoSteps must contain 1-4 steps.",
    "- Each demo step must contain 2-5 instruction strings.",
    "- reviewStatus must be exactly draft or consultant-review.",
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

export function parseDraftResponse(
  responsePayload: string | unknown,
):
  | { success: true; data: RequirementGenerationModelDraft }
  | { success: false; error: unknown } {
  const jsonValue =
    typeof responsePayload === "string"
      ? extractJsonValue(responsePayload)
      : responsePayload;
  if (jsonValue === null) {
    return {
      success: false,
      error: new Error("No JSON object was found in the model response."),
    };
  }

  const parsed = generatedDraftSchema.safeParse(
    normalizeDraftJsonValue(jsonValue),
  );
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
      assumptions: parsed.data.assumptions.slice(0, 5),
      warnings: parsed.data.warnings.slice(0, 5),
      demoSteps: parsed.data.demoSteps.slice(0, 4).map((step) => ({
        ...step,
        instructions: step.instructions.slice(0, 5),
      })),
    },
  };
}

export function extractJsonValue(text: string): unknown | null {
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

function normalizeDraftJsonValue(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const confidence = readRecord(value, "confidence");
  const rawSteps = readFirstDefined(value, [
    "demoSteps",
    "demo_steps",
    "steps",
    "demo",
  ]);

  return {
    ...value,
    generatedComment:
      readStringAlias(value, [
        "generatedComment",
        "generated_comment",
        "comment",
        "consultantComment",
        "consultant_comment",
      ]) ?? value.generatedComment,
    confidenceLevel:
      readStringAlias(value, ["confidenceLevel", "confidence_level"]) ??
      readStringAlias(confidence, ["level", "confidenceLevel"]) ??
      value.confidenceLevel,
    confidenceRationale:
      readStringAlias(value, [
        "confidenceRationale",
        "confidence_rationale",
        "rationale",
      ]) ??
      readStringAlias(confidence, ["rationale", "reason", "confidenceRationale"]) ??
      value.confidenceRationale,
    assumptions: normalizeStringArray(
      readFirstDefined(value, ["assumptions", "assumption"]),
    ),
    warnings: normalizeStringArray(
      readFirstDefined(value, ["warnings", "warning", "risks"]),
    ),
    demoSteps: normalizeDemoSteps(rawSteps),
  };
}

function normalizeDemoSteps(value: unknown): unknown {
  const steps = Array.isArray(value) ? value : isRecord(value) ? [value] : [];
  return steps.map((step) => {
    if (!isRecord(step)) {
      return step;
    }

    const rawInstructions = readFirstDefined(step, [
      "instructions",
      "instruction",
      "actions",
      "actionItems",
      "action_items",
    ]);

    return {
      ...step,
      title:
        readStringAlias(step, ["title", "stepTitle", "step_title", "name"]) ??
        step.title,
      mesModuleOrScreen:
        readStringAlias(step, [
          "mesModuleOrScreen",
          "mes_module_or_screen",
          "module",
          "screen",
          "mesScreen",
          "mes_screen",
        ]) ?? step.mesModuleOrScreen,
      reviewStatus:
        readStringAlias(step, ["reviewStatus", "review_status", "status"]) ??
        step.reviewStatus,
      instructions: normalizeInstructionArray(rawInstructions),
    };
  });
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(stringifyLoose).filter(hasText);
  }

  const text = stringifyLoose(value);
  return hasText(text) ? [text] : [];
}

function normalizeInstructionArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(stringifyLoose).filter(hasText);
  }

  const text = stringifyLoose(value);
  if (!hasText(text)) {
    return [];
  }

  return text
    .split(/\n+|(?:^|\s)\d+[.)]\s+|;\s+/)
    .map((part) => part.replace(/^[-*]\s+/, "").trim())
    .filter(hasText);
}

function nonEmptyStringSchema() {
  return z.preprocess(
    (value) =>
      typeof value === "string"
        ? value
        : value == null
          ? ""
          : String(value),
    z.string().trim().min(1),
  );
}

function arrayOrEmpty(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeConfidenceLevel(value: unknown): unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

function normalizeReviewStatus(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (
    normalized === "review" ||
    normalized === "needs-review" ||
    normalized === "consultant-review-needed"
  ) {
    return "consultant-review";
  }

  return normalized;
}

function readFirstDefined(
  value: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (value[key] !== undefined) {
      return value[key];
    }
  }

  return undefined;
}

function readStringAlias(
  value: Record<string, unknown> | null,
  keys: string[],
): string | null {
  if (value === null) {
    return null;
  }

  for (const key of keys) {
    const text = stringifyLoose(value[key]);
    if (hasText(text)) {
      return text;
    }
  }

  return null;
}

function readRecord(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const nextValue = value[key];
  return isRecord(nextValue) ? nextValue : null;
}

function stringifyLoose(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
