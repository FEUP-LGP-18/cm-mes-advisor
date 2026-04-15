export type RequirementGenerationMode = "mock" | "real";

export interface RequirementGenerationServerConfig {
  mode: RequirementGenerationMode;
  mcpServerUrl: string | null;
  mesBaseUrl: string | null;
  bedrockApiKey: string | null;
  bedrockModelId: string | null;
  awsRegion: string | null;
  mcpProtocolDetails: string | null;
}

const realModeRequiredConfigKeys = [
  "MCP_SERVER_URL",
  "MES_BASE_URL",
  "BEDROCK_API_KEY",
  "BEDROCK_MODEL_ID",
  "AWS_REGION",
  "MCP_PROTOCOL_DETAILS",
] as const;

export function readRequirementGenerationServerConfig(
  env: Record<string, string | undefined> = process.env,
): RequirementGenerationServerConfig {
  return {
    mode: env.GENERATION_MODE === "real" ? "real" : "mock",
    mcpServerUrl: normalizeEnvValue(env.MCP_SERVER_URL),
    mesBaseUrl: normalizeEnvValue(env.MES_BASE_URL),
    bedrockApiKey: normalizeEnvValue(env.BEDROCK_API_KEY),
    bedrockModelId: normalizeEnvValue(env.BEDROCK_MODEL_ID),
    awsRegion: normalizeEnvValue(env.AWS_REGION),
    mcpProtocolDetails: normalizeEnvValue(env.MCP_PROTOCOL_DETAILS),
  };
}

export function getMissingRealGenerationConfigKeys(
  config: RequirementGenerationServerConfig,
): string[] {
  return realModeRequiredConfigKeys.filter((key) => {
    switch (key) {
      case "MCP_SERVER_URL":
        return config.mcpServerUrl === null;
      case "MES_BASE_URL":
        return config.mesBaseUrl === null;
      case "BEDROCK_API_KEY":
        return config.bedrockApiKey === null;
      case "BEDROCK_MODEL_ID":
        return config.bedrockModelId === null;
      case "AWS_REGION":
        return config.awsRegion === null;
      case "MCP_PROTOCOL_DETAILS":
        return config.mcpProtocolDetails === null;
    }
  });
}

function normalizeEnvValue(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
