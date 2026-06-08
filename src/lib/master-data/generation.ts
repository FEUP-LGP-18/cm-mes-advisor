import type { MasterDataGenerateRequestBody } from "./api";
import {
  createEmptyMasterDataObjectMap,
  masterDataObjectTypeLabels,
  masterDataSheetNames,
  type MasterDataConfidence,
  type MasterDataDraftField,
  type MasterDataDraftFieldSource,
  type MasterDataDraftObject,
  type MasterDataGenerationLogEntry,
  type MasterDataObjectType,
  type MasterDataSheetTemplate,
  type MasterDataTemplateDefinition,
  type MasterDataTraceabilityRecord,
} from "./types";

interface GenerationContext {
  enterpriseName: string;
  facilityName: string;
  materialName: string;
  productName: string;
  projectSlug: string;
  siteName: string;
}

interface AiSuggestion {
  confidence?: MasterDataConfidence;
  description?: string;
  nameHint?: string;
  typeHint?: string;
  warnings?: string[];
}

export interface GenerateMasterDataDraftsInput
  extends Pick<
    MasterDataGenerateRequestBody,
    "project" | "requirements" | "selectedObjectTypes" | "selectedRequirementKeys"
  > {
  aiSuggestions?: Partial<Record<MasterDataObjectType, AiSuggestion>>;
  template: MasterDataTemplateDefinition;
}

export function generateMasterDataDrafts({
  aiSuggestions = {},
  project,
  requirements,
  selectedObjectTypes,
  selectedRequirementKeys,
  template,
}: GenerateMasterDataDraftsInput): {
  generatedObjects: Record<MasterDataObjectType, MasterDataDraftObject[]>;
  logs: MasterDataGenerationLogEntry[];
  traceability: MasterDataTraceabilityRecord[];
  warnings: string[];
} {
  const selectedRequirements = requirements.filter((requirement) =>
    selectedRequirementKeys.includes(requirement.requirementKey),
  );
  const requirementsByObjectType = groupRequirementsByObjectType(
    selectedRequirements,
    selectedObjectTypes,
  );
  const context = createGenerationContext(project.projectName);
  const generatedObjects = createEmptyMasterDataObjectMap();
  const traceability: MasterDataTraceabilityRecord[] = [];
  const warnings = new Set<string>();
  const logs: MasterDataGenerationLogEntry[] = [
    createLogEntry("analysis", "complete", `${selectedRequirements.length} requirement(s) selected for Phase 2 generation.`),
    createLogEntry("mapping", "running", `Mapping the selected requirements to ${selectedObjectTypes.length} object type(s).`),
  ];

  if (selectedObjectTypes.includes("enterprise")) {
    generatedObjects.enterprise = [
      createDraftObject({
        aiSuggestion: aiSuggestions.enterprise,
        context,
        objectType: "enterprise",
        requirementInputs: requirementsByObjectType.enterprise,
        template: template.sheets.enterprise,
        traceability,
        warnings,
      }),
    ];
  }

  if (selectedObjectTypes.includes("site")) {
    generatedObjects.site = [
      createDraftObject({
        aiSuggestion: aiSuggestions.site,
        context,
        objectType: "site",
        overrides: {
          Enterprise: context.enterpriseName,
          Name: context.siteName,
        },
        requirementInputs: requirementsByObjectType.site,
        template: template.sheets.site,
        traceability,
        warnings,
      }),
    ];
  }

  if (selectedObjectTypes.includes("facility")) {
    generatedObjects.facility = [
      createDraftObject({
        aiSuggestion: aiSuggestions.facility,
        context,
        objectType: "facility",
        overrides: {
          Name: context.facilityName,
          Site: context.siteName,
        },
        requirementInputs: requirementsByObjectType.facility,
        template: template.sheets.facility,
        traceability,
        warnings,
      }),
    ];
  }

  if (selectedObjectTypes.includes("area")) {
    generatedObjects.area = createAreaDrafts({
      aiSuggestion: aiSuggestions.area,
      context,
      requirementInputs: requirementsByObjectType.area,
      template: template.sheets.area,
      traceability,
      warnings,
    });
  }

  if (selectedObjectTypes.includes("resource")) {
    generatedObjects.resource = createResourceDrafts({
      aiSuggestion: aiSuggestions.resource,
      areas: generatedObjects.area,
      context,
      requirementInputs: requirementsByObjectType.resource,
      template: template.sheets.resource,
      traceability,
      warnings,
    });
  }

  if (selectedObjectTypes.includes("product")) {
    generatedObjects.product = [
      createDraftObject({
        aiSuggestion: aiSuggestions.product,
        context,
        objectType: "product",
        overrides: {
          Name: context.productName,
        },
        requirementInputs: requirementsByObjectType.product,
        template: template.sheets.product,
        traceability,
        warnings,
      }),
    ];
  }

  if (selectedObjectTypes.includes("material")) {
    generatedObjects.material = [
      createDraftObject({
        aiSuggestion: aiSuggestions.material,
        context,
        objectType: "material",
        overrides: {
          Facility: context.facilityName,
          Name: context.materialName,
          Product: context.productName,
        },
        requirementInputs: requirementsByObjectType.material,
        template: template.sheets.material,
        traceability,
        warnings,
      }),
    ];
  }

  logs.push(
    createLogEntry(
      "mapping",
      "complete",
      `${flattenObjectCount(generatedObjects)} draft object(s) were mapped from the selected requirements.`,
    ),
    createLogEntry(
      "defaults",
      "complete",
      "Template-backed defaults were applied to keep the workbook structure import-oriented.",
    ),
    createLogEntry(
      "relationships",
      "complete",
      "Hierarchy references were resolved across enterprise, site, facility, area, resource, product, and material where applicable.",
    ),
    createLogEntry(
      "packaging",
      warnings.size > 0 ? "warning" : "complete",
      warnings.size > 0
        ? "Some fields still rely on safe defaults and should be checked in review before export."
        : "Master Data package assembled and ready for consultant review.",
    ),
  );

  return {
    generatedObjects,
    logs,
    traceability,
    warnings: Array.from(warnings),
  };
}

