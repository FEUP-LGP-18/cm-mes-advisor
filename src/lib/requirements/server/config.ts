export type RequirementGenerationMode = "mock" | "real";
export type RequirementGenerationModelProvider = "bedrock" | "anthropic";

export interface RequirementGenerationServerConfig {
  mode: RequirementGenerationMode;
  generationProvider: RequirementGenerationModelProvider;
  mcpServerUrl: string | null;
  mesBaseUrl: string | null;
  bedrockModelId: string | null;
  awsRegion: string | null;
  awsAccessKeyId: string | null;
  awsSecretAccessKey: string | null;
  awsSessionToken: string | null;
  awsBearerTokenBedrock: string | null;
  anthropicApiKey: string | null;
  anthropicModel: string | null;
  anthropicVersion: string;
  anthropicMaxTokens: number;
  anthropicTemperature: number;
  mcpUserAccount: string | null;
}

const commonRealModeRequiredConfigKeys = ["MCP_SERVER_URL"] as const;

const bedrockRequiredConfigKeys = [
  "BEDROCK_MODEL_ID",
  "AWS_REGION",
] as const;

const anthropicRequiredConfigKeys = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
] as const;

const defaultAnthropicVersion = "2023-06-01";
const defaultAnthropicMaxTokens = 1200;
const defaultAnthropicTemperature = 0.1;

export function readRequirementGenerationServerConfig(
  env: Record<string, string | undefined> = process.env,
): RequirementGenerationServerConfig {
  return {
    mode: env.GENERATION_MODE === "real" ? "real" : "mock",
    generationProvider:
      env.REQUIREMENT_GENERATION_PROVIDER === "anthropic"
        ? "anthropic"
        : "bedrock",
    mcpServerUrl: normalizeEnvValue(env.MCP_SERVER_URL),
    mesBaseUrl: normalizeEnvValue(env.MES_BASE_URL),
    bedrockModelId: normalizeEnvValue(env.BEDROCK_MODEL_ID),
    awsRegion: readFirstDefinedEnvValue(env, [
      "AWS_REGION",
      "BEDROCK_AWS_DEFAULT_REGION",
    ]),
    awsAccessKeyId: readFirstDefinedEnvValue(env, [
      "AWS_ACCESS_KEY_ID",
      "BEDROCK_AWS_ACCESS_KEY_ID",
    ]),
    awsSecretAccessKey: readFirstDefinedEnvValue(env, [
      "AWS_SECRET_ACCESS_KEY",
      "BEDROCK_AWS_SECRET_ACCESS_KEY",
    ]),
    awsSessionToken: normalizeEnvValue(env.AWS_SESSION_TOKEN),
    awsBearerTokenBedrock: normalizeEnvValue(env.AWS_BEARER_TOKEN_BEDROCK),
    anthropicApiKey: normalizeEnvValue(env.ANTHROPIC_API_KEY),
    anthropicModel: normalizeEnvValue(env.ANTHROPIC_MODEL),
    anthropicVersion:
      normalizeEnvValue(env.ANTHROPIC_VERSION) ?? defaultAnthropicVersion,
    anthropicMaxTokens: readNumberEnvValue(
      env.ANTHROPIC_MAX_TOKENS,
      defaultAnthropicMaxTokens,
    ),
    anthropicTemperature: readNumberEnvValue(
      env.ANTHROPIC_TEMPERATURE,
      defaultAnthropicTemperature,
    ),
    mcpUserAccount: normalizeEnvValue(env.MCP_USER_ACCOUNT),
  };
}

export function getMissingRealGenerationConfigKeys(
  config: RequirementGenerationServerConfig,
): string[] {
  const missingKeys: string[] = commonRealModeRequiredConfigKeys.filter((key) => {
    switch (key) {
      case "MCP_SERVER_URL":
        return config.mcpServerUrl === null;
    }
  });

  if (config.generationProvider === "anthropic") {
    missingKeys.push(
      ...anthropicRequiredConfigKeys.filter((key) => {
        switch (key) {
          case "ANTHROPIC_API_KEY":
            return config.anthropicApiKey === null;
          case "ANTHROPIC_MODEL":
            return config.anthropicModel === null;
        }
      }),
    );

    return missingKeys;
  }

  missingKeys.push(
    ...bedrockRequiredConfigKeys.filter((key) => {
      switch (key) {
        case "BEDROCK_MODEL_ID":
          return config.bedrockModelId === null;
        case "AWS_REGION":
          return config.awsRegion === null;
      }
    }),
  );

  const hasBearerToken = config.awsBearerTokenBedrock !== null;
  const hasAwsCredentials =
    config.awsAccessKeyId !== null && config.awsSecretAccessKey !== null;

  if (!hasBearerToken && !hasAwsCredentials) {
    missingKeys.push("AWS_BEARER_TOKEN_BEDROCK");
  }

  return missingKeys;
}

function readNumberEnvValue(
  value: string | undefined,
  defaultValue: number,
): number {
  const normalized = normalizeEnvValue(value);
  if (normalized === null) {
    return defaultValue;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeEnvValue(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readFirstDefinedEnvValue(
  env: Record<string, string | undefined>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = normalizeEnvValue(env[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}
