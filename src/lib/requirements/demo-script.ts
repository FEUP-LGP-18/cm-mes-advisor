import type {
  GeneratedDemoStepReviewStatus,
  GeneratedRequirementDraft,
  RequirementGenerationConfidence,
  RequirementGenerationSourceReference,
} from "./generation";

export type DemoScriptAssemblyEmptyState =
  | "no-generated-drafts"
  | "no-approved-drafts"
  | "no-demo-steps";

export interface DemoScriptDraft {
  version: 1;
  title: string;
  sectionOrder: string[];
  sectionEdits: Record<string, DemoScriptSectionEdit>;
  stepEdits: Record<string, DemoScriptStepEdit>;
}

export interface DemoScriptSectionEdit {
  title: string;
}

export interface DemoScriptStepEdit {
  title: string;
  note: string;
}

export interface DemoScriptSourceGeneratedOutput {
  hasGeneratedOutput: boolean;
  generatedCommentDraft: string | null;
  demoStepsDraft: string[];
  draft?: GeneratedRequirementDraft;
}

export interface DemoScriptSourceRequirement {
  requirementKey: string;
  requirementId: string;
  sourceRowNumber: number;
  l2Process: string;
  l3Process: string;
  operation: string;
  reviewStatus: string;
  consultantComment: string;
  reviewNote: string;
  generatedOutput: DemoScriptSourceGeneratedOutput;
}

export interface DemoScriptAssembly {
  title: string;
  emptyState: DemoScriptAssemblyEmptyState | null;
  approvedRequirementCount: number;
  approvedStepCount: number;
  generatedRequirementCount: number;
  sections: DemoScriptSection[];
}

export interface DemoScriptSection {
  key: string;
  title: string;
  sourceLabel: DemoScriptGroupingDimension;
  subtitle: string;
  stepCount: number;
  requirementCount: number;
  steps: DemoScriptStep[];
}

export interface DemoScriptStep {
  key: string;
  sectionKey: string;
  title: string;
  sourceTitle: string;
  note: string;
  groupLabel: string;
  generatedComment: string;
  currentComment: string;
  instructions: string[];
  confidence: RequirementGenerationConfidence;
  assumptions: string[];
  warnings: string[];
  sourceReferences: RequirementGenerationSourceReference[];
  sourceDemoStep: DemoScriptSourceDemoStep;
  traceability: DemoScriptStepTraceability;
}

export interface DemoScriptSourceDemoStep {
  id: string;
  title: string;
  mesModuleOrScreen: string;
  reviewStatus: GeneratedDemoStepReviewStatus;
  relatedRequirementIds: string[];
  instructions: string[];
  sourceReferences: RequirementGenerationSourceReference[];
}

export interface DemoScriptStepTraceability {
  requirementKey: string;
  requirementId: string;
  sourceRowNumber: number;
  sourceDemoStepId: string;
}

export type DemoScriptGroupingDimension =
  | "L2 process"
  | "L3 process"
  | "Operation"
  | "MES module/screen"
  | "General";

export type DemoScriptDraftAction =
  | { type: "renameTitle"; title: string }
  | { type: "setSectionOrder"; sectionOrder: string[] }
  | { type: "editSectionTitle"; sectionKey: string; title: string }
  | { type: "editStep"; stepKey: string; title: string; note: string };

export function createDefaultDemoScriptDraft(
  projectName: string,
): DemoScriptDraft {
  const normalizedProjectName = normalizeString(projectName, "Phase 1");
  const titleBase =
    normalizedProjectName.replace(/\s+demo$/i, "").trim() ||
    normalizedProjectName;

  return {
    version: 1,
    title: `${titleBase} Demo Script`,
    sectionOrder: [],
    sectionEdits: {},
    stepEdits: {},
  };
}

export function normalizeDemoScriptDraft(
  value: unknown,
  fallbackDraft: DemoScriptDraft,
): DemoScriptDraft {
  if (!isRecord(value) || value.version !== 1) {
    return fallbackDraft;
  }

  return {
    version: 1,
    title: normalizeString(value.title, fallbackDraft.title),
    sectionOrder: normalizeStringArray(value.sectionOrder),
    sectionEdits: normalizeSectionEdits(value.sectionEdits),
    stepEdits: normalizeStepEdits(value.stepEdits),
  };
}

