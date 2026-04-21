import type { GeneratedRequirementDraft } from "./generation";
import type { ParsedRequirement } from "./types";

export type RequirementGenerationRouteMode = "mock" | "real";
export type RequirementGenerationUnavailableReason =
  | "missing-config"
  | "blocked"
  | "check-failed";
export type RequirementGenerationCapabilityStatus =
  | "available"
  | RequirementGenerationUnavailableReason;

export interface RequirementGenerationRequestBody {
  requirements: ParsedRequirement[];
  mode?: RequirementGenerationRouteMode;
}

export interface RequirementGenerationRouteError {
  code: "invalid-request" | "real-generation-unavailable" | "generation-failed";
  message: string;
  reason?: RequirementGenerationUnavailableReason;
  missingConfig?: string[];
}

export interface RequirementGenerationRouteSuccessBody {
  ok: true;
  mode: RequirementGenerationRouteMode;
  drafts: GeneratedRequirementDraft[];
}

export interface RequirementGenerationRouteErrorBody {
  ok: false;
  error: RequirementGenerationRouteError;
}

export type RequirementGenerationRouteBody =
  | RequirementGenerationRouteSuccessBody
  | RequirementGenerationRouteErrorBody;

export interface RequirementGenerationModeCapability {
  mode: RequirementGenerationRouteMode;
  status: RequirementGenerationCapabilityStatus;
  available: boolean;
  message: string;
  missingConfig?: string[];
}

export interface RequirementGenerationAvailabilityBody {
  ok: true;
  checkedAt: string;
  modes: {
    mock: RequirementGenerationModeCapability;
    real: RequirementGenerationModeCapability;
  };
}
