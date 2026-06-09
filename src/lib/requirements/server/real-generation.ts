import {
  assessRequirementSupport,
  createMockGeneratedRequirementDraft,
  createRequirementGenerationIdentity,
  inferMesScreen,
  type GeneratedDemoStep,
  type GeneratedRequirementDraft,
  type RequirementGenerationConfidence,
  type RequirementGenerationSource,
  type RequirementGenerationSourceReference,
  type RequirementSupportAssessment,
} from "../generation";
import type { RequirementGenerationUnavailableReason } from "../generation-api";
import type { ParsedRequirement } from "../types";
import {
  getMissingRealGenerationConfigKeys,
  type RequirementGenerationServerConfig,
} from "./config";
import {
  AnthropicRequestError,
  AnthropicResponseFormatError,
  classifyAnthropicAvailabilityFailure,
  createAnthropicRequirementGenerationClient,
} from "./anthropic-client";
import {
  BedrockRequestError,
  BedrockResponseFormatError,
  classifyBedrockAvailabilityFailure,
  createBedrockRequirementGenerationClient,
} from "./bedrock-client";
import type {
  RequirementGenerationModelClient,
  RequirementGenerationModelDraft,
} from "./model-draft-contract";
import {
  createRequirementDocumentationClient,
  type McpDocumentationChunk,
  type RequirementDocumentationClient,
} from "./mcp-client";
import { createSelfHostedRequirementDocumentationClient } from "./self-mcp-docs";

const defaultGenerationConcurrency = 3;

type RealRequirementGenerationSource = Extract<
  RequirementGenerationSource,
  "bedrock-mcp" | "anthropic-mcp"
>;

export interface RealRequirementGenerationDependencies {
  createDocumentationClient?: (
    config: RequirementGenerationServerConfig,
  ) => Promise<RequirementDocumentationClient>;
  createModelClient?: (
    config: RequirementGenerationServerConfig,
  ) => RequirementGenerationModelClient;
  concurrency?: number;
  now?: () => Date;
}

export class RequirementGenerationInfrastructureError extends Error {
  readonly reason: RequirementGenerationUnavailableReason;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      reason: RequirementGenerationUnavailableReason;
    },
  ) {
    super(message, options);
    this.name = "RequirementGenerationInfrastructureError";
    this.reason = options.reason;
  }
}

function createDefaultModelClient(
  config: RequirementGenerationServerConfig,
): RequirementGenerationModelClient {
  if (config.generationProvider === "anthropic") {
    return createAnthropicRequirementGenerationClient({
      anthropicApiKey: config.anthropicApiKey!,
      anthropicMaxTokens: config.anthropicMaxTokens,
      anthropicModel: config.anthropicModel!,
      anthropicTemperature: config.anthropicTemperature,
      anthropicVersion: config.anthropicVersion,
    });
  }

  return createBedrockRequirementGenerationClient({
    awsAccessKeyId: config.awsAccessKeyId,
    awsBearerTokenBedrock: config.awsBearerTokenBedrock,
    awsRegion: config.awsRegion!,
    awsSecretAccessKey: config.awsSecretAccessKey,
    awsSessionToken: config.awsSessionToken,
    bedrockModelId: config.bedrockModelId!,
  });
}

function getRealGenerationSource(
  config: RequirementGenerationServerConfig,
): RealRequirementGenerationSource {
  return config.generationProvider === "anthropic"
    ? "anthropic-mcp"
    : "bedrock-mcp";
}

function getProviderDisplayName(
  generator: RealRequirementGenerationSource,
): "Anthropic" | "Bedrock" {
  return generator === "anthropic-mcp" ? "Anthropic" : "Bedrock";
}

export async function generateRealRequirementDrafts(
  requirements: ParsedRequirement[],
  config: RequirementGenerationServerConfig,
  dependencies: RealRequirementGenerationDependencies = {},
): Promise<GeneratedRequirementDraft[]> {
  if (getMissingRealGenerationConfigKeys(config).length > 0) {
    throw new RequirementGenerationInfrastructureError(
      "Real requirement generation is missing required MCP or model provider configuration.",
      {
        reason: "missing-config",
      },
    );
  }

  const createDocumentationClient =
    dependencies.createDocumentationClient ??
    createDefaultDocumentationClient;
  const createModelClient =
    dependencies.createModelClient ??
    ((resolvedConfig: RequirementGenerationServerConfig) =>
      createDefaultModelClient(resolvedConfig));
  const now = dependencies.now ?? (() => new Date());
  const modelClient = createModelClient(config);
  const generator = getRealGenerationSource(config);
  let documentationClient: RequirementDocumentationClient | null = null;
  let documentationClientWarning: string | null = null;

  try {
    documentationClient = await createDocumentationClient(config);
  } catch {
    documentationClientWarning =
      "The MES documentation lookup client could not be initialized for this runtime, so this row uses real AI with consultant review and no documentation citations.";
  }

  try {
    const drafts = await mapWithConcurrency(
      requirements,
      dependencies.concurrency ?? defaultGenerationConcurrency,
      async (requirement) =>
        generateDraftForRequirement({
          requirement,
          config,
          documentationClient,
          documentationClientWarning,
          generator,
          modelClient,
          now,
        }),
    );

    return drafts;
  } finally {
    await documentationClient?.close();
  }
}

