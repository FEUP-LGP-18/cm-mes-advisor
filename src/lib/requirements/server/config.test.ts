import { describe, expect, it } from "vitest";
import {
  getMissingRealGenerationConfigKeys,
  readRequirementGenerationServerConfig,
} from "./config";

describe("requirement generation server config", () => {
  it("defaults to mock mode when generation mode is unset", () => {
    const config = readRequirementGenerationServerConfig({});

    expect(config.mode).toBe("mock");
    expect(config.generationProvider).toBe("bedrock");
    expect(config.mcpServerUrl).toBeNull();
    expect(config.mesBaseUrl).toBeNull();
    expect(config.anthropicApiKey).toBeNull();
    expect(config.anthropicModel).toBeNull();
    expect(config.anthropicVersion).toBe("2023-06-01");
    expect(config.anthropicMaxTokens).toBe(1200);
    expect(config.anthropicTemperature).toBe(0.1);
  });

  it("preserves Bedrock as the default real provider", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      MCP_SERVER_URL: "https://example.invalid/mcp",
      BEDROCK_MODEL_ID: "example-bedrock-model-id",
      AWS_REGION: "eu-south-2",
      AWS_BEARER_TOKEN_BEDROCK: "ABSKexample-token",
    });

    expect(config.generationProvider).toBe("bedrock");
    expect(getMissingRealGenerationConfigKeys(config)).toEqual([]);
  });

  it("accepts Bedrock bearer token auth without AWS access key pairs", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      MCP_SERVER_URL: "https://example.invalid/mcp",
      BEDROCK_MODEL_ID: "example-bedrock-model-id",
      AWS_REGION: "eu-south-2",
      AWS_BEARER_TOKEN_BEDROCK: "ABSKexample-token",
    });

    expect(config.awsBearerTokenBedrock).toBe("ABSKexample-token");
    expect(getMissingRealGenerationConfigKeys(config)).toEqual([]);
  });

  it("parses explicit real mode with standard AWS variables", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      MCP_SERVER_URL: "https://example.invalid/mcp",
      MES_BASE_URL: "https://example.invalid/mes",
      BEDROCK_MODEL_ID: "example-bedrock-model-id",
      AWS_ACCESS_KEY_ID: "example-access-key-id",
      AWS_SECRET_ACCESS_KEY: "example-secret-access-key",
      AWS_REGION: "eu-west-1",
    });

    expect(config.mode).toBe("real");
    expect(config.awsAccessKeyId).toBe("example-access-key-id");
    expect(config.awsSecretAccessKey).toBe("example-secret-access-key");
    expect(getMissingRealGenerationConfigKeys(config)).toEqual([]);
  });

  it("falls back to the partner Bedrock aliases when standard AWS variables are absent", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      MCP_SERVER_URL: "https://example.invalid/mcp",
      BEDROCK_MODEL_ID: "example-bedrock-model-id",
      BEDROCK_AWS_ACCESS_KEY_ID: "alias-access-key-id",
      BEDROCK_AWS_SECRET_ACCESS_KEY: "alias-secret-access-key",
      BEDROCK_AWS_DEFAULT_REGION: "eu-south-2",
      MCP_USER_ACCOUNT: "consultant@example.com",
    });

    expect(config.awsAccessKeyId).toBe("alias-access-key-id");
    expect(config.awsSecretAccessKey).toBe("alias-secret-access-key");
    expect(config.awsRegion).toBe("eu-south-2");
    expect(config.mcpUserAccount).toBe("consultant@example.com");
    expect(getMissingRealGenerationConfigKeys(config)).toEqual([]);
  });

  it("parses Anthropic provider configuration with safe numeric defaults", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      REQUIREMENT_GENERATION_PROVIDER: "anthropic",
      MCP_SERVER_URL: "https://example.invalid/mcp",
      ANTHROPIC_API_KEY: "sk-ant-example-key",
      ANTHROPIC_MODEL: "claude-haiku-4-5-20251001",
    });

    expect(config.generationProvider).toBe("anthropic");
    expect(config.anthropicApiKey).toBe("sk-ant-example-key");
    expect(config.anthropicModel).toBe("claude-haiku-4-5-20251001");
    expect(config.anthropicVersion).toBe("2023-06-01");
    expect(config.anthropicMaxTokens).toBe(1200);
    expect(config.anthropicTemperature).toBe(0.1);
    expect(getMissingRealGenerationConfigKeys(config)).toEqual([]);
  });

  it("accepts Anthropic optional tuning values when they are numeric", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      REQUIREMENT_GENERATION_PROVIDER: "anthropic",
      MCP_SERVER_URL: "https://example.invalid/mcp",
      ANTHROPIC_API_KEY: "sk-ant-example-key",
      ANTHROPIC_MODEL: "claude-haiku-4-5",
      ANTHROPIC_VERSION: "2023-06-01",
      ANTHROPIC_MAX_TOKENS: "900",
      ANTHROPIC_TEMPERATURE: "0.2",
    });

    expect(config.anthropicMaxTokens).toBe(900);
    expect(config.anthropicTemperature).toBe(0.2);
    expect(getMissingRealGenerationConfigKeys(config)).toEqual([]);
  });

  it("requires only Anthropic credentials and MCP URL when Anthropic is selected", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      REQUIREMENT_GENERATION_PROVIDER: "anthropic",
      MCP_SERVER_URL: "https://example.invalid/mcp",
    });

    expect(getMissingRealGenerationConfigKeys(config)).toEqual([
      "ANTHROPIC_API_KEY",
      "ANTHROPIC_MODEL",
    ]);
  });

  it("keeps invalid provider values on the Bedrock path", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      REQUIREMENT_GENERATION_PROVIDER: "openai",
      MCP_SERVER_URL: "https://example.invalid/mcp",
      BEDROCK_MODEL_ID: "example-bedrock-model-id",
      AWS_REGION: "eu-south-2",
      AWS_BEARER_TOKEN_BEDROCK: "ABSKexample-token",
    });

    expect(config.generationProvider).toBe("bedrock");
    expect(getMissingRealGenerationConfigKeys(config)).toEqual([]);
  });

  it("treats blank configuration values as missing", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      MCP_SERVER_URL: "  ",
      MES_BASE_URL: "",
      BEDROCK_MODEL_ID: "model-id",
      AWS_REGION: "  ",
      AWS_ACCESS_KEY_ID: "",
      AWS_SECRET_ACCESS_KEY: "  ",
      AWS_BEARER_TOKEN_BEDROCK: "   ",
    });

    expect(getMissingRealGenerationConfigKeys(config)).toEqual([
      "MCP_SERVER_URL",
      "AWS_REGION",
      "AWS_BEARER_TOKEN_BEDROCK",
    ]);
  });

  it("does not report Anthropic secret values in missing config results", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      REQUIREMENT_GENERATION_PROVIDER: "anthropic",
      MCP_SERVER_URL: "https://example.invalid/mcp",
      ANTHROPIC_API_KEY: "sk-ant-secret-value",
      ANTHROPIC_MODEL: "",
    });

    const missing = getMissingRealGenerationConfigKeys(config);

    expect(missing).toEqual(["ANTHROPIC_MODEL"]);
    expect(missing.join(" ")).not.toContain("sk-ant-secret-value");
  });
});
