import {
  normalizeSettingsBehaviorSnapshot,
  type SettingsBehaviorSnapshot,
} from "@/lib/settings";
import type { RequirementGenerationRouteMode } from "../generation-api";
import type { ParsedRequirement } from "../parser";

export interface RequirementGenerationRequestValidationSuccess {
  ok: true;
  projectId: string;
  mode?: RequirementGenerationRouteMode;
  requirements: ParsedRequirement[];
  settings: SettingsBehaviorSnapshot;
}

export interface RequirementGenerationRequestValidationError {
  ok: false;
  error: {
    code: "invalid-request";
    message: string;
  };
}

export type RequirementGenerationRequestValidationResult =
  | RequirementGenerationRequestValidationSuccess
  | RequirementGenerationRequestValidationError;

export function parseRequirementGenerationRequestBody(
  value: unknown,
): RequirementGenerationRequestValidationResult {
  if (!isRecord(value)) {
    return invalidRequest(
      "Request body must be a JSON object with a requirements array.",
    );
  }

  const projectId = readString(value.projectId);
  if (!projectId) {
    return invalidRequest("Request body must include a projectId.");
  }

  if (!Array.isArray(value.requirements)) {
    return invalidRequest("Request body must include a requirements array.");
  }

  const requirements: ParsedRequirement[] = [];
  const mode = readMode(value.mode);
  const settings = normalizeSettingsBehaviorSnapshot(value.settings);

  if (value.mode !== undefined && mode === null) {
    return invalidRequest(
      "Request body mode must be either 'mock' or 'real' when provided.",
    );
  }

  for (let index = 0; index < value.requirements.length; index += 1) {
    const parsedRequirement = parseRequirement(
      value.requirements[index],
      index,
    );

    if (!parsedRequirement.ok) {
      return parsedRequirement;
    }

    requirements.push(parsedRequirement.requirement);
  }

  return {
    ok: true,
    projectId,
    mode: mode ?? undefined,
    requirements,
    settings,
  };
}

function parseRequirement(
  value: unknown,
  index: number,
):
  | { ok: true; requirement: ParsedRequirement }
  | RequirementGenerationRequestValidationError {
  if (!isRecord(value)) {
    return invalidRequest(`Requirement at index ${index} must be an object.`);
  }

  const sourceRowNumber = readFiniteNumber(value.sourceRowNumber);
  if (sourceRowNumber === null) {
    return invalidRequest(
      `Requirement at index ${index} is missing a numeric sourceRowNumber.`,
    );
  }

  const requirementId = readString(value.requirementId);
  const requirementDescription = readString(value.requirementDescription);
  const l2Process = readString(value.l2Process);
  const l3Process = readString(value.l3Process);
  const operation = readString(value.operation);
  const demoRaw = readString(value.demoRaw);
  const detailDescriptionAndMotivation = readString(
    value.detailDescriptionAndMotivation,
  );
  const prioEms = readString(value.prioEms);
  const prioCws = readString(value.prioCws);
  const mvpRaw = readString(value.mvpRaw);
  const availability = readString(value.availability);
  const availabilityCm = readString(value.availabilityCm);
  const descriptionAvailability = readString(value.descriptionAvailability);
  const supportedPercent = readString(value.supportedPercent);
  const sourceComment = readString(value.sourceComment);

  if (
    requirementId === null ||
    requirementDescription === null ||
    l2Process === null ||
    l3Process === null ||
    operation === null ||
    demoRaw === null ||
    detailDescriptionAndMotivation === null ||
    prioEms === null ||
    prioCws === null ||
    mvpRaw === null ||
    availability === null ||
    availabilityCm === null ||
    descriptionAvailability === null ||
    supportedPercent === null ||
    sourceComment === null ||
    typeof value.demo !== "boolean" ||
    typeof value.mvp !== "boolean"
  ) {
    return invalidRequest(
      `Requirement at index ${index} is missing required parsed requirement fields.`,
    );
  }

  return {
    ok: true,
    requirement: {
      sourceRowNumber,
      requirementId,
      requirementDescription,
      l2Process,
      l3Process,
      operation,
      demo: value.demo,
      demoRaw,
      detailDescriptionAndMotivation,
      prioEms,
      prioCws,
      mvp: value.mvp,
      mvpRaw,
      availability,
      availabilityCm,
      descriptionAvailability,
      supportedPercent,
      sourceComment,
    },
  };
}

function invalidRequest(
  message: string,
): RequirementGenerationRequestValidationError {
  return {
    ok: false,
    error: {
      code: "invalid-request",
      message,
    },
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readMode(value: unknown): RequirementGenerationRouteMode | null {
  return value === "mock" || value === "real" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
