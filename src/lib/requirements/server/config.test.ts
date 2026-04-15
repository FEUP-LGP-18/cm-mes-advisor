import { describe, expect, it } from "vitest";
import {
  getMissingRealGenerationConfigKeys,
  readRequirementGenerationServerConfig,
} from "./config";

describe("requirement generation server config", () => {
  it("defaults to mock mode when generation mode is unset", () => {
    const config = readRequirementGenerationServerConfig({});

    expect(config.mode).toBe("mock");
    expect(config.mcpServerUrl).toBeNull();
    expect(config.mesBaseUrl).toBeNull();
  });

  it("parses explicit real mode and reports missing protocol details", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      MCP_SERVER_URL: "https://example.invalid/mcp",
      MES_BASE_URL: "https://example.invalid/mes",
      BEDROCK_API_KEY: "example-bedrock-api-key",
      BEDROCK_MODEL_ID: "example-bedrock-model-id",
      AWS_REGION: "eu-west-1",
    });

    expect(config.mode).toBe("real");
    expect(getMissingRealGenerationConfigKeys(config)).toEqual([
      "MCP_PROTOCOL_DETAILS",
    ]);
  });

  it("treats blank configuration values as missing", () => {
    const config = readRequirementGenerationServerConfig({
      GENERATION_MODE: "real",
      MCP_SERVER_URL: "  ",
      MES_BASE_URL: "",
      BEDROCK_API_KEY: "  ",
      BEDROCK_MODEL_ID: "model-id",
      AWS_REGION: "eu-west-1",
      MCP_PROTOCOL_DETAILS: "  ",
    });

    expect(getMissingRealGenerationConfigKeys(config)).toEqual([
      "MCP_SERVER_URL",
      "MES_BASE_URL",
      "BEDROCK_API_KEY",
      "MCP_PROTOCOL_DETAILS",
    ]);
  });
});
