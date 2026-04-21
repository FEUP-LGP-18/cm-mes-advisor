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
  classifyBedrockAvailabilityFailure,
  createBedrockRequirementGenerationClient,
} from "./bedrock-client";
import {
  createRequirementDocumentationClient,
  type RequirementDocumentationClient,
} from "./mcp-client";

interface RequirementGenerationAvailabilityDependencies {
  checkBedrockAvailability?: (
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
      "Grounded generation is unavailable because the MCP or Bedrock configuration is incomplete.",
      missingConfig,
    );
  }

  const createDocumentationClient =
    dependencies.createDocumentationClient ??
    ((resolvedConfig: RequirementGenerationServerConfig) =>
      createRequirementDocumentationClient({
        mcpServerUrl: resolvedConfig.mcpServerUrl!,
        mcpUserAccount: resolvedConfig.mcpUserAccount,
      }));
  const checkBedrockAvailability =
    dependencies.checkBedrockAvailability ??
    ((resolvedConfig: RequirementGenerationServerConfig) =>
      createBedrockRequirementGenerationClient({
        awsAccessKeyId: resolvedConfig.awsAccessKeyId,
        awsBearerTokenBedrock: resolvedConfig.awsBearerTokenBedrock,
        awsRegion: resolvedConfig.awsRegion!,
        awsSecretAccessKey: resolvedConfig.awsSecretAccessKey,
        awsSessionToken: resolvedConfig.awsSessionToken,
        bedrockModelId: resolvedConfig.bedrockModelId!,
      }).checkAvailability());

  try {
    const docsClient = await createDocumentationClient(config);
    await docsClient.close();
  } catch {
    return createUnavailableCapability(
      "check-failed",
      "Grounded generation could not confirm MCP access right now. You can continue with draft mode and recheck later.",
    );
  }

  try {
    await checkBedrockAvailability(config);

    return createAvailableCapability(
      "real",
      "Grounded generation is available.",
    );
  } catch (error) {
    const reason = classifyAvailabilityReason(error);
    return createUnavailableCapability(
      reason,
      getUnavailableMessage(reason),
    );
  }
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
) {
  switch (reason) {
    case "blocked":
      return "Grounded generation is unavailable because direct Bedrock access is currently blocked by partner-side permissions.";
    case "check-failed":
      return "Grounded generation could not be confirmed right now. You can continue with draft mode and recheck later.";
  }
}