async function createDefaultDocumentationClient(
  config: RequirementGenerationServerConfig,
) {
  if (config.mcpServerUrlKind === "self") {
    return createSelfHostedRequirementDocumentationClient();
  }

  return createRequirementDocumentationClient({
    mcpServerUrl: config.mcpServerUrl!,
    mcpUserAccount: config.mcpUserAccount,
  });
}

async function generateDraftForRequirement({
  requirement,
  config,
  documentationClient,
  documentationClientWarning,
  generator,
  modelClient,
  now,
}: {
  requirement: ParsedRequirement;
  config: RequirementGenerationServerConfig;
  documentationClient: RequirementDocumentationClient | null;
  documentationClientWarning: string | null;
  generator: RealRequirementGenerationSource;
  modelClient: RequirementGenerationModelClient;
  now: () => Date;
}): Promise<GeneratedRequirementDraft> {
  const assessment = assessRequirementSupport(requirement);
  const generatedAt = now().toISOString();

  let documentation: McpDocumentationChunk[] = [];
  let lookupWarning: string | null = documentationClientWarning;

  if (documentationClient !== null) {
    try {
      const lookupResult =
        await documentationClient.lookupRequirementDocumentation(requirement);
      documentation = lookupResult.allChunks;
    } catch {
      lookupWarning =
        "The MES documentation lookup could not be completed for this row, so the output stays in consultant review.";
    }
  }

  const sourceReferences = createDocumentationSourceReferences(documentation);
  lookupWarning ??=
    documentation.length === 0
      ? "No relevant MES documentation chunks were retrieved for this row, so the output stays in consultant review."
      : null;

  try {
    const modelDraft = await modelClient.generateDraft({
      requirement,
      assessment,
      documentation,
      mesBaseUrl: config.mesBaseUrl,
    });

    return normalizeRealDraft({
      requirement,
      assessment,
      generatedAt,
      generator,
      sourceReferences,
      lookupWarning,
      modelDraft,
    });
  } catch (error) {
    if (error instanceof BedrockRequestError) {
      throw new RequirementGenerationInfrastructureError(
        "Bedrock requirement generation is currently unavailable.",
        {
          cause: error,
          reason: classifyBedrockAvailabilityFailure(error.cause),
        },
      );
    }

    if (error instanceof AnthropicRequestError) {
      throw new RequirementGenerationInfrastructureError(
        "Anthropic requirement generation is currently unavailable.",
        {
          cause: error,
          reason: classifyAnthropicAvailabilityFailure(error),
        },
      );
    }

    if (
      error instanceof BedrockResponseFormatError ||
      error instanceof AnthropicResponseFormatError
    ) {
      return createSafeFallbackDraft({
        requirement,
        assessment,
        generatedAt,
        generator,
        sourceReferences,
        reason:
          `The ${getProviderDisplayName(generator)} response for this row did not match the expected draft format, so the output stays in consultant review.`,
      });
    }

    return createSafeFallbackDraft({
      requirement,
      assessment,
      generatedAt,
      generator,
      sourceReferences,
      reason:
        "This row used a safe consultant-review fallback because the real draft could not be completed.",
    });
  }
}

function normalizeRealDraft({
  requirement,
  assessment,
  generatedAt,
  generator,
  sourceReferences,
  lookupWarning,
  modelDraft,
}: {
  requirement: ParsedRequirement;
  assessment: RequirementSupportAssessment;
  generatedAt: string;
  generator: RealRequirementGenerationSource;
  sourceReferences: RequirementGenerationSourceReference[];
  lookupWarning: string | null;
  modelDraft: RequirementGenerationModelDraft;
}): GeneratedRequirementDraft {
  const reviewStatus =
    assessment.supportType === "standard" &&
    sourceReferences.length > 0 &&
    lookupWarning === null
      ? undefined
      : "consultant-review";
  const warnings = dedupeStrings([
    ...modelDraft.warnings,
    ...assessment.warnings,
    lookupWarning,
    assessment.supportType === "partial-or-custom"
      ? "Consultant review recommended: present the documented workaround path and confirm the final demo story before customer use."
      : null,
    assessment.supportType === "unclear"
      ? "Consultant review recommended because the documentation evidence is still not strong enough for automatic approval."
      : null,
  ]);
  const assumptions = dedupeStrings([
    ...modelDraft.assumptions,
    ...assessment.assumptions,
  ]);
  const confidence = createConfidenceFromLevel(
    modelDraft.confidenceLevel,
    modelDraft.confidenceRationale,
    sourceReferences.length,
  );

  return {
    schemaVersion: 1,
    generator,
    generatedAt,
    requirement: createRequirementGenerationIdentity(requirement),
    generatedComment: modelDraft.generatedComment.trim(),
    demoSteps: modelDraft.demoSteps.map((step, index) =>
      normalizeRealDemoStep({
        requirement,
        index,
        sourceReferences,
        reviewStatus: reviewStatus ?? step.reviewStatus ?? "draft",
        step,
      }),
    ),
    confidence,
    assumptions,
    warnings,
    sourceReferences,
  };
}

