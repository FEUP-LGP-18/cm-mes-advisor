export type RequirementGenerationMode = "mock" | "real";

export interface RequirementGenerationServerConfig {
  mode: RequirementGenerationMode;
  mcpServerUrl: string | null;
  mesBaseUrl: string | null;
  bedrockModelId: string | null;
  awsRegion: string | null;
  awsAccessKeyId: string | null;
  awsSecretAccessKey: string | null;
  awsSessionToken: string | null;
  awsBearerTokenBedrock: string | null;
  mcpUserAccount: string | null;
}

const realModeRequiredConfigKeys = [
  "MCP_SERVER_URL",
  "BEDROCK_MODEL_ID",
  "AWS_REGION",
] as const;

export function readRequirementGenerationServerConfig(
  env: Record<string, string | undefined> = process.env,
): RequirementGenerationServerConfig {
  return {
    mode: env.GENERATION_MODE === "real" ? "real" : "mock",
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
    mcpUserAccount: normalizeEnvValue(env.MCP_USER_ACCOUNT),
  };
}

export function getMissingRealGenerationConfigKeys(
  config: RequirementGenerationServerConfig,
): string[] {
  const missingKeys: string[] = realModeRequiredConfigKeys.filter((key) => {
    switch (key) {
      case "MCP_SERVER_URL":
        return config.mcpServerUrl === null;
      case "BEDROCK_MODEL_ID":
        return config.bedrockModelId === null;
      case "AWS_REGION":
        return config.awsRegion === null;
    }
  });

  const hasBearerToken = config.awsBearerTokenBedrock !== null;
  const hasAwsCredentials =
    config.awsAccessKeyId !== null && config.awsSecretAccessKey !== null;

  if (!hasBearerToken && !hasAwsCredentials) {
    missingKeys.push("AWS_BEARER_TOKEN_BEDROCK");
  }

  return missingKeys;
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