export function updateDemoScriptDraft(
  draft: DemoScriptDraft,
  action: DemoScriptDraftAction,
): DemoScriptDraft {
  switch (action.type) {
    case "renameTitle":
      return {
        ...draft,
        title: normalizeString(action.title, draft.title),
      };
    case "setSectionOrder":
      return {
        ...draft,
        sectionOrder: normalizeStringArray(action.sectionOrder),
      };
    case "editSectionTitle": {
      const title = normalizeString(action.title, "");

      return {
        ...draft,
        sectionEdits: {
          ...draft.sectionEdits,
          [action.sectionKey]: {
            title,
          },
        },
      };
    }
    case "editStep": {
      const title = normalizeString(action.title, "");
      const note = normalizeString(action.note, "");

      return {
        ...draft,
        stepEdits: {
          ...draft.stepEdits,
          [action.stepKey]: {
            title,
            note,
          },
        },
      };
    }
  }
}

export function assembleDemoScript(
  requirements: DemoScriptSourceRequirement[],
  draft: DemoScriptDraft,
): DemoScriptAssembly {
  const approvedRequirements = requirements
    .filter((requirement) => isApprovedRequirementWithDraft(requirement))
    .sort((left, right) => {
      if (left.sourceRowNumber !== right.sourceRowNumber) {
        return left.sourceRowNumber - right.sourceRowNumber;
      }

      return left.requirementKey.localeCompare(right.requirementKey);
    });
  const generatedRequirementCount = requirements.filter(
    (requirement) => requirement.generatedOutput.hasGeneratedOutput,
  ).length;
  const approvedRequirementCount = approvedRequirements.length;
  const approvedStepCount = approvedRequirements.reduce(
    (count, requirement) =>
      count + requirement.generatedOutput.draft.demoSteps.length,
    0,
  );
  const emptyState = getDemoScriptEmptyState({
    generatedRequirementCount,
    approvedRequirementCount,
    approvedStepCount,
  });
  const title = normalizeString(draft.title, "Phase 1 Demo Script");

  if (emptyState) {
    return {
      title,
      emptyState,
      approvedRequirementCount,
      approvedStepCount,
      generatedRequirementCount,
      sections: [],
    };
  }

  const groupedSections = groupApprovedRequirements(
    approvedRequirements,
    draft,
  );
  const orderedSectionKeys = resolveSectionOrder(
    draft.sectionOrder,
    groupedSections.map((section) => section.key),
  );
  const sectionsByKey = new Map(
    groupedSections.map((section) => [section.key, section]),
  );

  return {
    title,
    emptyState: null,
    approvedRequirementCount,
    approvedStepCount,
    generatedRequirementCount,
    sections: orderedSectionKeys
      .map((sectionKey) => sectionsByKey.get(sectionKey))
      .filter((section): section is DemoScriptSection => section !== undefined),
  };
}

