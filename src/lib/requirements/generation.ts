import type { ParsedRequirement } from "./parser";

export type RequirementGenerationConfidenceLevel = "high" | "medium" | "low";

export type RequirementGenerationReferenceKind = "mock-ai" | "mcp-placeholder";

export type GeneratedDemoStepReviewStatus = "draft" | "consultant-review";

export interface RequirementGenerationIdentity {
  requirementKey: string;
  requirementId: string;
  sourceRowNumber: number;
}

export interface RequirementGenerationSourceReference {
  id: string;
  kind: RequirementGenerationReferenceKind;
  label: string;
  note: string;
}

export interface RequirementGenerationConfidence {
  level: RequirementGenerationConfidenceLevel;
  score: number;
  rationale: string;
}

export interface GeneratedDemoStep {
  id: string;
  title: string;
  instructions: string[];
  relatedRequirementIds: string[];
  mesModuleOrScreen: string;
  sourceReferences: RequirementGenerationSourceReference[];
  reviewStatus: GeneratedDemoStepReviewStatus;
}

export interface GeneratedRequirementDraft {
  schemaVersion: 1;
  generator: "mock-ai";
  generatedAt: "deterministic-mock";
  requirement: RequirementGenerationIdentity;
  generatedComment: string;
  demoSteps: GeneratedDemoStep[];
  confidence: RequirementGenerationConfidence;
  assumptions: string[];
  warnings: string[];
  sourceReferences: RequirementGenerationSourceReference[];
}

export interface RequirementSupportAssessment {
  supportType: "standard" | "partial-or-custom" | "unclear";
  confidence: RequirementGenerationConfidence;
  assumptions: string[];
  warnings: string[];
}

export const mockGenerationStageLabels = [
  "Excel parsing",
  "MES knowledge lookup",
  "Comment generation",
  "Demo script generation",
] as const;

export type MockGenerationStage = (typeof mockGenerationStageLabels)[number];

export function createMockGeneratedRequirementDraft(
  requirement: ParsedRequirement,
): GeneratedRequirementDraft {
  const identity = createRequirementGenerationIdentity(requirement);
  const sourceReferences = createMockSourceReferences(requirement);
  const assessment = assessRequirementSupport(requirement);
  const processPath = formatProcessPath(requirement);
  const requirementName =
    requirement.requirementDescription.trim() ||
    `requirement ${identity.requirementId || identity.sourceRowNumber}`;
  const comment = createGeneratedComment(
    requirementName,
    processPath,
    assessment,
  );

  return {
    schemaVersion: 1,
    generator: "mock-ai",
    generatedAt: "deterministic-mock",
    requirement: identity,
    generatedComment: comment,
    demoSteps: createDemoSteps(
      requirement,
      assessment.supportType,
      processPath,
      sourceReferences,
    ),
    confidence: assessment.confidence,
    assumptions: assessment.assumptions,
    warnings: assessment.warnings,
    sourceReferences,
  };
}

export function createRequirementGenerationIdentity(
  requirement: Pick<ParsedRequirement, "sourceRowNumber" | "requirementId">,
): RequirementGenerationIdentity {
  return {
    requirementKey: `${requirement.sourceRowNumber}:${
      requirement.requirementId.trim() || "no-id"
    }`,
    requirementId: requirement.requirementId.trim(),
    sourceRowNumber: requirement.sourceRowNumber,
  };
}

export function isGeneratedRequirementDraft(
  value: unknown,
): value is GeneratedRequirementDraft {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    value.generator === "mock-ai" &&
    value.generatedAt === "deterministic-mock" &&
    isRecord(value.requirement) &&
    typeof value.requirement.requirementKey === "string" &&
    typeof value.requirement.requirementId === "string" &&
    typeof value.requirement.sourceRowNumber === "number" &&
    typeof value.generatedComment === "string" &&
    Array.isArray(value.demoSteps) &&
    value.demoSteps.every(isGeneratedDemoStep) &&
    isRecord(value.confidence) &&
    isRequirementGenerationConfidenceLevel(value.confidence.level) &&
    typeof value.confidence.score === "number" &&
    typeof value.confidence.rationale === "string" &&
    Array.isArray(value.assumptions) &&
    value.assumptions.every((assumption) => typeof assumption === "string") &&
    Array.isArray(value.warnings) &&
    value.warnings.every((warning) => typeof warning === "string") &&
    Array.isArray(value.sourceReferences) &&
    value.sourceReferences.every(isRequirementGenerationSourceReference)
  );
}

