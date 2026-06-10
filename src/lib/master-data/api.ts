import type { ParsedRequirement } from "@/lib/requirements/types";
import { masterDataObjectTypes, type MasterDataObjectType } from "./types";
import type {
  MasterDataApplicableRequirement,
  MasterDataDraftObject,
  MasterDataExportSummary,
  MasterDataGenerationLogEntry,
  MasterDataGenerationMode,
  MasterDataTraceabilityRecord,
} from "./types";

export interface MasterDataRequirementInput extends ParsedRequirement {
  requirementKey: string;
  reviewStatus: string;
  consultantComment: string;
  reviewNote: string;
}

export interface MasterDataProjectInput {
  projectId: string;
  projectName: string;
  customerName: string;
}

export interface MasterDataAnalyzeRequestBody {
  approvedRequirementKeys: string[];
  requirements: MasterDataRequirementInput[];
}

export interface MasterDataAnalyzeSuccessBody {
  ok: true;
  applicableRequirements: MasterDataApplicableRequirement[];
  suggestedObjectTypes: MasterDataObjectType[];
  warnings: string[];
}

export interface MasterDataAnalyzeErrorBody {
  ok: false;
  error: {
    code: "invalid-request" | "analysis-failed";
    message: string;
  };
}

export type MasterDataAnalyzeRouteBody =
  | MasterDataAnalyzeSuccessBody
  | MasterDataAnalyzeErrorBody;

export interface MasterDataGenerateRequestBody {
  mode?: MasterDataGenerationMode;
  project: MasterDataProjectInput;
  requirements: MasterDataRequirementInput[];
  selectedObjectTypes: MasterDataObjectType[];
  selectedRequirementKeys: string[];
}

export interface MasterDataGenerateSuccessBody {
  ok: true;
  generatedAt: string;
  mode: MasterDataGenerationMode;
  generatedObjects: Record<MasterDataObjectType, MasterDataDraftObject[]>;
  logs: MasterDataGenerationLogEntry[];
  traceability: MasterDataTraceabilityRecord[];
  warnings: string[];
}

export interface MasterDataGenerateErrorBody {
  ok: false;
  error: {
    code:
      | "invalid-request"
      | "generation-failed"
      | "real-generation-unavailable"
      | "unauthorized"
      | "forbidden";
    message: string;
  };
}

export type MasterDataGenerateRouteBody =
  | MasterDataGenerateSuccessBody
  | MasterDataGenerateErrorBody;

export interface MasterDataExportRequestBody {
  generatedAt: string | null;
  project: MasterDataProjectInput;
  generatedObjects: Record<MasterDataObjectType, MasterDataDraftObject[]>;
  traceability: MasterDataTraceabilityRecord[];
}

export interface MasterDataExportSuccessBody {
  ok: true;
  fileName: string;
  mimeType: string;
  packageBase64: string;
  summary: MasterDataExportSummary;
}

export interface MasterDataExportErrorBody {
  ok: false;
  error: {
    code: "invalid-request" | "export-failed";
    message: string;
  };
}

export type MasterDataExportRouteBody =
  | MasterDataExportSuccessBody
  | MasterDataExportErrorBody;

interface MasterDataRequestValidationSuccess<TBody> {
  ok: true;
  body: TBody;
}

interface MasterDataRequestValidationError {
  ok: false;
  message: string;
}

type MasterDataRequestValidationResult<TBody> =
  | MasterDataRequestValidationSuccess<TBody>
  | MasterDataRequestValidationError;

const masterDataObjectTypeSet = new Set<string>(masterDataObjectTypes);

export function parseMasterDataAnalyzeRequestBody(
  value: unknown,
): MasterDataRequestValidationResult<MasterDataAnalyzeRequestBody> {
  if (!isRecord(value)) {
    return invalidMasterDataRequest(
      "Analyze requests must be JSON objects with requirements and approvedRequirementKeys.",
    );
  }

  const requirements = parseRequirements(value.requirements);
  const approvedRequirementKeys = parseStringArray(
    value.approvedRequirementKeys,
    "approvedRequirementKeys",
  );

  if (!requirements.ok) {
    return requirements;
  }

  if (!approvedRequirementKeys.ok) {
    return approvedRequirementKeys;
  }

  return {
    ok: true,
    body: {
      approvedRequirementKeys: approvedRequirementKeys.body,
      requirements: requirements.body,
    },
  };
}

