import type {
  RequirementGenerationAvailabilityBody,
  RequirementGenerationModeCapability,
  RequirementGenerationUnavailableReason,
} from "../generation-api";
import {
  readRequirementGenerationServerConfig,
  getMissingRealGenerationConfigKeys,
  type RequirementGenerationServerConfig,
} from "./config";
import {
  AnthropicRequestError,
  classifyAnthropicAvailabilityFailure,
  createAnthropicRequirementGenerationClient,
} from "./anthropic-client";
import {
  BedrockRequestError,
  classifyBedrockAvailabilityFailure,
  createBedrockRequirementGenerationClient,
} from "./bedrock-client";
import {
  createRequirementDocumentationClient,
  type RequirementDocumentationClient,
} from "./mcp-client";
import { createSelfHostedRequirementDocumentationClient } from "./self-mcp-docs";

interface RequirementGenerationAvailabilityDependencies {
  checkModelAvailability?: (
    config: RequirementGenerationServerConfig,
  ) => Promise<void>;
  createDocumentationClient?: (
    config: RequirementGenerationServerConfig,
  ) => Promise<RequirementDocumentationClient>;
  now?: () => Date;
  readConfig?: () => RequirementGenerationServerConfig;
  refresh?: boolean;
  ttlMs?: number;
}

let cachedAvailability: RequirementGenerationAvailabilityBody | null = null;
let cachedAvailabilityExpiresAt = 0;

const defaultAvailabilityTtlMs = 60_000;

export async function getRequirementGenerationAvailabilitySnapshot(
  dependencies: RequirementGenerationAvailabilityDependencies = {},
): Promise<RequirementGenerationAvailabilityBody> {
  const now = dependencies.now ?? (() => new Date());
  const ttlMs = dependencies.ttlMs ?? defaultAvailabilityTtlMs;
  const nowMs = now().getTime();

  if (
    !dependencies.refresh &&
    cachedAvailability &&
    nowMs < cachedAvailabilityExpiresAt
  ) {
    return cachedAvailability;
  }

  const readConfig =
    dependencies.readConfig ?? (() => readRequirementGenerationServerConfig());
  const config = readConfig();
  const realConfig: RequirementGenerationServerConfig = {
    ...config,
    mode: "real",
  };

  const checkedAt = now().toISOString();
  const mockCapability = createAvailableCapability(
    "mock",
    "Draft mode is available.",
  );
  const realCapability = await resolveRealCapability(realConfig, dependencies);

  const snapshot: RequirementGenerationAvailabilityBody = {
    ok: true,
    checkedAt,
    modes: {
      mock: mockCapability,
      real: realCapability,
    },
  };

  cachedAvailability = snapshot;
  cachedAvailabilityExpiresAt = nowMs + ttlMs;

  return snapshot;
}

export function resetRequirementGenerationAvailabilityCache() {
  cachedAvailability = null;
  cachedAvailabilityExpiresAt = 0;
}

async function resolveRealCapability(
  config: RequirementGenerationServerConfig,
  dependencies: RequirementGenerationAvailabilityDependencies,
): Promise<RequirementGenerationModeCapability> {
  const missingConfig = getMissingRealGenerationConfigKeys(config);
  if (missingConfig.length > 0) {
    return createUnavailableCapability(
      "missing-config",
      "Grounded generation is unavailable because the MCP or model provider configuration is incomplete.",
      missingConfig,
    );
  }

  const createDocumentationClient =
    dependencies.createDocumentationClient ??
    createDefaultDocumentationClient;
  const checkModelAvailability =
    dependencies.checkModelAvailability ??
    ((resolvedConfig: RequirementGenerationServerConfig) =>
      createDefaultModelClient(resolvedConfig).checkAvailability());

  let documentationWarning: string | null = null;
  try {
    const docsClient = await createDocumentationClient(config);
    await docsClient.close();
  } catch {
    documentationWarning =
      "Real AI generation is available, but MCP documentation lookup could not be confirmed from this runtime. Generated drafts will stay in consultant review when documentation evidence is unavailable.";
  }

  try {
    await checkModelAvailability(config);

    return createAvailableCapability(
      "real",
      documentationWarning ?? "Grounded generation is available.",
    );
  } catch (error) {
    const reason = classifyAvailabilityReason(error);
    return createUnavailableCapability(
      reason,
      getUnavailableMessage(reason, config),
    );
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

function createDefaultModelClient(config: RequirementGenerationServerConfig) {
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

function createAvailableCapability(
  mode: "mock" | "real",
  message: string,
): RequirementGenerationModeCapability {
  return {
    mode,
    available: true,
    status: "available",
    message,
  };
}

function createUnavailableCapability(
  reason: RequirementGenerationUnavailableReason,
  message: string,
  missingConfig?: string[],
): RequirementGenerationModeCapability {
  return {
    mode: "real",
    available: false,
    status: reason,
    message,
    missingConfig,
  };
}

function classifyAvailabilityReason(
  error: unknown,
): Exclude<RequirementGenerationUnavailableReason, "missing-config"> {
  if (error instanceof AnthropicRequestError) {
    return classifyAnthropicAvailabilityFailure(error);
  }

  if (error instanceof BedrockRequestError) {
    return classifyBedrockAvailabilityFailure(error.cause);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    typeof error.cause !== "undefined"
  ) {
    return classifyBedrockAvailabilityFailure(error.cause);
  }

  return classifyBedrockAvailabilityFailure(error);
}

function getUnavailableMessage(
  reason: Exclude<RequirementGenerationUnavailableReason, "missing-config">,
  config: RequirementGenerationServerConfig,
) {
  switch (reason) {
    case "blocked":
      return config.generationProvider === "anthropic"
        ? "Grounded generation is unavailable because direct Anthropic API access is currently blocked."
        : "Grounded generation is unavailable because direct Bedrock access is currently blocked by partner-side permissions.";
    case "check-failed":
      return "Grounded generation could not be confirmed right now. You can continue with draft mode and recheck later.";
  }
}
