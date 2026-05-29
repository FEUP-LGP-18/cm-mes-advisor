import type { MasterDataObjectType } from "@/lib/master-data/types";

export const industryTemplateIds = [
  "electronics",
  "automotive",
  "medical",
  "food",
  "aerospace",
  "generic",
] as const;

export type IndustryTemplateId = (typeof industryTemplateIds)[number];

export interface IndustryTemplateDefaults {
  processGuidance: string[];
  requirementFocus: string[];
  phase2ObjectTypeHints?: MasterDataObjectType[];
}

export interface IndustryTemplateDefinition {
  id: IndustryTemplateId;
  label: string;
  description: string;
  defaults: IndustryTemplateDefaults;
}

export const industryTemplateDefinitions: IndustryTemplateDefinition[] = [
  {
    id: "electronics",
    label: "Electronics / Semiconductors",
    description: "PCB assembly, SMT lines, wafer fabrication, and test.",
    defaults: {
      processGuidance: ["SMT line", "inspection", "traceability"],
      requirementFocus: [
        "component genealogy",
        "quality checkpoints",
        "equipment integration",
      ],
      phase2ObjectTypeHints: ["resource", "material"],
    },
  },
  {
    id: "automotive",
    label: "Automotive",
    description: "Body shop, paint shop, sequencing, and final assembly.",
    defaults: {
      processGuidance: ["assembly sequence", "quality hold", "traceability"],
      requirementFocus: [
        "serialised production",
        "non-conformance handling",
        "line-side execution",
      ],
      phase2ObjectTypeHints: ["product", "resource", "material"],
    },
  },
  {
    id: "medical",
    label: "Medical Devices",
    description: "Regulated device assembly, cleanroom, and UDI workflows.",
    defaults: {
      processGuidance: ["device history", "quality release", "UDI"],
      requirementFocus: [
        "audit trail",
        "controlled execution",
        "regulated traceability",
      ],
      phase2ObjectTypeHints: ["product", "material"],
    },
  },
  {
    id: "food",
    label: "Food & Beverage",
    description: "Batch processing, allergen control, and lot genealogy.",
    defaults: {
      processGuidance: ["batch execution", "quality sampling", "genealogy"],
      requirementFocus: [
        "lot traceability",
        "recipe/process control",
        "quality checkpoints",
      ],
      phase2ObjectTypeHints: ["material", "resource"],
    },
  },
  {
    id: "aerospace",
    label: "Aerospace & Defence",
    description: "AS9100-style serialisation, inspections, and NCR flows.",
    defaults: {
      processGuidance: ["inspection", "configuration control", "NCR"],
      requirementFocus: [
        "serialised part history",
        "first article evidence",
        "supplier traceability",
      ],
      phase2ObjectTypeHints: ["product", "resource", "material"],
    },
  },
  {
    id: "generic",
    label: "Generic / Custom",
    description: "A neutral baseline for manufacturing contexts.",
    defaults: {
      processGuidance: ["production order", "work order", "quality check"],
      requirementFocus: [
        "core MES execution",
        "reviewable requirements",
        "traceable demo scope",
      ],
      phase2ObjectTypeHints: ["product", "resource", "material"],
    },
  },
];

const templateAliases: Record<string, IndustryTemplateId> = {
  "aerospace-defence": "aerospace",
  "aerospace-defense": "aerospace",
  "food-beverage": "food",
  "medical-devices": "medical",
  "electronics-semiconductors": "electronics",
};

export function isIndustryTemplateId(
  value: unknown,
): value is IndustryTemplateId {
  return (
    typeof value === "string" &&
    industryTemplateIds.includes(value as IndustryTemplateId)
  );
}

export function normalizeIndustryTemplateId(
  value: unknown,
): IndustryTemplateId | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (isIndustryTemplateId(normalized)) {
    return normalized;
  }

  return templateAliases[normalized] ?? null;
}

export function getIndustryTemplateDefinition(
  value: unknown,
): IndustryTemplateDefinition | null {
  const templateId = normalizeIndustryTemplateId(value);
  return (
    industryTemplateDefinitions.find((template) => template.id === templateId) ??
    null
  );
}
