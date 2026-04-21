import type { ParsedRequirement } from "./types";

export type RequirementGenerationConfidenceLevel = "high" | "medium" | "low";

export type RequirementGenerationReferenceKind =
  | "mock-ai"
  | "mcp-placeholder"
  | "mcp-documentation";

export type RequirementGenerationSource = "mock-ai" | "bedrock-mcp";

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
  url?: string;
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
  generator: RequirementGenerationSource;
  generatedAt: string;
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
      assessment,
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
    isRequirementGenerationSource(value.generator) &&
    typeof value.generatedAt === "string" &&
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
      "extension",
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
          "The source row does not provide enough requirement text for a reliable demo path, so the row should stay in consultant review.",
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
        "The source row does not clearly indicate a standard or workaround path, so the row needs consultant review before a demo decision is made.",
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
    return `CM MES can address "${requirementName}" through standard configuration in ${processPath}. In the demo, click through the relevant MES screen, open the configured record, and show the outcome the customer should see.`;
  }

  if (assessment.supportType === "partial-or-custom") {
    return `CM MES can support "${requirementName}" with a consultant-reviewed workaround in ${processPath}. Start from the closest standard MES flow, use a workaround-first explanation, and keep the row under consultant review until the final demo path is confirmed.`;
  }

  return `CM MES may support "${requirementName}" in ${processPath}, but this row needs consultant review before it is used in a demo. Confirm the exact MES screen and action path, then tighten the explanation once documentation lookup is available.`;
}

function createDemoSteps(
  requirement: ParsedRequirement,
  assessment: RequirementSupportAssessment,
  processPath: string,
  sourceReferences: RequirementGenerationSourceReference[],
): GeneratedDemoStep[] {
  const requirementId = requirement.requirementId.trim() || "No ID";
  const screen = inferMesScreen(requirement);
  const supportType = assessment.supportType;
  const reviewStatus: GeneratedDemoStepReviewStatus =
    supportType === "standard" ? "draft" : "consultant-review";
  const firstStepTitle =
    supportType === "standard"
      ? "Open the MES screen and locate the record"
      : supportType === "partial-or-custom"
        ? "Open the closest standard MES screen and locate the record"
        : "Confirm the MES screen with consultant review";
  const secondStepTitle =
    supportType === "standard"
      ? "Demonstrate the configured outcome"
      : supportType === "partial-or-custom"
        ? "Explain the workaround path"
        : "Capture the consultant-review path";

  return [
    {
      id: `${requirement.sourceRowNumber}-demo-1`,
      title: firstStepTitle,
      instructions: [
        "Sign in to the MES demo environment.",
        `Open the ${screen} area from the MES navigation.`,
        `Click the screen or record that matches ${processPath}.`,
        supportType === "standard"
          ? "Show the configured field, button, or status change the customer should see."
          : supportType === "partial-or-custom"
            ? "Capture the closest standard behavior before showing the workaround path."
            : "Pause before presenting and confirm the exact path with a consultant.",
      ],
      relatedRequirementIds: [requirementId],
      mesModuleOrScreen: screen,
      sourceReferences,
      reviewStatus,
    },
    {
      id: `${requirement.sourceRowNumber}-demo-2`,
      title: secondStepTitle,
      instructions:
        supportType === "standard"
          ? [
              "Open or create the relevant configured record.",
              "Walk through the exact field, button, or action on the screen.",
              "Show the resulting screen or status change the customer should see.",
            ]
          : supportType === "partial-or-custom"
            ? [
                "Show the closest standard MES behavior first.",
                "Explain the workaround in consultant language.",
                "Call out what still needs validation before the customer demo.",
              ]
            : [
                "Show the closest screen or menu path you can confirm.",
                "Document the uncertainty for consultant review.",
                "Do not present the row as approved until the demo path is validated.",
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

export function inferMesScreen(requirement: ParsedRequirement): string {
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

export function formatProcessPath(requirement: ParsedRequirement): string {
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
    typeof value.note === "string" &&
    (value.url === undefined || typeof value.url === "string")
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
  return (
    value === "mock-ai" ||
    value === "mcp-placeholder" ||
    value === "mcp-documentation"
  );
}

function isRequirementGenerationSource(
  value: unknown,
): value is RequirementGenerationSource {
  return value === "mock-ai" || value === "bedrock-mcp";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