export function parseMasterDataGenerateRequestBody(
  value: unknown,
): MasterDataRequestValidationResult<MasterDataGenerateRequestBody> {
  if (!isRecord(value)) {
    return invalidMasterDataRequest(
      "Generate requests must be JSON objects with project metadata, requirements, and selected Master Data scope.",
    );
  }

  const project = parseProject(value.project);
  const requirements = parseRequirements(value.requirements);
  const selectedRequirementKeys = parseStringArray(
    value.selectedRequirementKeys,
    "selectedRequirementKeys",
    { requireNonEmpty: true },
  );
  const selectedObjectTypes = parseObjectTypes(
    value.selectedObjectTypes,
    "selectedObjectTypes",
    { requireNonEmpty: true },
  );
  const mode = parseGenerationMode(value.mode);

  if (!project.ok) {
    return project;
  }

  if (!requirements.ok) {
    return requirements;
  }

  if (!selectedRequirementKeys.ok) {
    return selectedRequirementKeys;
  }

  if (!selectedObjectTypes.ok) {
    return selectedObjectTypes;
  }

  if (!mode.ok) {
    return mode;
  }

  return {
    ok: true,
    body: {
      mode: mode.body,
      project: project.body,
      requirements: requirements.body,
      selectedObjectTypes: selectedObjectTypes.body,
      selectedRequirementKeys: selectedRequirementKeys.body,
    },
  };
}

export function parseMasterDataExportRequestBody(
  value: unknown,
): MasterDataRequestValidationResult<MasterDataExportRequestBody> {
  if (!isRecord(value)) {
    return invalidMasterDataRequest(
      "Export requests must be JSON objects with project metadata, generatedObjects, and traceability.",
    );
  }

  const project = parseProject(value.project);
  const generatedObjects = parseGeneratedObjects(value.generatedObjects);
  const traceability = parseTraceability(value.traceability);

  if (!project.ok) {
    return project;
  }

  if (!generatedObjects.ok) {
    return generatedObjects;
  }

  if (!traceability.ok) {
    return traceability;
  }

  if (value.generatedAt !== null && typeof value.generatedAt !== "string") {
    return invalidMasterDataRequest(
      "generatedAt must be a string timestamp or null.",
    );
  }

  return {
    ok: true,
    body: {
      generatedAt: value.generatedAt,
      generatedObjects: generatedObjects.body,
      project: project.body,
      traceability: traceability.body,
    },
  };
}

function parseProject(
  value: unknown,
): MasterDataRequestValidationResult<MasterDataProjectInput> {
  if (!isRecord(value)) {
    return invalidMasterDataRequest("project must be an object.");
  }

  if (
    typeof value.projectId !== "string" ||
    typeof value.projectName !== "string" ||
    typeof value.customerName !== "string"
  ) {
    return invalidMasterDataRequest(
      "project must include projectId, projectName, and customerName strings.",
    );
  }

  return {
    ok: true,
    body: {
      customerName: value.customerName,
      projectId: value.projectId,
      projectName: value.projectName,
    },
  };
}

function parseGenerationMode(
  value: unknown,
): MasterDataRequestValidationResult<MasterDataGenerationMode | undefined> {
  if (value === undefined) {
    return {
      ok: true,
      body: undefined,
    };
  }

  if (value === "mock" || value === "real") {
    return {
      ok: true,
      body: value,
    };
  }

  return invalidMasterDataRequest("mode must be either 'mock' or 'real'.");
}

function parseRequirements(
  value: unknown,
): MasterDataRequestValidationResult<MasterDataRequirementInput[]> {
  if (!Array.isArray(value)) {
    return invalidMasterDataRequest("requirements must be an array.");
  }

  const requirements: MasterDataRequirementInput[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const requirement = parseRequirement(value[index], index);

    if (!requirement.ok) {
      return requirement;
    }

    requirements.push(requirement.body);
  }

  return {
    ok: true,
    body: requirements,
  };
}

function parseRequirement(
  value: unknown,
  index: number,
): MasterDataRequestValidationResult<MasterDataRequirementInput> {
  if (!isRecord(value)) {
    return invalidMasterDataRequest(
      `Requirement at index ${index} must be an object.`,
    );
  }

  const sourceRowNumber = readFiniteNumber(value.sourceRowNumber);
  const stringFields = {
    availability: value.availability,
    availabilityCm: value.availabilityCm,
    consultantComment: value.consultantComment,
    demoRaw: value.demoRaw,
    descriptionAvailability: value.descriptionAvailability,
    detailDescriptionAndMotivation: value.detailDescriptionAndMotivation,
    l2Process: value.l2Process,
    l3Process: value.l3Process,
    mvpRaw: value.mvpRaw,
    operation: value.operation,
    prioCws: value.prioCws,
    prioEms: value.prioEms,
    requirementDescription: value.requirementDescription,
    requirementId: value.requirementId,
    requirementKey: value.requirementKey,
    reviewNote: value.reviewNote,
    reviewStatus: value.reviewStatus,
    sourceComment: value.sourceComment,
    supportedPercent: value.supportedPercent,
  };

  if (sourceRowNumber === null) {
    return invalidMasterDataRequest(
      `Requirement at index ${index} is missing a numeric sourceRowNumber.`,
    );
  }

  if (typeof value.demo !== "boolean" || typeof value.mvp !== "boolean") {
    return invalidMasterDataRequest(
      `Requirement at index ${index} must include boolean demo and mvp fields.`,
    );
  }

  for (const [fieldName, fieldValue] of Object.entries(stringFields)) {
    if (typeof fieldValue !== "string") {
      return invalidMasterDataRequest(
        `Requirement at index ${index} is missing string field ${fieldName}.`,
      );
    }
  }

  return {
    ok: true,
    body: {
      availability: stringFields.availability as string,
      availabilityCm: stringFields.availabilityCm as string,
      consultantComment: stringFields.consultantComment as string,
      demo: value.demo,
      demoRaw: stringFields.demoRaw as string,
      descriptionAvailability: stringFields.descriptionAvailability as string,
      detailDescriptionAndMotivation:
        stringFields.detailDescriptionAndMotivation as string,
      l2Process: stringFields.l2Process as string,
      l3Process: stringFields.l3Process as string,
      mvp: value.mvp,
      mvpRaw: stringFields.mvpRaw as string,
      operation: stringFields.operation as string,
      prioCws: stringFields.prioCws as string,
      prioEms: stringFields.prioEms as string,
      requirementDescription: stringFields.requirementDescription as string,
      requirementId: stringFields.requirementId as string,
      requirementKey: stringFields.requirementKey as string,
      reviewNote: stringFields.reviewNote as string,
      reviewStatus: stringFields.reviewStatus as string,
      sourceComment: stringFields.sourceComment as string,
      sourceRowNumber,
      supportedPercent: stringFields.supportedPercent as string,
    },
  };
}

