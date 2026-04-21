import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRequirementGenerationAvailabilitySnapshot,
  resetRequirementGenerationAvailabilityCache,
} from "./availability";
import { BedrockRequestError } from "./bedrock-client";

const completeRealConfig = {
  mode: "mock" as const,
  mcpServerUrl: "https://example.invalid/mcp",
  mesBaseUrl: null,
  bedrockModelId: "example-bedrock-model-id",
  awsRegion: "eu-west-1",
  awsAccessKeyId: null,
  awsSecretAccessKey: null,
  awsSessionToken: null,
  awsBearerTokenBedrock: "ABSKexample-token",
  mcpUserAccount: null,
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

  it("returns blocked when Bedrock auth fails with the direct-access permission path", async () => {
    const docsClose = vi.fn();

    const availability = await getRequirementGenerationAvailabilitySnapshot({
      checkBedrockAvailability: async () => {
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

  it("returns available when both MCP and Bedrock preflight checks pass", async () => {
    const availability = await getRequirementGenerationAvailabilitySnapshot({
      checkBedrockAvailability: vi.fn().mockResolvedValue(undefined),
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

  it("reuses the cached preflight result inside the TTL window", async () => {
    const checkBedrockAvailability = vi.fn().mockResolvedValue(undefined);
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
      checkBedrockAvailability,
      createDocumentationClient,
      now,
      readConfig: () => completeRealConfig,
      ttlMs: 60_000,
    });
    await getRequirementGenerationAvailabilitySnapshot({
      checkBedrockAvailability,
      createDocumentationClient,
      now,
      readConfig: () => completeRealConfig,
      ttlMs: 60_000,
    });

    expect(checkBedrockAvailability).toHaveBeenCalledTimes(1);
    expect(createDocumentationClient).toHaveBeenCalledTimes(1);
  });

  it("bypasses the cache when refresh is requested", async () => {
    const checkBedrockAvailability = vi.fn().mockResolvedValue(undefined);

    await getRequirementGenerationAvailabilitySnapshot({
      checkBedrockAvailability,
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
      checkBedrockAvailability,
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

    expect(checkBedrockAvailability).toHaveBeenCalledTimes(2);
  });
});
