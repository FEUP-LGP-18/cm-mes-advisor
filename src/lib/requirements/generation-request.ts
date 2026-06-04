import {
  normalizeSettingsBehaviorSnapshot,
  type SettingsBehaviorSnapshot,
} from "@/lib/settings";
import type { RequirementGenerationRouteMode } from "./generation-api";
import type { ParsedRequirement } from "./types";

export interface RequirementGenerationRequestPayload {
  mode?: RequirementGenerationRouteMode;
  projectId: string;
  requirements: ParsedRequirement[];
  settings: SettingsBehaviorSnapshot;
}

export function createRequirementGenerationRequestPayload({
  mode,
  projectId,
  requirements,
  settings,
}: {
  mode?: RequirementGenerationRouteMode;
  projectId: string;
  requirements: ParsedRequirement[];
  settings?: unknown;
}): RequirementGenerationRequestPayload {
  return {
    mode,
    projectId,
    requirements: requirements.map(toGenerationRequestRequirement),
    settings: normalizeSettingsBehaviorSnapshot(settings),
  };
}

export function toGenerationRequestRequirement(
  requirement: ParsedRequirement,
): ParsedRequirement {
  return {
    sourceRowNumber: requirement.sourceRowNumber,
    requirementId: requirement.requirementId,
    requirementDescription: requirement.requirementDescription,
    l2Process: requirement.l2Process,
    l3Process: requirement.l3Process,
    operation: requirement.operation,
    demo: requirement.demo,
    demoRaw: requirement.demoRaw,
    detailDescriptionAndMotivation: requirement.detailDescriptionAndMotivation,
    prioEms: requirement.prioEms,
    prioCws: requirement.prioCws,
    mvp: requirement.mvp,
    mvpRaw: requirement.mvpRaw,
    availability: requirement.availability,
    availabilityCm: requirement.availabilityCm,
    descriptionAvailability: requirement.descriptionAvailability,
    supportedPercent: requirement.supportedPercent,
    sourceComment: requirement.sourceComment,
  };
}