function createGenerationContext(projectName: string): GenerationContext {
  const cleanedName = projectName.trim() || "Customer Demo";
  const base = cleanedName.replace(/\s+/g, " ").trim();
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const title = toTitle(base);

  return {
    enterpriseName: `${title} Enterprise`,
    facilityName: `${title} Facility`,
    materialName: `${title} Material`,
    productName: `${title} Product`,
    projectSlug: slug,
    siteName: `${title} Site`,
  };
}

function groupRequirementsByObjectType(
  requirements: MasterDataGenerateRequestBody["requirements"],
  selectedObjectTypes: MasterDataObjectType[],
): Record<MasterDataObjectType, MasterDataGenerateRequestBody["requirements"]> {
  const grouped: Record<
    MasterDataObjectType,
    MasterDataGenerateRequestBody["requirements"]
  > = {
    enterprise: [],
    site: [],
    facility: [],
    area: [],
    resource: [],
    product: [],
    material: [],
  };

  requirements.forEach((requirement) => {
    const text = [
      requirement.requirementDescription,
      requirement.detailDescriptionAndMotivation,
      requirement.l2Process,
      requirement.l3Process,
      requirement.operation,
      requirement.sourceComment,
      requirement.consultantComment,
    ]
      .join(" ")
      .toLowerCase();

    selectedObjectTypes.forEach((objectType) => {
      if (matchesObjectType(text, objectType)) {
        grouped[objectType].push(requirement);
      }
    });
  });

  selectedObjectTypes.forEach((objectType) => {
    if (grouped[objectType].length === 0) {
      grouped[objectType] = requirements;
    }
  });

  return grouped;
}

function matchesObjectType(text: string, objectType: MasterDataObjectType) {
  switch (objectType) {
    case "enterprise":
      return text.includes("enterprise") || text.includes("multi-site");
    case "site":
      return text.includes("site") || text.includes("plant");
    case "facility":
      return text.includes("facility") || text.includes("factory");
    case "area":
      return text.includes("area") || text.includes("manufacturing");
    case "resource":
      return (
        text.includes("resource") ||
        text.includes("equipment") ||
        text.includes("operation") ||
        text.includes("schedule") ||
        text.includes("packing")
      );
    case "product":
      return (
        text.includes("product") ||
        text.includes("recipe") ||
        text.includes("setup")
      );
    case "material":
      return (
        text.includes("material") ||
        text.includes("trace") ||
        text.includes("serial") ||
        text.includes("batch") ||
        text.includes("lot") ||
        text.includes("box")
      );
  }
}

function createAreaDrafts({
  aiSuggestion,
  context,
  requirementInputs,
  template,
  traceability,
  warnings,
}: {
  aiSuggestion?: AiSuggestion;
  context: GenerationContext;
  requirementInputs: MasterDataGenerateRequestBody["requirements"];
  template: MasterDataSheetTemplate;
  traceability: MasterDataTraceabilityRecord[];
  warnings: Set<string>;
}) {
  const uniqueAreaSeeds = Array.from(
    new Map(
      requirementInputs.map((requirement) => [
        createAreaSeed(requirement),
        requirement,
      ]),
    ).entries(),
  ).slice(0, 4);

  return uniqueAreaSeeds.map(([seed, requirement], index) =>
    createDraftObject({
      aiSuggestion,
      context,
      objectType: "area",
      overrides: {
        DisplayOrder: String((index + 1) * 10),
        Facility: context.facilityName,
        Name: `${seed} Area`,
      },
      requirementInputs: [requirement],
      template,
      traceability,
      warnings,
    }),
  );
}

