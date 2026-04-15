import type { GeneratedRequirementDraft } from "./generation";
import type { ParsedRequirement } from "./parser";

export type RequirementGenerationRouteMode = "mock" | "real";

export interface RequirementGenerationRequestBody {
  requirements: ParsedRequirement[];
}

export interface RequirementGenerationRouteError {
  code: "invalid-request" | "real-generation-unavailable" | "generation-failed";
  message: string;
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