function parseStringArray(
  value: unknown,
  fieldName: string,
  options: { requireNonEmpty?: boolean } = {},
): MasterDataRequestValidationResult<string[]> {
  if (!Array.isArray(value)) {
    return invalidMasterDataRequest(`${fieldName} must be an array.`);
  }

  if (options.requireNonEmpty && value.length === 0) {
    return invalidMasterDataRequest(`${fieldName} must not be empty.`);
  }

  if (!value.every((item) => typeof item === "string")) {
    return invalidMasterDataRequest(`${fieldName} must contain only strings.`);
  }

  return {
    ok: true,
    body: value,
  };
}

function parseObjectTypes(
  value: unknown,
  fieldName: string,
  options: { requireNonEmpty?: boolean } = {},
): MasterDataRequestValidationResult<MasterDataObjectType[]> {
  const strings = parseStringArray(value, fieldName, options);

  if (!strings.ok) {
    return strings;
  }

  if (!strings.body.every((item) => masterDataObjectTypeSet.has(item))) {
    return invalidMasterDataRequest(
      `${fieldName} contains an unsupported Master Data object type.`,
    );
  }

  return {
    ok: true,
    body: strings.body as MasterDataObjectType[],
  };
}

function parseGeneratedObjects(
  value: unknown,
): MasterDataRequestValidationResult<
  Record<MasterDataObjectType, MasterDataDraftObject[]>
> {
  if (!isRecord(value)) {
    return invalidMasterDataRequest("generatedObjects must be an object.");
  }

  const keys = Object.keys(value);
  const hasUnknownKey = keys.some((key) => !masterDataObjectTypeSet.has(key));

  if (hasUnknownKey) {
    return invalidMasterDataRequest(
      "generatedObjects contains an unsupported Master Data object type.",
    );
  }

  for (const objectType of masterDataObjectTypes) {
    if (!Array.isArray(value[objectType])) {
      return invalidMasterDataRequest(
        `generatedObjects.${objectType} must be an array.`,
      );
    }

    const objects = value[objectType];

    for (let index = 0; index < objects.length; index += 1) {
      if (!isValidDraftObject(objects[index], objectType)) {
        return invalidMasterDataRequest(
          `generatedObjects.${objectType}[${index}] is not a valid draft object.`,
        );
      }
    }
  }

  return {
    ok: true,
    body: value as Record<MasterDataObjectType, MasterDataDraftObject[]>,
  };
}

function isValidDraftObject(
  value: unknown,
  expectedObjectType: MasterDataObjectType,
): value is MasterDataDraftObject {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.objectType === expectedObjectType &&
    typeof value.objectId === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.fields) &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.sourceRequirementKeys)
  );
}

function parseTraceability(
  value: unknown,
): MasterDataRequestValidationResult<MasterDataTraceabilityRecord[]> {
  if (!Array.isArray(value)) {
    return invalidMasterDataRequest("traceability must be an array.");
  }

  for (let index = 0; index < value.length; index += 1) {
    const record = value[index];

    if (
      !isRecord(record) ||
      typeof record.traceId !== "string" ||
      typeof record.requirementKey !== "string" ||
      typeof record.objectId !== "string" ||
      typeof record.objectType !== "string" ||
      !masterDataObjectTypeSet.has(record.objectType)
    ) {
      return invalidMasterDataRequest(
        `traceability[${index}] is not a valid traceability record.`,
      );
    }
  }

  return {
    ok: true,
    body: value as MasterDataTraceabilityRecord[],
  };
}

function invalidMasterDataRequest(
  message: string,
): MasterDataRequestValidationError {
  return {
    ok: false,
    message,
  };
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