function createResourceDrafts({
  aiSuggestion,
  areas,
  context,
  requirementInputs,
  template,
  traceability,
  warnings,
}: {
  aiSuggestion?: AiSuggestion;
  areas: MasterDataDraftObject[];
  context: GenerationContext;
  requirementInputs: MasterDataGenerateRequestBody["requirements"];
  template: MasterDataSheetTemplate;
  traceability: MasterDataTraceabilityRecord[];
  warnings: Set<string>;
}) {
  const areaNames = areas.map((area) => getFieldValue(area.fields, "Name"));
  const uniqueResourceSeeds = Array.from(
    new Map(
      requirementInputs.map((requirement) => [
        createResourceSeed(requirement),
        requirement,
      ]),
    ).entries(),
  ).slice(0, 5);

  return uniqueResourceSeeds.map(([seed, requirement], index) =>
    createDraftObject({
      aiSuggestion,
      context,
      objectType: "resource",
      overrides: {
        Area: areaNames[index % Math.max(areaNames.length, 1)] ?? `${context.projectSlug} area`,
        DisplayOrder: String((index + 1) * 10),
        Name: `${seed} Resource`,
      },
      requirementInputs: [requirement],
      template,
      traceability,
      warnings,
    }),
  );
}

function createDraftObject({
  aiSuggestion,
  context,
  objectType,
  overrides = {},
  requirementInputs,
  template,
  traceability,
  warnings,
}: {
  aiSuggestion?: AiSuggestion;
  context: GenerationContext;
  objectType: MasterDataObjectType;
  overrides?: Record<string, string>;
  requirementInputs: MasterDataGenerateRequestBody["requirements"];
  template: MasterDataSheetTemplate;
  traceability: MasterDataTraceabilityRecord[];
  warnings: Set<string>;
}): MasterDataDraftObject {
  const primaryRequirement = requirementInputs[0];
  const fieldMap = new Map<string, MasterDataDraftField>();
  const objectName =
    overrides.Name ??
    aiSuggestion?.nameHint?.trim() ??
    template.sampleRow.Name ??
    `${toTitle(context.projectSlug)} ${masterDataObjectTypeLabels[objectType]}`;

  template.headers.forEach((header) => {
    const sampleValue = template.sampleRow[header] ?? "";
    fieldMap.set(header, {
      key: header,
      label: header,
      value: sampleValue,
      required: header === "Name" || header === "Description",
      modified: false,
      source: sampleValue.length > 0 ? "template" : "default",
      warning: null,
    });
  });

  const baseDescription =
    aiSuggestion?.description?.trim() ||
    primaryRequirement?.consultantComment?.trim() ||
    primaryRequirement?.requirementDescription?.trim() ||
    `${masterDataObjectTypeLabels[objectType]} generated for ${context.projectSlug}.`;

  applyFieldOverride(fieldMap, "Name", objectName, "generated");
  applyFieldOverride(fieldMap, "Description", baseDescription, "generated");

  if (primaryRequirement?.requirementDescription) {
    if (fieldMap.has("Type") && !overrides.Type && aiSuggestion?.typeHint) {
      applyFieldOverride(fieldMap, "Type", aiSuggestion.typeHint, "generated");
    }

    if (fieldMap.has("ProductType") && !overrides.ProductType) {
      applyFieldOverride(
        fieldMap,
        "ProductType",
        primaryRequirement.requirementDescription.toLowerCase().includes("raw")
          ? "RawMaterial"
          : "FinishedGood",
        "generated",
      );
    }

    if (fieldMap.has("Form") && !overrides.Form) {
      applyFieldOverride(
        fieldMap,
        "Form",
        primaryRequirement.requirementDescription.toLowerCase().includes("serial")
          ? "Cookie"
          : "Lot",
        "generated",
      );
    }
  }

  Object.entries(overrides).forEach(([header, value]) => {
    applyFieldOverride(fieldMap, header, value, "relationship");
  });

  const fields = template.headers.map((header) => fieldMap.get(header)!);
  const objectWarnings = dedupeStrings([
    ...collectDefaultWarnings(fields),
    ...(aiSuggestion?.warnings ?? []),
    requirementInputs.length > 1
      ? `This ${masterDataObjectTypeLabels[objectType].toLowerCase()} aggregates ${requirementInputs.length} requirements and should be reviewed for scope drift.`
      : null,
  ]);

  objectWarnings.forEach((warning) => warnings.add(warning));

  const object: MasterDataDraftObject = {
    objectId: `${objectType}:${slugify(objectName)}`,
    objectType,
    sheetName: masterDataSheetNames[objectType],
    name: objectName,
    reviewStatus: "pending",
    modified: false,
    confidence:
      aiSuggestion?.confidence ??
      createFallbackConfidence(requirementInputs.length, objectWarnings.length),
    warnings: objectWarnings,
    sourceRequirementKeys: requirementInputs.map((requirement) => requirement.requirementKey),
    sourceRequirementIds: requirementInputs.map((requirement) => requirement.requirementId),
    sourceRowNumbers: requirementInputs.map(
      (requirement) => requirement.sourceRowNumber,
    ),
    fields,
  };

  fields.forEach((field) => {
    if (field.value.trim().length === 0) {
      return;
    }

    traceability.push({
      traceId: `${object.objectId}:${field.key}:${traceability.length + 1}`,
      requirementKey: primaryRequirement?.requirementKey ?? "template-default",
      requirementId: primaryRequirement?.requirementId ?? "template-default",
      sourceRowNumber: primaryRequirement?.sourceRowNumber ?? 0,
      objectId: object.objectId,
      objectType: object.objectType,
      objectName: object.name,
      fieldKey: field.key,
      fieldLabel: field.label,
      value: field.value,
      source: field.source,
      note: createTraceabilityNote(field),
    });
  });

  return object;
}