function groupApprovedRequirements(
  requirements: Array<
    DemoScriptSourceRequirement & {
      generatedOutput: DemoScriptSourceGeneratedOutput & {
        draft: GeneratedRequirementDraft;
      };
    }
  >,
  draft: DemoScriptDraft,
): DemoScriptSection[] {
  const sectionMap = new Map<string, DemoScriptSection>();

  for (const requirement of requirements) {
    const sectionInfo = resolveSectionInfo(requirement);
    const section =
      sectionMap.get(sectionInfo.key) ??
      createDemoScriptSection(sectionInfo, draft);

    const requirementSteps = requirement.generatedOutput.draft.demoSteps;

    requirementSteps.forEach((demoStep) => {
      const stepEdit =
        draft.stepEdits[createDemoScriptStepKey(requirement, demoStep.id)];
      const sourceTitle = demoStep.title;
      const step: DemoScriptStep = {
        key: createDemoScriptStepKey(requirement, demoStep.id),
        sectionKey: section.key,
        title: normalizeString(stepEdit?.title, sourceTitle),
        sourceTitle,
        note: normalizeString(stepEdit?.note, ""),
        groupLabel: createGroupLabel(requirement, demoStep.mesModuleOrScreen),
        generatedComment: requirement.generatedOutput.draft.generatedComment,
        currentComment: normalizeString(
          requirement.consultantComment,
          requirement.generatedOutput.draft.generatedComment,
        ),
        instructions: demoStep.instructions.length
          ? demoStep.instructions
          : [sourceTitle],
        confidence: requirement.generatedOutput.draft.confidence,
        assumptions: requirement.generatedOutput.draft.assumptions,
        warnings: requirement.generatedOutput.draft.warnings,
        sourceReferences: mergeSourceReferences(
          requirement.generatedOutput.draft.sourceReferences,
          demoStep.sourceReferences,
        ),
        sourceDemoStep: {
          id: demoStep.id,
          title: demoStep.title,
          mesModuleOrScreen: demoStep.mesModuleOrScreen,
          reviewStatus: demoStep.reviewStatus,
          relatedRequirementIds: demoStep.relatedRequirementIds,
          instructions: demoStep.instructions,
          sourceReferences: demoStep.sourceReferences,
        },
        traceability: {
          requirementKey: requirement.requirementKey,
          requirementId: requirement.requirementId,
          sourceRowNumber: requirement.sourceRowNumber,
          sourceDemoStepId: demoStep.id,
        },
      };

      section.steps.push(step);
    });

    section.stepCount += requirementSteps.length;
    section.requirementCount += 1;
    section.subtitle = createSectionSubtitle(section);
    sectionMap.set(section.key, section);
  }

  return Array.from(sectionMap.values());
}

function createDemoScriptSection(
  sectionInfo: DemoScriptSectionInfo,
  draft: DemoScriptDraft,
): DemoScriptSection {
  const sectionTitle = normalizeString(
    draft.sectionEdits[sectionInfo.key]?.title,
    sectionInfo.title,
  );

  return {
    key: sectionInfo.key,
    title: sectionTitle,
    sourceLabel: sectionInfo.sourceLabel,
    subtitle: "",
    stepCount: 0,
    requirementCount: 0,
    steps: [],
  };
}

function createSectionSubtitle(section: DemoScriptSection): string {
  const requirementLabel =
    section.requirementCount === 1 ? "requirement" : "requirements";
  const stepLabel = section.stepCount === 1 ? "step" : "steps";

  return `${section.requirementCount} approved ${requirementLabel} · ${section.stepCount} ${stepLabel}`;
}

function resolveSectionInfo(
  requirement: DemoScriptSourceRequirement & {
    generatedOutput: DemoScriptSourceGeneratedOutput & {
      draft: GeneratedRequirementDraft;
    };
  },
): DemoScriptSectionInfo {
  const l2Process = requirement.l2Process.trim();
  const l3Process = requirement.l3Process.trim();
  const operation = requirement.operation.trim();
  const firstStep = requirement.generatedOutput.draft.demoSteps[0];
  const mesModuleOrScreen = firstStep?.mesModuleOrScreen.trim() ?? "";

  if (l2Process.length > 0) {
    return {
      key: createSectionKey("l2", l2Process),
      title: l2Process,
      sourceLabel: "L2 process",
    };
  }

  if (l3Process.length > 0) {
    return {
      key: createSectionKey("l3", l3Process),
      title: l3Process,
      sourceLabel: "L3 process",
    };
  }

  if (operation.length > 0) {
    return {
      key: createSectionKey("operation", operation),
      title: operation,
      sourceLabel: "Operation",
    };
  }

  if (mesModuleOrScreen.length > 0) {
    return {
      key: createSectionKey("screen", mesModuleOrScreen),
      title: mesModuleOrScreen,
      sourceLabel: "MES module/screen",
    };
  }

  return {
    key: createSectionKey("general", requirement.requirementKey),
    title: "General MES flow",
    sourceLabel: "General",
  };
}