function normalizeRealDemoStep({
  requirement,
  index,
  reviewStatus,
  sourceReferences,
  step,
}: {
  requirement: ParsedRequirement;
  index: number;
  reviewStatus: GeneratedDemoStep["reviewStatus"];
  sourceReferences: RequirementGenerationSourceReference[];
  step: RequirementGenerationModelDraft["demoSteps"][number];
}): GeneratedDemoStep {
  return {
    id: `${requirement.sourceRowNumber}-real-demo-${index + 1}`,
    title: step.title.trim(),
    instructions: dedupeStrings(step.instructions).slice(0, 5),
    relatedRequirementIds: [
      requirement.requirementId.trim() || `row-${requirement.sourceRowNumber}`,
    ],
    mesModuleOrScreen:
      step.mesModuleOrScreen.trim() || inferMesScreen(requirement),
    sourceReferences,
    reviewStatus,
  };
}

function createSafeFallbackDraft({
  requirement,
  assessment,
  generatedAt,
  generator,
  sourceReferences,
  reason,
}: {
  requirement: ParsedRequirement;
  assessment: RequirementSupportAssessment;
  generatedAt: string;
  generator: RealRequirementGenerationSource;
  sourceReferences: RequirementGenerationSourceReference[];
  reason: string;
}): GeneratedRequirementDraft {
  const base = createMockGeneratedRequirementDraft(requirement);
  const commentSuffix =
    sourceReferences.length > 0
      ? "Keep this row in consultant review until the grounded MES path is confirmed."
      : "No grounded MES documentation evidence was retrieved for this row, so it should remain in consultant review.";
  const confidence = createConfidenceFromLevel(
    "low",
    reason,
    sourceReferences.length,
  );

  return {
    ...base,
    generator,
    generatedAt,
    generatedComment: `${base.generatedComment} ${commentSuffix}`.trim(),
    demoSteps: base.demoSteps.map((step) => ({
      ...step,
      sourceReferences,
      reviewStatus:
        assessment.supportType === "standard"
          ? "consultant-review"
          : step.reviewStatus,
    })),
    confidence,
    assumptions: dedupeStrings(base.assumptions),
    warnings: dedupeStrings([...base.warnings, reason]),
    sourceReferences,
  };
}

function createConfidenceFromLevel(
  level: RequirementGenerationConfidence["level"],
  rationale: string,
  evidenceCount: number,
): RequirementGenerationConfidence {
  const baseScore = level === "high" ? 0.88 : level === "medium" ? 0.7 : 0.48;
  const evidenceBoost =
    evidenceCount >= 3 ? 0.04 : evidenceCount > 0 ? 0.02 : 0;

  return {
    level,
    score: Math.max(0.1, Math.min(0.99, baseScore + evidenceBoost)),
    rationale,
  };
}

function createDocumentationSourceReferences(
  documentation: McpDocumentationChunk[],
): RequirementGenerationSourceReference[] {
  return documentation.slice(0, 4).map((chunk, index) => ({
    id: `mcp-documentation:${chunk.id}:${index}`,
    kind: "mcp-documentation",
    label:
      chunk.title ??
      chunk.docSource ??
      chunk.sourceUrl ??
      `MES documentation chunk ${index + 1}`,
    note: [
      chunk.docSource,
      chunk.docVersion ? `v${chunk.docVersion}` : null,
      chunk.text.slice(0, 180).trim(),
    ]
      .filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      )
      .join(" — "),
    url: chunk.sourceUrl ?? undefined,
  }));
}

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  const safeConcurrency = Math.max(1, Math.floor(concurrency));
  const results: TResult[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]!, currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(safeConcurrency, items.length) }, () =>
      runWorker(),
    ),
  );

  return results;
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0,
        ),
    ),
  );
}