function applyFieldOverride(
  fieldMap: Map<string, MasterDataDraftField>,
  header: string,
  value: string,
  source: MasterDataDraftFieldSource,
) {
  const existingField = fieldMap.get(header);

  if (!existingField) {
    return;
  }

  fieldMap.set(header, {
    ...existingField,
    value,
    source,
    warning: null,
  });
}

function collectDefaultWarnings(fields: MasterDataDraftField[]) {
  return fields
    .filter(
      (field) =>
        field.source === "template" &&
        field.value.trim().length > 0 &&
        ["Type", "AreaType", "ResourceType", "ProductType", "Form"].includes(
          field.key,
        ),
    )
    .map(
      (field) =>
        `${field.label} is still using the template sample value and should be confirmed in review.`,
    );
}

function createFallbackConfidence(
  requirementCount: number,
  warningCount: number,
): MasterDataConfidence {
  if (warningCount === 0 && requirementCount >= 2) {
    return {
      level: "high",
      rationale:
        "Multiple selected requirements aligned cleanly with this object and only minimal defaults were needed.",
    };
  }

  if (warningCount <= 2) {
    return {
      level: "medium",
      rationale:
        "The object is grounded in the selected requirements but still uses template-backed defaults that should be checked before export.",
    };
  }

  return {
    level: "low",
    rationale:
      "This object relies on several template-derived values, so it should stay consultant-reviewed before package export.",
  };
}

function createAreaSeed(
  requirement: MasterDataGenerateRequestBody["requirements"][number],
) {
  return toTitle(
    requirement.l3Process ||
      requirement.l2Process ||
      requirement.operation ||
      requirement.requirementDescription.split(" ").slice(0, 2).join(" "),
  );
}

function createResourceSeed(
  requirement: MasterDataGenerateRequestBody["requirements"][number],
) {
  return toTitle(
    requirement.operation ||
      requirement.l3Process ||
      requirement.requirementDescription.split(" ").slice(0, 2).join(" "),
  );
}

function getFieldValue(fields: MasterDataDraftField[], key: string) {
  return fields.find((field) => field.key === key)?.value ?? "";
}

function createTraceabilityNote(field: MasterDataDraftField) {
  switch (field.source) {
    case "generated":
      return "Generated from the selected requirement slice and the current object context.";
    case "relationship":
      return "Resolved from hierarchy relationships between generated Master Data objects.";
    case "manual":
      return "Edited manually during consultant review.";
    case "template":
      return "Preserved from the provided MasterDataSample workbook as an import-safe default.";
    case "default":
      return "Added as a safe default because the selected requirement slice did not specify this field.";
    case "requirement":
      return "Taken directly from requirement wording.";
  }
}

function createLogEntry(
  stage: MasterDataGenerationLogEntry["stage"],
  status: MasterDataGenerationLogEntry["status"],
  message: string,
): MasterDataGenerationLogEntry {
  return {
    id: `${stage}:${status}:${message}`,
    stage,
    status,
    message,
  };
}

function flattenObjectCount(
  generatedObjects: Record<MasterDataObjectType, MasterDataDraftObject[]>,
) {
  return Object.values(generatedObjects).reduce(
    (total, entries) => total + entries.length,
    0,
  );
}

function dedupeStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toTitle(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`)
    .join(" ");
}