function resolveSectionOrder(
  persistedOrder: string[],
  sectionKeys: string[],
): string[] {
  const uniqueSectionKeys = Array.from(new Set(sectionKeys));
  const existingKeys = persistedOrder.filter((key) =>
    uniqueSectionKeys.includes(key),
  );
  const missingKeys = uniqueSectionKeys.filter(
    (key) => !existingKeys.includes(key),
  );

  return [...existingKeys, ...missingKeys];
}

function createDemoScriptStepKey(
  requirement: DemoScriptSourceRequirement,
  demoStepId: string,
): string {
  return `${requirement.requirementKey}:${demoStepId}`;
}

function createSectionKey(
  dimension: "l2" | "l3" | "operation" | "screen" | "general",
  value: string,
): string {
  return `${dimension}:${normalizeKeyValue(value)}`;
}

function createGroupLabel(
  requirement: DemoScriptSourceRequirement,
  mesModuleOrScreen: string,
): string {
  const values = [
    labelValue("L3", requirement.l3Process),
    labelValue("Operation", requirement.operation),
    labelValue("MES module/screen", mesModuleOrScreen),
  ].filter(Boolean);

  return values.length > 0 ? values.join(" · ") : "MES step";
}

function labelValue(label: string, value: string): string {
  const normalized = value.trim();
  return normalized.length > 0 ? `${label}: ${normalized}` : "";
}

function getDemoScriptEmptyState(summary: {
  generatedRequirementCount: number;
  approvedRequirementCount: number;
  approvedStepCount: number;
}): DemoScriptAssemblyEmptyState | null {
  if (summary.generatedRequirementCount === 0) {
    return "no-generated-drafts";
  }

  if (summary.approvedRequirementCount === 0) {
    return "no-approved-drafts";
  }

  if (summary.approvedStepCount === 0) {
    return "no-demo-steps";
  }

  return null;
}

function mergeSourceReferences(
  draftReferences: RequirementGenerationSourceReference[],
  stepReferences: RequirementGenerationSourceReference[],
): RequirementGenerationSourceReference[] {
  const merged = [...draftReferences, ...stepReferences];
  const referenceMap = new Map<string, RequirementGenerationSourceReference>();

  for (const reference of merged) {
    if (!referenceMap.has(reference.id)) {
      referenceMap.set(reference.id, reference);
    }
  }

  return Array.from(referenceMap.values());
}

function normalizeString(value: unknown, fallback: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedValues = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);

  return Array.from(new Set(normalizedValues));
}

function normalizeSectionEdits(
  value: unknown,
): Record<string, DemoScriptSectionEdit> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [key, normalizeSectionEdit(entry)])
      .filter(
        (entry): entry is [string, DemoScriptSectionEdit] => entry[1] !== null,
      ),
  );
}

function normalizeSectionEdit(value: unknown): DemoScriptSectionEdit | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    title: normalizeString(value.title, ""),
  };
}

function normalizeStepEdits(
  value: unknown,
): Record<string, DemoScriptStepEdit> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [key, normalizeStepEdit(entry)])
      .filter(
        (entry): entry is [string, DemoScriptStepEdit] => entry[1] !== null,
      ),
  );
}

function normalizeStepEdit(value: unknown): DemoScriptStepEdit | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    title: normalizeString(value.title, ""),
    note: normalizeString(value.note, ""),
  };
}

function normalizeKeyValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function isApprovedRequirementWithDraft(
  requirement: DemoScriptSourceRequirement,
): requirement is DemoScriptSourceRequirement & {
  generatedOutput: DemoScriptSourceGeneratedOutput & {
    draft: GeneratedRequirementDraft;
  };
} {
  return (
    requirement.reviewStatus === "approved" &&
    requirement.generatedOutput.hasGeneratedOutput === true &&
    isGeneratedDraftLike(requirement.generatedOutput.draft)
  );
}

function isGeneratedDraftLike(
  value: unknown,
): value is GeneratedRequirementDraft {
  return (
    isRecord(value) &&
    typeof value.generatedComment === "string" &&
    Array.isArray(value.demoSteps) &&
    Array.isArray(value.assumptions) &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.sourceReferences)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

interface DemoScriptSectionInfo {
  key: string;
  title: string;
  sourceLabel: DemoScriptGroupingDimension;
}
