import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRequirementGenerationAvailabilitySnapshot,
  resetRequirementGenerationAvailabilityCache,
} from "./availability";
import { AnthropicRequestError } from "./anthropic-client";
import { BedrockRequestError } from "./bedrock-client";

const completeRealConfig = {
  mode: "mock" as const,
  generationProvider: "bedrock" as const,
  mcpServerUrl: "https://example.invalid/mcp",
  mesBaseUrl: null,
  bedrockModelId: "example-bedrock-model-id",
  awsRegion: "eu-west-1",
  awsAccessKeyId: null,
  awsSecretAccessKey: null,
  awsSessionToken: null,
  awsBearerTokenBedrock: "ABSKexample-token",
  anthropicApiKey: null,
  anthropicMaxTokens: 1200,
  anthropicModel: null,
  anthropicTemperature: 0.1,
  anthropicVersion: "2023-06-01",
  mcpUserAccount: null,
};

const completeAnthropicConfig = {
  ...completeRealConfig,
  generationProvider: "anthropic" as const,
  bedrockModelId: null,
  awsRegion: null,
  awsBearerTokenBedrock: null,
  anthropicApiKey: "sk-ant-example-key",
  anthropicModel: "claude-haiku-4-5-20251001",
};

describe("requirement generation availability", () => {
  afterEach(() => {
    resetRequirementGenerationAvailabilityCache();
  });

  it("returns missing-config when the local real setup is incomplete", async () => {
    const availability = await getRequirementGenerationAvailabilitySnapshot({
      readConfig: () => ({
        ...completeRealConfig,
        awsBearerTokenBedrock: null,
      }),
    });

    expect(availability.modes.mock).toMatchObject({
      available: true,
      status: "available",
    });
    expect(availability.modes.real).toMatchObject({
      available: false,
      status: "missing-config",
      missingConfig: ["AWS_BEARER_TOKEN_BEDROCK"],
    });
  });

  it("returns Anthropic missing-config when Anthropic setup is incomplete", async () => {
    const availability = await getRequirementGenerationAvailabilitySnapshot({
      readConfig: () => ({
        ...completeAnthropicConfig,
        anthropicModel: null,
      }),
    });

    expect(availability.modes.real).toMatchObject({
      available: false,
      status: "missing-config",
      missingConfig: ["ANTHROPIC_MODEL"],
    });
  });

  it("returns blocked when Bedrock auth fails with the direct-access permission path", async () => {
    const docsClose = vi.fn();

    const availability = await getRequirementGenerationAvailabilitySnapshot({
      checkModelAvailability: async () => {
        throw new BedrockRequestError(
          "Bedrock unavailable",
          {
            cause: {
              message:
                "AccessDeniedException: User is not authorized to call bedrock:CallWithBearerToken",
              name: "AccessDeniedException",
            },
          },
        );
      },
      createDocumentationClient: async () => ({
        async close() {
          docsClose();
        },
        async lookupRequirementDocumentation() {
          throw new Error("not used");
        },
      }),
      readConfig: () => completeRealConfig,
    });

    expect(docsClose).toHaveBeenCalledTimes(1);
    expect(availability.modes.real).toMatchObject({
      available: false,
      status: "blocked",
    });
  });

  it("returns blocked when Anthropic auth fails", async () => {
    const availability = await getRequirementGenerationAvailabilitySnapshot({
      checkModelAvailability: async () => {
        throw new AnthropicRequestError("Anthropic unavailable", {
          status: 401,
        });
      },
      createDocumentationClient: async () => ({
        async close() {},
        async lookupRequirementDocumentation() {
          throw new Error("not used");
        },
      }),
      readConfig: () => completeAnthropicConfig,
    });

    expect(availability.modes.real).toMatchObject({
      available: false,
      status: "blocked",
    });
  });

  it("returns available when both MCP and Bedrock preflight checks pass", async () => {
    const availability = await getRequirementGenerationAvailabilitySnapshot({
      checkModelAvailability: vi.fn().mockResolvedValue(undefined),
      createDocumentationClient: async () => ({
        async close() {},
        async lookupRequirementDocumentation() {
          throw new Error("not used");
        },
      }),
      readConfig: () => completeRealConfig,
    });

    expect(availability.modes.real).toMatchObject({
      available: true,
      status: "available",
    });
  });

  it("returns available when both MCP and Anthropic preflight checks pass", async () => {
    const checkModelAvailability = vi.fn().mockResolvedValue(undefined);

    const availability = await getRequirementGenerationAvailabilitySnapshot({
      checkModelAvailability,
      createDocumentationClient: async () => ({
        async close() {},
        async lookupRequirementDocumentation() {
          throw new Error("not used");
        },
      }),
      readConfig: () => completeAnthropicConfig,
    });

    expect(checkModelAvailability).toHaveBeenCalledWith(
      expect.objectContaining({
        generationProvider: "anthropic",
        anthropicModel: "claude-haiku-4-5-20251001",
      }),
    );
    expect(availability.modes.real).toMatchObject({
      available: true,
      status: "available",
    });
  });

  it("returns available with a degraded message when MCP fails but Bedrock passes", async () => {
    const availability = await getRequirementGenerationAvailabilitySnapshot({
      checkModelAvailability: vi.fn().mockResolvedValue(undefined),
      createDocumentationClient: async () => {
        throw new Error("MCP not reachable from this runtime");
      },
      readConfig: () => completeRealConfig,
    });

    expect(availability.modes.real).toMatchObject({
      available: true,
      status: "available",
    });
    expect(availability.modes.real.message).toContain("MCP");
    expect(availability.modes.real.message).toContain("consultant review");
  });

  it("reuses the cached preflight result inside the TTL window", async () => {
    const checkModelAvailability = vi.fn().mockResolvedValue(undefined);
    const createDocumentationClient = vi.fn(async () => ({
      async close() {},
      async lookupRequirementDocumentation() {
        throw new Error("not used");
      },
    }));

    const now = vi
      .fn<() => Date>()
      .mockReturnValueOnce(new Date("2026-04-21T09:00:00.000Z"))
      .mockReturnValueOnce(new Date("2026-04-21T09:00:00.000Z"))
      .mockReturnValueOnce(new Date("2026-04-21T09:00:30.000Z"));

    await getRequirementGenerationAvailabilitySnapshot({
      checkModelAvailability,
      createDocumentationClient,
      now,
      readConfig: () => completeRealConfig,
      ttlMs: 60_000,
    });
    await getRequirementGenerationAvailabilitySnapshot({
      checkModelAvailability,
      createDocumentationClient,
      now,
      readConfig: () => completeRealConfig,
      ttlMs: 60_000,
    });

    expect(checkModelAvailability).toHaveBeenCalledTimes(1);
    expect(createDocumentationClient).toHaveBeenCalledTimes(1);
  });

  it("bypasses the cache when refresh is requested", async () => {
    const checkModelAvailability = vi.fn().mockResolvedValue(undefined);

    await getRequirementGenerationAvailabilitySnapshot({
      checkModelAvailability,
      createDocumentationClient: async () => ({
        async close() {},
        async lookupRequirementDocumentation() {
          throw new Error("not used");
        },
      }),
      readConfig: () => completeRealConfig,
      ttlMs: 60_000,
    });
    await getRequirementGenerationAvailabilitySnapshot({
      checkModelAvailability,
      createDocumentationClient: async () => ({
        async close() {},
        async lookupRequirementDocumentation() {
          throw new Error("not used");
        },
      }),
      readConfig: () => completeRealConfig,
      refresh: true,
      ttlMs: 60_000,
    });

    expect(checkModelAvailability).toHaveBeenCalledTimes(2);
  });
});
