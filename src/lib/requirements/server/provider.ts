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

export interface RequirementGenerationUnavailableError {
  code: "real-generation-unavailable";
  reason: "missing-config" | "not-implemented";
  message: string;
  missingConfig: string[];
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

export type RequirementGenerationResult =
  | RequirementGenerationSuccessResult
  | RequirementGenerationUnavailableResult;

export interface RequirementGenerationProvider {
  mode: RequirementGenerationMode;
  generate(
    requirements: ParsedRequirement[],
  ): Promise<RequirementGenerationResult>;
}

export function createRequirementGenerationProvider(
  config: RequirementGenerationServerConfig,
): RequirementGenerationProvider {
  return config.mode === "real"
    ? createRealRequirementGenerationProvider(config)
    : createMockRequirementGenerationProvider();
}

export function getRequirementGenerationAvailability(
  config: RequirementGenerationServerConfig,
): RequirementGenerationUnavailableError | null {
  if (config.mode !== "real") {
    return null;
  }

  const missingConfig = getMissingRealGenerationConfigKeys(config);
  const supportPackageNote =
    "The local LibreChat/RAG support package is documented, but this app has not verified a callable MCP or HTTP protocol contract yet.";

  if (missingConfig.length > 0) {
    return {
      code: "real-generation-unavailable",
      reason: "missing-config",
      message: `Real requirement generation is not configured yet. Server-side mock mode remains the safe default. ${supportPackageNote}`,
      missingConfig,
    };
  }

  return {
    code: "real-generation-unavailable",
    reason: "not-implemented",
    message: `Real requirement generation is still unavailable. Server-side mock mode remains the safe default. ${supportPackageNote}`,
    missingConfig: [],
  };
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
): RequirementGenerationProvider {
  return {
    mode: "real",
    async generate() {
      return {
        ok: false,
        providerMode: "real",
        error:
          getRequirementGenerationAvailability(config) ??
          ({
            code: "real-generation-unavailable",
            reason: "not-implemented",
            message:
              "Real requirement generation remains server-only and unavailable in this slice.",
            missingConfig: [],
          } satisfies RequirementGenerationUnavailableError),
      };
    },
  };
}