export function assessRequirementSupport(
  requirement: ParsedRequirement,
): RequirementSupportAssessment {
  const searchableText = [
    requirement.availability,
    requirement.availabilityCm,
    requirement.descriptionAvailability,
    requirement.supportedPercent,
  ]
    .join(" ")
    .toLowerCase();
  const hasRequirementText =
    requirement.requirementDescription.trim().length > 0;
  const supportedPercent = parseSupportedPercent(requirement.supportedPercent);
  const isLowerSupportedPercent =
    supportedPercent !== null && supportedPercent < 100;
  const isPartialOrCustom =
    isLowerSupportedPercent ||
    includesAny(searchableText, [
      "partial",
      "custom",
      "customization",
      "not supported",
      "not available",
      "workaround",
    ]);
  const isStandard =
    !isPartialOrCustom &&
    (supportedPercent === 100 ||
      includesAny(searchableText, [
        "standard",
        "configuration",
        "configurable",
        "available",
        "supported",
      ]));

  if (!hasRequirementText) {
    return {
      supportType: "unclear",
      confidence: {
        level: "low",
        score: 0.38,
        rationale:
          "The source row has limited requirement text, so the mock draft should be reviewed by a consultant.",
      },
      assumptions: [
        "The row belongs to the parsed Customer X requirements workbook.",
      ],
      warnings: [
        "Consultant review needed because the requirement description is empty or too sparse.",
      ],
    };
  }

  if (isPartialOrCustom) {
    return {
      supportType: "partial-or-custom",
      confidence: {
        level: "medium",
        score: isLowerSupportedPercent ? 0.62 : 0.68,
        rationale:
          "Availability data indicates partial support, a custom path, or a supported percentage below full coverage.",
      },
      assumptions: [
        "The generated workaround should be validated against the future MCP-backed MES documentation lookup.",
        "The consultant can decide whether this row belongs in the current demo slice.",
      ],
      warnings: [
        "Consultant review recommended: use a workaround-first explanation and confirm the exact MES behavior before presenting.",
      ],
    };
  }

  if (isStandard) {
    return {
      supportType: "standard",
      confidence: {
        level: "high",
        score: 0.9,
        rationale:
          "Availability data suggests standard or configuration-based support.",
      },
      assumptions: [
        "The future MCP-backed lookup will replace these mock source placeholders.",
      ],
      warnings: [],
    };
  }

  return {
    supportType: "unclear",
    confidence: {
      level: "medium",
      score: 0.56,
      rationale:
        "The source row does not clearly indicate standard support or a partial/custom path.",
    },
    assumptions: [
      "The requirement is still eligible for Phase 1 consultant review.",
      "The future MCP-backed lookup should confirm the best MES screen and demo path.",
    ],
    warnings: [
      "Consultant review recommended because the mock generator cannot infer a clear availability path.",
    ],
  };
}

function createGeneratedComment(
  requirementName: string,
  processPath: string,
  assessment: RequirementSupportAssessment,
): string {
  if (assessment.supportType === "standard") {
    return `CM MES can address "${requirementName}" through standard configuration in ${processPath}. For the customer demo, position this as a configurable MES capability and show the relevant setup or execution screen before walking through the expected user outcome.`;
  }

  if (assessment.supportType === "partial-or-custom") {
    return `CM MES can be used to support "${requirementName}" with a consultant-reviewed workaround in ${processPath}. Start from the closest standard MES flow, explain the configurable part, and call out that the final fit should be validated before the customer-facing demo.`;
  }

  return `CM MES may support "${requirementName}" in ${processPath}, but this mock draft needs consultant review before it is used in a demo. Confirm the matching MES screen and refine the explanation once MCP-backed documentation lookup is available.`;
}

