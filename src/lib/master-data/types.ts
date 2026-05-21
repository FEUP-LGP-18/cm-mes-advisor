export type MasterDataObjectType =
  | "enterprise"
  | "site"
  | "facility"
  | "area"
  | "resource"
  | "product"
  | "material";

export type MasterDataWorkflowStep =
  | "setup"
  | "process"
  | "review"
  | "export"
  | "traceability";

export type MasterDataGenerationMode = "mock" | "real";

export type MasterDataGenerationStatus = "idle" | "running" | "ready" | "error";

export type MasterDataReviewStatus = "pending" | "review" | "approved";

export const MASTER_DATA_APPROVAL_REQUIRED_FEEDBACK =
  "Approve at least one Phase 1 row before starting Phase 2. Master Data setup only analyzes the approved consultant slice.";

export type MasterDataDraftFieldSource =
  | "template"
  | "default"
  | "relationship"
  | "requirement"
  | "generated"
  | "manual";

export type MasterDataConfidenceLevel = "high" | "medium" | "low";

export interface MasterDataConfidence {
  level: MasterDataConfidenceLevel;
  rationale: string;
}

export interface MasterDataApplicableRequirement {
  requirementKey: string;
  requirementId: string;
  requirementDescription: string;
  sourceRowNumber: number;
  l2Process: string;
  l3Process: string;
  operation: string;
  reviewStatus: string;
  consultantComment: string;
  reviewNote: string;
  suggestedObjectTypes: MasterDataObjectType[];
  preselected: boolean;
  confidence: MasterDataConfidence;
  reason: string;
}

export interface MasterDataDraftField {
  key: string;
  label: string;
  value: string;
  required: boolean;
  modified: boolean;
  source: MasterDataDraftFieldSource;
  warning: string | null;
}

export interface MasterDataDraftObject {
  objectId: string;
  objectType: MasterDataObjectType;
  sheetName: string;
  name: string;
  reviewStatus: MasterDataReviewStatus;
  modified: boolean;
  confidence: MasterDataConfidence;
  warnings: string[];
  sourceRequirementKeys: string[];
  sourceRequirementIds: string[];
  sourceRowNumbers: number[];
  fields: MasterDataDraftField[];
}

export interface MasterDataTraceabilityRecord {
  traceId: string;
  requirementKey: string;
  requirementId: string;
  sourceRowNumber: number;
  objectId: string;
  objectType: MasterDataObjectType;
  objectName: string;
  fieldKey: string;
  fieldLabel: string;
  value: string;
  source: MasterDataDraftFieldSource;
  note: string;
}

export interface MasterDataGenerationLogEntry {
  id: string;
  stage:
    | "analysis"
    | "mapping"
    | "defaults"
    | "relationships"
    | "validation"
    | "packaging";
  status: "waiting" | "running" | "complete" | "warning";
  message: string;
  objectType?: MasterDataObjectType;
  requirementKey?: string;
}

export interface MasterDataExportSummary {
  generatedAt: string | null;
  packageFileName: string | null;
  workbookFileName: string;
  objectCount: number;
  approvedCount: number;
  needsReviewCount: number;
  warnings: string[];
}

export interface MasterDataPhase2State {
  version: 1;
  active: boolean;
  currentStep: MasterDataWorkflowStep;
  mode: MasterDataGenerationMode;
  applicableRequirements: MasterDataApplicableRequirement[];
  selectedRequirementKeys: string[];
  selectedObjectTypes: MasterDataObjectType[];
  generationStatus: MasterDataGenerationStatus;
  generationFeedback: string | null;
  generatedAt: string | null;
  generationLogs: MasterDataGenerationLogEntry[];
  generatedObjects: Record<MasterDataObjectType, MasterDataDraftObject[]>;
  traceability: MasterDataTraceabilityRecord[];
  exportSummary: MasterDataExportSummary | null;
}

export interface MasterDataSheetTemplate {
  objectType: MasterDataObjectType;
  sheetName: string;
  headers: string[];
  sampleRow: Record<string, string>;
}

export interface MasterDataTemplateDefinition {
  workbookFileName: string;
  sheets: Record<MasterDataObjectType, MasterDataSheetTemplate>;
}

export const masterDataObjectTypes: MasterDataObjectType[] = [
  "enterprise",
  "site",
  "facility",
  "area",
  "resource",
  "product",
  "material",
];

export const masterDataHierarchyObjectTypes: MasterDataObjectType[] = [
  "enterprise",
  "site",
  "facility",
  "area",
  "resource",
];

export const masterDataWorkflowSteps: MasterDataWorkflowStep[] = [
  "setup",
  "process",
  "review",
  "export",
  "traceability",
];

export const masterDataObjectTypeLabels: Record<MasterDataObjectType, string> = {
  enterprise: "Enterprise",
  site: "Site",
  facility: "Facility",
  area: "Area",
  resource: "Resource",
  product: "Product",
  material: "Material",
};

export const masterDataSheetNames: Record<MasterDataObjectType, string> = {
  enterprise: "<DM>Enterprise",
  site: "<DM>Site",
  facility: "<DM>Facility",
  area: "<DM>Area",
  resource: "<DM>Resource",
  product: "<DM>Product",
  material: "<DM>Material",
};

export const masterDataWorkflowMeta: Record<
  MasterDataWorkflowStep,
  { label: string; subtitle: string }
> = {
  setup: {
    label: "Setup",
    subtitle: "Choose scope",
  },
  process: {
    label: "Process",
    subtitle: "Generate drafts",
  },
  review: {
    label: "Review",
    subtitle: "Approve objects",
  },
  export: {
    label: "Export",
    subtitle: "Download package",
  },
  traceability: {
    label: "Traceability",
    subtitle: "Audit links",
  },
};

export function createEmptyMasterDataObjectMap(): Record<
  MasterDataObjectType,
  MasterDataDraftObject[]
> {
  return Object.fromEntries(
    masterDataObjectTypes.map((objectType) => [objectType, []]),
  ) as unknown as Record<MasterDataObjectType, MasterDataDraftObject[]>;
}

export function createInitialMasterDataPhase2State(): MasterDataPhase2State {
  return {
    version: 1,
    active: false,
    currentStep: "setup",
    mode: "mock",
    applicableRequirements: [],
    selectedRequirementKeys: [],
    selectedObjectTypes: [...masterDataHierarchyObjectTypes, "product", "material"],
    generationStatus: "idle",
    generationFeedback: null,
    generatedAt: null,
    generationLogs: [],
    generatedObjects: createEmptyMasterDataObjectMap(),
    traceability: [],
    exportSummary: null,
  };
}

export function flattenMasterDataObjects(
  generatedObjects: Record<MasterDataObjectType, MasterDataDraftObject[]>,
): MasterDataDraftObject[] {
  return masterDataObjectTypes.flatMap(
    (objectType) => generatedObjects[objectType] ?? [],
  );
}

export function summarizeMasterDataObjects(
  generatedObjects: Record<MasterDataObjectType, MasterDataDraftObject[]>,
) {
  const objects = flattenMasterDataObjects(generatedObjects);
  const approvedCount = objects.filter(
    (object) => object.reviewStatus === "approved",
  ).length;
  const needsReviewCount = objects.filter(
    (object) => object.reviewStatus !== "approved",
  ).length;

  return {
    objectCount: objects.length,
    approvedCount,
    needsReviewCount,
  };
}
