import type { ParsedRequirement } from "../parser";
import {
  createMockGeneratedRequirementDraft,
  type GeneratedRequirementDraft,
} from "../generation";
import {
  getMissingRealGenerationConfigKeys,
  type RequirementGenerationMode,
  type RequirementGenerationServerConfig,
} from "./config";
import {
  generateRealRequirementDrafts,
  RequirementGenerationInfrastructureError,
  type RealRequirementGenerationDependencies,
} from "./real-generation";

export interface RequirementGenerationUnavailableError {
  code: "real-generation-unavailable";
  reason: "missing-config";
  message: string;
  missingConfig: string[];
}

export interface RequirementGenerationFailedError {
  code: "generation-failed";
  message: string;
}

export interface RequirementGenerationSuccessResult {
  ok: true;
  providerMode: RequirementGenerationMode;
  drafts: GeneratedRequirementDraft[];
}

export interface RequirementGenerationUnavailableResult {
  ok: false;
  providerMode: "real";
  error: RequirementGenerationUnavailableError;
}

export interface RequirementGenerationFailedResult {
  ok: false;
  providerMode: RequirementGenerationMode;
  error: RequirementGenerationFailedError;
}

export type RequirementGenerationResult =
  | RequirementGenerationSuccessResult
  | RequirementGenerationUnavailableResult
  | RequirementGenerationFailedResult;

export interface RequirementGenerationProvider {
  mode: RequirementGenerationMode;
  generate(
    requirements: ParsedRequirement[],
  ): Promise<RequirementGenerationResult>;
}

export function createRequirementGenerationProvider(
  config: RequirementGenerationServerConfig,
  dependencies: RealRequirementGenerationDependencies = {},
): RequirementGenerationProvider {
  return config.mode === "real"
    ? createRealRequirementGenerationProvider(config, dependencies)
    : createMockRequirementGenerationProvider();
}

export function getRequirementGenerationAvailability(
  config: RequirementGenerationServerConfig,
): RequirementGenerationUnavailableError | null {
  if (config.mode !== "real") {
    return null;
  }

  const missingConfig = getMissingRealGenerationConfigKeys(config);

  if (missingConfig.length > 0) {
    return {
      code: "real-generation-unavailable",
      reason: "missing-config",
      message:
        "Real requirement generation is not configured yet. Provide the MCP server URL, Bedrock model, region, and either AWS credentials or a Bedrock bearer token before switching out of prototype mode.",
      missingConfig,
    };
  }

  return null;
}

function createMockRequirementGenerationProvider(): RequirementGenerationProvider {
  return {
    mode: "mock",
    async generate(requirements) {
      return {
        ok: true,
        providerMode: "mock",
        drafts: requirements.map((requirement) =>
          createMockGeneratedRequirementDraft(requirement),
        ),
      };
    },
  };
}

function createRealRequirementGenerationProvider(
  config: RequirementGenerationServerConfig,
  dependencies: RealRequirementGenerationDependencies,
): RequirementGenerationProvider {
  return {
    mode: "real",
    async generate(requirements) {
      const unavailable = getRequirementGenerationAvailability(config);
      if (unavailable) {
        return {
          ok: false,
          providerMode: "real",
          error: unavailable,
        };
      }

      try {
        return {
          ok: true,
          providerMode: "real",
          drafts: await generateRealRequirementDrafts(
            requirements,
            config,
            dependencies,
          ),
        };
      } catch (error) {
        return {
          ok: false,
          providerMode: "real",
          error: {
            code: "generation-failed",
            message:
              error instanceof RequirementGenerationInfrastructureError
                ? error.message
                : "Real requirement generation failed before a safe draft response could be created.",
          },
        };
      }
    },
  };
}
