import type { MasterDataAnalyzeRequestBody } from "./api";
import {
  masterDataHierarchyObjectTypes,
  masterDataObjectTypes,
  type MasterDataApplicableRequirement,
  type MasterDataConfidence,
  type MasterDataObjectType,
} from "./types";

const objectTypeKeywordMap: Record<MasterDataObjectType, string[]> = {
  enterprise: ["enterprise", "global", "multi-site", "corporate"],
  site: ["site", "plant", "location", "warehouse"],
  facility: ["facility", "factory", "line", "plant"],
  area: ["area", "work center", "workcentre", "department", "manufacturing"],
  resource: [
    "resource",
    "machine",
    "equipment",
    "station",
    "operation",
    "packing",
    "packaging",
    "schedule",
    "scheduling",
    "check list",
  ],
  product: [
    "product",
    "recipe",
    "bom",
    "formulation",
    "setup",
    "variant",
    "catalog",
  ],
  material: [
    "material",
    "batch",
    "lot",
    "serial",
    "sn",
    "traceability",
    "trace",
    "inventory",
    "packing",
    "box",
    "content",
  ],
};

export function analyzeMasterDataApplicability(
  request: MasterDataAnalyzeRequestBody,
): {
  applicableRequirements: MasterDataApplicableRequirement[];
  suggestedObjectTypes: MasterDataObjectType[];
  warnings: string[];
} {
  const approvedKeys = new Set(request.approvedRequirementKeys);
  const approvedRequirements = request.requirements.filter((requirement) =>
    approvedKeys.has(requirement.requirementKey),
  );

  if (approvedRequirements.length === 0) {
    return {
      applicableRequirements: [],
      suggestedObjectTypes: [],
      warnings: [
        "Approve at least one Phase 1 row before starting Phase 2. Master Data setup only analyzes the approved consultant slice.",
      ],
    };
  }

  const applicableRequirements = approvedRequirements
    .map((requirement) => {
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

      const suggestedObjectTypes = masterDataObjectTypes.filter((objectType) =>
        objectTypeKeywordMap[objectType].some((keyword) => text.includes(keyword)),
      );

      if (suggestedObjectTypes.length === 0) {
        return null;
      }

      const confidence = createConfidence(suggestedObjectTypes.length, text);

      return {
        requirementKey: requirement.requirementKey,
        requirementId: requirement.requirementId,
        requirementDescription: requirement.requirementDescription,
        sourceRowNumber: requirement.sourceRowNumber,
        l2Process: requirement.l2Process,
        l3Process: requirement.l3Process,
        operation: requirement.operation,
        reviewStatus: requirement.reviewStatus,
        consultantComment: requirement.consultantComment,
        reviewNote: requirement.reviewNote,
        suggestedObjectTypes,
        preselected: approvedKeys.has(requirement.requirementKey),
        confidence,
        reason: createReason(suggestedObjectTypes, text),
      } satisfies MasterDataApplicableRequirement;
    })
    .filter(
      (requirement): requirement is MasterDataApplicableRequirement =>
        requirement !== null,
    )
    .sort((left, right) => {
      if (left.preselected !== right.preselected) {
        return left.preselected ? -1 : 1;
      }

      return left.sourceRowNumber - right.sourceRowNumber;
    });

  const suggestedObjectTypes = Array.from(
    new Set(
      applicableRequirements.flatMap((requirement) => requirement.suggestedObjectTypes),
    ),
  ).sort(
    (left, right) =>
      masterDataObjectTypes.indexOf(left) - masterDataObjectTypes.indexOf(right),
  );

  const warnings =
    applicableRequirements.length === 0
      ? [
          "No obvious Master Data rows were detected inside the approved Phase 1 slice. Review the approved rows or widen the Phase 1 approvals before generating objects.",
        ]
      : suggestedObjectTypes.every((objectType) =>
            masterDataHierarchyObjectTypes.includes(objectType),
          )
        ? [
            "The current slice leans toward hierarchy objects. Product and Material can still be added manually if the demo needs them.",
          ]
        : [];

  return {
    applicableRequirements,
    suggestedObjectTypes,
    warnings,
  };
}

function createConfidence(
  suggestionCount: number,
  text: string,
): MasterDataConfidence {
  if (suggestionCount >= 3) {
    return {
      level: "high",
      rationale:
        "Multiple Master Data object types matched the requirement language, so the row is likely relevant for Phase 2.",
    };
  }

  if (
    suggestionCount === 2 ||
    text.includes("traceability") ||
    text.includes("scheduling")
  ) {
    return {
      level: "medium",
      rationale:
        "The row contains clear Master Data cues, but the final object mix should still be reviewed by a consultant.",
    };
  }

  return {
    level: "low",
    rationale:
      "Only one weaker Master Data cue matched, so this row should stay consultant-reviewed before export.",
  };
}

function createReason(
  suggestedObjectTypes: MasterDataObjectType[],
  text: string,
): string {
  const matchedSignals = suggestedObjectTypes
    .flatMap((objectType) => objectTypeKeywordMap[objectType])
    .filter((keyword, index, values) => {
      return text.includes(keyword) && values.indexOf(keyword) === index;
    })
    .slice(0, 4);

  return matchedSignals.length > 0
    ? `Matched Master Data cues: ${matchedSignals.join(", ")}.`
    : "The requirement language overlaps with the selected Master Data object types.";
}