function createDemoSteps(
  requirement: ParsedRequirement,
  supportType: RequirementSupportAssessment["supportType"],
  processPath: string,
  sourceReferences: RequirementGenerationSourceReference[],
): GeneratedDemoStep[] {
  const requirementId = requirement.requirementId.trim() || "No ID";
  const screen = inferMesScreen(requirement);
  const reviewStatus: GeneratedDemoStepReviewStatus =
    supportType === "standard" ? "draft" : "consultant-review";

  return [
    {
      id: `${requirement.sourceRowNumber}-demo-1`,
      title: "Open the relevant MES area",
      instructions: [
        "Sign in to the MES demo environment.",
        `Open ${screen}.`,
        `Use the ${processPath} context to locate the closest matching setup or execution flow.`,
      ],
      relatedRequirementIds: [requirementId],
      mesModuleOrScreen: screen,
      sourceReferences,
      reviewStatus,
    },
    {
      id: `${requirement.sourceRowNumber}-demo-2`,
      title:
        supportType === "partial-or-custom"
          ? "Explain the workaround path"
          : "Show the configured behavior",
      instructions:
        supportType === "partial-or-custom"
          ? [
              "Show the closest standard MES behavior first.",
              "Describe the workaround decision in consultant language.",
              "Mark the remaining gap for validation before the final customer demo.",
            ]
          : [
              "Open or create the relevant configured record.",
              "Walk through the field or action that satisfies the requirement.",
              "Confirm the visible outcome the customer should see during the demo.",
            ],
      relatedRequirementIds: [requirementId],
      mesModuleOrScreen: screen,
      sourceReferences,
      reviewStatus,
    },
  ];
}

function createMockSourceReferences(
  requirement: ParsedRequirement,
): RequirementGenerationSourceReference[] {
  const processLabel =
    requirement.l3Process.trim() ||
    requirement.l2Process.trim() ||
    requirement.operation.trim() ||
    "General MES";

  return [
    {
      id: `mock-ai:${requirement.sourceRowNumber}`,
      kind: "mock-ai",
      label: "Mock AI draft",
      note: "Deterministic placeholder generated without Bedrock, MCP, LibreChat, or real MES documentation.",
    },
    {
      id: `mcp-placeholder:${requirement.sourceRowNumber}`,
      kind: "mcp-placeholder",
      label: `MCP placeholder for ${processLabel}`,
      note: "Placeholder traceability slot for future MCP documentation citations; not a real citation.",
    },
  ];
}

function inferMesScreen(requirement: ParsedRequirement): string {
  const text = [
    requirement.l2Process,
    requirement.l3Process,
    requirement.operation,
    requirement.requirementDescription,
  ]
    .join(" ")
    .toLowerCase();

  if (includesAny(text, ["quality", "inspection", "non-conformance"])) {
    return "Quality Management";
  }

  if (includesAny(text, ["material", "inventory", "warehouse"])) {
    return "Materials Management";
  }

  if (includesAny(text, ["resource", "equipment", "machine"])) {
    return "Resources";
  }

  if (includesAny(text, ["report", "dashboard", "kpi", "analytics"])) {
    return "Reporting and Analytics";
  }

  if (includesAny(text, ["order", "dispatch", "execution", "operation"])) {
    return "Shop Floor Execution";
  }

  return "MES configuration";
}

function formatProcessPath(requirement: ParsedRequirement): string {
  return (
    [
      requirement.l2Process.trim(),
      requirement.l3Process.trim(),
      requirement.operation.trim(),
    ]
      .filter(Boolean)
      .join(" > ") || "the relevant MES process area"
  );
}

function parseSupportedPercent(value: string): number | null {
  const match = value.match(/\d+(?:[.,]\d+)?/);

  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function includesAny(value: string, tokens: string[]): boolean {
  return tokens.some((token) => value.includes(token));
}

function isRequirementGenerationSourceReference(
  value: unknown,
): value is RequirementGenerationSourceReference {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isRequirementGenerationReferenceKind(value.kind) &&
    typeof value.label === "string" &&
    typeof value.note === "string"
  );
}

function isGeneratedDemoStep(value: unknown): value is GeneratedDemoStep {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.instructions) &&
    value.instructions.every(
      (instruction) => typeof instruction === "string",
    ) &&
    Array.isArray(value.relatedRequirementIds) &&
    value.relatedRequirementIds.every(
      (requirementId) => typeof requirementId === "string",
    ) &&
    typeof value.mesModuleOrScreen === "string" &&
    Array.isArray(value.sourceReferences) &&
    value.sourceReferences.every(isRequirementGenerationSourceReference) &&
    isGeneratedDemoStepReviewStatus(value.reviewStatus)
  );
}

function isGeneratedDemoStepReviewStatus(
  value: unknown,
): value is GeneratedDemoStepReviewStatus {
  return value === "draft" || value === "consultant-review";
}

function isRequirementGenerationConfidenceLevel(
  value: unknown,
): value is RequirementGenerationConfidenceLevel {
  return value === "high" || value === "medium" || value === "low";
}

function isRequirementGenerationReferenceKind(
  value: unknown,
): value is RequirementGenerationReferenceKind {
  return value === "mock-ai" || value === "mcp-placeholder";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
