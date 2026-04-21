import { assembleDemoScript } from "@/lib/requirements/demo-script";
import type { ParsedRequirement } from "@/lib/requirements/types";
import {
  buildReviewRequirements,
  summarizeReviewRequirements,
} from "@/lib/requirements/review";
import {
  parseRequirementsReviewState,
  CUSTOMER_X_REVIEW_STORAGE_KEY,
  type StorageLike,
} from "@/lib/requirements/review-storage";
import type { RequirementsSourceMetadata } from "@/lib/requirements/source";
import {
  getRequirementsWorkspaceStorageKey,
  createRequirementsWorkspaceState,
  loadRequirementsWorkspaceState,
  REQUIREMENTS_WORKSPACE_ACTIVE_SOURCE_STORAGE_KEY,
  type RequirementsWorkspaceState,
} from "@/lib/requirements/workspace-state";
import {
  getRecommendedWorkflowStep,
  type LegacyPhase1WorkflowStep,
  type Phase1WorkflowSnapshot,
  type Phase1WorkflowStep,
  resolveLegacyPhase1WorkflowStep,
} from "./workflow";

export const PHASE1_PROJECT_REGISTRY_STORAGE_KEY =
  "cm-mes-advisor:phase1-project-registry:v3";
export const LEGACY_PHASE1_PROJECT_REGISTRY_STORAGE_KEY =
  "cm-mes-advisor:phase1-project-registry:v2";
const EARLIER_PHASE1_PROJECT_REGISTRY_STORAGE_KEY =
  "cm-mes-advisor:phase1-project-registry:v1";

export interface Phase1ProjectRecord {
  version: 3;
  projectId: string;
  projectName: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  currentStep: Phase1WorkflowStep;
  workspaceState: RequirementsWorkspaceState;
  snapshot: Phase1ProjectSnapshot;
}

export interface Phase1ProjectSnapshot extends Phase1WorkflowSnapshot {
  sourceFilename: string;
  sourceKind: RequirementsSourceMetadata["sourceKind"];
  sourceLabel: string;
}

export interface Phase1ProjectRegistry {
  version: 3;
  activeProjectId: string | null;
  projects: Phase1ProjectRecord[];
}

interface ProjectIdentity {
  customerName: string;
  projectId: string;
  projectName: string;
}

export function createPhase1ProjectRegistry(
  projects: Phase1ProjectRecord[] = [],
  activeProjectId: string | null = projects[0]?.projectId ?? null,
): Phase1ProjectRegistry {
  return {
    version: 3,
    activeProjectId,
    projects: sortProjects(projects),
  };
}

export function loadPhase1ProjectRegistry(
  storage: StorageLike,
  fallbackWorkspaceState: RequirementsWorkspaceState,
): Phase1ProjectRegistry {
  try {
    const currentRawRegistry = storage.getItem(PHASE1_PROJECT_REGISTRY_STORAGE_KEY);

    if (currentRawRegistry) {
      return normalizeProjectRegistry(
        JSON.parse(currentRawRegistry),
        fallbackWorkspaceState,
      );
    }

    const legacyRawRegistry = storage.getItem(
      LEGACY_PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
    );

    if (legacyRawRegistry) {
      const normalized = normalizeProjectRegistry(
        JSON.parse(legacyRawRegistry),
        fallbackWorkspaceState,
      );

      if (normalized.projects.length > 0) {
        savePhase1ProjectRegistry(storage, normalized);
        return normalized;
      }
    }

    const earlierLegacyRawRegistry = storage.getItem(
      EARLIER_PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
    );

    if (earlierLegacyRawRegistry) {
      const normalized = normalizeProjectRegistry(
        JSON.parse(earlierLegacyRawRegistry),
        fallbackWorkspaceState,
      );

      if (normalized.projects.length > 0) {
        savePhase1ProjectRegistry(storage, normalized);
        return normalized;
      }
    }
  } catch {
    return createMigratedProjectRegistry(storage, fallbackWorkspaceState);
  }

  return hasPersistedWorkspaceState(storage, fallbackWorkspaceState)
    ? createMigratedProjectRegistry(storage, fallbackWorkspaceState)
    : createPhase1ProjectRegistry();
}

export function savePhase1ProjectRegistry(
  storage: StorageLike,
  registry: Phase1ProjectRegistry,
): void {
  try {
    storage.setItem(
      PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
      JSON.stringify({
        ...registry,
        projects: sortProjects(registry.projects),
      }),
    );
  } catch {
    // Local prototype persistence should not block the UI.
  }
}

export function getPhase1Project(
  registry: Phase1ProjectRegistry,
  projectId: string,
): Phase1ProjectRecord | null {
  return (
    registry.projects.find((project) => project.projectId === projectId) ?? null
  );
}

export function upsertPhase1Project(
  registry: Phase1ProjectRegistry,
  project: Phase1ProjectRecord,
): Phase1ProjectRegistry {
  const nextProjects = registry.projects.filter(
    (entry) => entry.projectId !== project.projectId,
  );

  nextProjects.push(project);

  return {
    version: 3,
    activeProjectId: project.projectId,
    projects: sortProjects(nextProjects),
  };
}

export function setActivePhase1Project(
  registry: Phase1ProjectRegistry,
  projectId: string,
): Phase1ProjectRegistry {
  return {
    ...registry,
    activeProjectId: projectId,
  };
}

export function createPhase1ProjectRecordFromWorkspaceState(
  workspaceState: RequirementsWorkspaceState,
  options?: {
    createdAt?: string;
    currentStep?: Phase1WorkflowStep;
    projectId?: string;
    updatedAt?: string;
  },
): Phase1ProjectRecord {
  const createdAt =
    options?.createdAt ?? workspaceState.source.uploadedAt ?? nowIso();
  const currentStep =
    options?.currentStep ??
    getRecommendedWorkflowStep(summarizePhase1Workspace(workspaceState, false));
  const snapshot = summarizePhase1Workspace(
    workspaceState,
    currentStep === "script" || currentStep === "export",
  );

  return {
    version: 3,
    projectId:
      options?.projectId ??
      createStablePhase1ProjectId(workspaceState.reviewState.project.projectId),
    projectName: workspaceState.reviewState.project.projectName,
    customerName: workspaceState.reviewState.project.customerName,
    createdAt,
    updatedAt: options?.updatedAt ?? nowIso(),
    currentStep,
    workspaceState,
    snapshot,
  };
}

export function updatePhase1ProjectRecord(
  project: Phase1ProjectRecord,
  workspaceState: RequirementsWorkspaceState,
  currentStep = project.currentStep,
): Phase1ProjectRecord {
  return createPhase1ProjectRecordFromWorkspaceState(workspaceState, {
    createdAt: project.createdAt,
    currentStep,
    projectId: project.projectId,
    updatedAt: nowIso(),
  });
}

export function touchPhase1ProjectStep(
  project: Phase1ProjectRecord,
  currentStep: Phase1WorkflowStep,
): Phase1ProjectRecord {
  return createPhase1ProjectRecordFromWorkspaceState(project.workspaceState, {
    createdAt: project.createdAt,
    currentStep,
    projectId: project.projectId,
    updatedAt: nowIso(),
  });
}

export function createSampleProject(
  registry: Phase1ProjectRegistry,
  fallbackWorkspaceState: RequirementsWorkspaceState,
): Phase1ProjectRecord {
  const identity = createSampleIdentity(registry.projects);
  const source: RequirementsSourceMetadata = {
    ...fallbackWorkspaceState.source,
    customerName: identity.customerName,
    projectName: identity.projectName,
  };
  const workspaceState = applyProjectIdentity(
    createRequirementsWorkspaceState(
      source,
      fallbackWorkspaceState.parsedRequirements,
    ),
    identity,
  );

  return createPhase1ProjectRecordFromWorkspaceState(workspaceState, {
    currentStep: "source",
    projectId: identity.projectId,
  });
}

export function createUploadedWorkspaceStateForProject(
  project: Phase1ProjectRecord,
  workspaceState: RequirementsWorkspaceState,
): RequirementsWorkspaceState {
  return applyProjectIdentity(workspaceState, {
    customerName: workspaceState.source.customerName,
    projectId: project.projectId,
    projectName: workspaceState.source.projectName,
  });
}

export function createFixtureWorkspaceStateForProject(
  project: Phase1ProjectRecord,
  fallbackWorkspaceState: RequirementsWorkspaceState,
): RequirementsWorkspaceState {
  const source: RequirementsSourceMetadata = {
    ...fallbackWorkspaceState.source,
    customerName: project.customerName,
    projectName: project.projectName,
  };

  return applyProjectIdentity(
    createRequirementsWorkspaceState(
      source,
      fallbackWorkspaceState.parsedRequirements,
    ),
    {
      customerName: project.customerName,
      projectId: project.projectId,
      projectName: project.projectName,
    },
  );
}

export function summarizePhase1Workspace(
  workspaceState: RequirementsWorkspaceState,
  scriptVisited: boolean,
): Phase1ProjectSnapshot {
  const reviewRequirements = buildReviewRequirements(
    workspaceState.parsedRequirements,
    workspaceState.reviewState.requirements,
  );
  const summary = summarizeReviewRequirements(reviewRequirements);
  const demoScriptAssembly = assembleDemoScript(
    reviewRequirements,
    workspaceState.reviewState.demoScriptDraft,
  );
  const generatedCount = reviewRequirements.filter(
    (requirement) =>
      requirement.generatedOutput.state === "mock-generated-draft",
  ).length;
  const generatedReviewableCount = reviewRequirements.filter(
    (requirement) =>
      requirement.generatedOutput.state === "mock-generated-draft" &&
      requirement.reviewStatus === "pending",
  ).length;

  return {
    sourceRowCount: reviewRequirements.length,
    demoCount: summary.demoCount,
    mvpCount: summary.mvpCount,
    generatedCount,
    generatedReviewableCount,
    approvedCount: summary.approvedCount,
    approvedStepCount: demoScriptAssembly.approvedStepCount,
    selectedCount: 0,
    scriptVisited,
    exportReady:
      !demoScriptAssembly.emptyState &&
      summary.approvedCount > 0 &&
      generatedReviewableCount === 0,
    sourceFilename: workspaceState.source.sourceFilename,
    sourceKind: workspaceState.source.sourceKind,
    sourceLabel: workspaceState.source.sourceLabel,
  };
}

export function applyProjectIdentity(
  workspaceState: RequirementsWorkspaceState,
  identity: ProjectIdentity,
): RequirementsWorkspaceState {
  return {
    ...workspaceState,
    source: {
      ...workspaceState.source,
      customerName: identity.customerName,
      projectName: identity.projectName,
    },
    reviewState: {
      ...workspaceState.reviewState,
      project: {
        ...workspaceState.reviewState.project,
        customerName: identity.customerName,
        projectId: identity.projectId,
        projectName: identity.projectName,
        sourceFilename: workspaceState.source.sourceFilename,
        sourceRowCount: workspaceState.parsedRequirements.length,
      },
    },
  };
}

function createMigratedProjectRegistry(
  storage: StorageLike,
  fallbackWorkspaceState: RequirementsWorkspaceState,
): Phase1ProjectRegistry {
  const workspaceState = loadRequirementsWorkspaceState(
    storage,
    fallbackWorkspaceState,
  );
  const project = createPhase1ProjectRecordFromWorkspaceState(workspaceState, {
    currentStep: getRecommendedWorkflowStep(
      summarizePhase1Workspace(workspaceState, false),
    ),
  });
  const registry = createPhase1ProjectRegistry([project], project.projectId);

  savePhase1ProjectRegistry(storage, registry);

  return registry;
}

function hasPersistedWorkspaceState(
  storage: StorageLike,
  fallbackWorkspaceState: RequirementsWorkspaceState,
): boolean {
  try {
    const activeSourceId = storage.getItem(
      REQUIREMENTS_WORKSPACE_ACTIVE_SOURCE_STORAGE_KEY,
    );

    if (
      typeof activeSourceId === "string" &&
      activeSourceId.trim().length > 0 &&
      storage.getItem(getRequirementsWorkspaceStorageKey(activeSourceId))
    ) {
      return true;
    }

    if (
      storage.getItem(
        getRequirementsWorkspaceStorageKey(fallbackWorkspaceState.source.sourceId),
      )
    ) {
      return true;
    }

    return storage.getItem(CUSTOMER_X_REVIEW_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function normalizeProjectRegistry(
  value: unknown,
  fallbackWorkspaceState: RequirementsWorkspaceState,
): Phase1ProjectRegistry {
  if (
    !isRecord(value) ||
    (value.version !== 1 && value.version !== 2 && value.version !== 3) ||
    !Array.isArray(value.projects)
  ) {
    return createPhase1ProjectRegistry();
  }

  const projects = value.projects
    .map((project) => normalizeProjectRecord(project, fallbackWorkspaceState))
    .filter((project): project is Phase1ProjectRecord => project !== null);

  const activeProjectId =
    typeof value.activeProjectId === "string" &&
    projects.some((project) => project.projectId === value.activeProjectId)
      ? value.activeProjectId
      : (projects[0]?.projectId ?? null);

  return createPhase1ProjectRegistry(projects, activeProjectId);
}

function normalizeProjectRecord(
  value: unknown,
  fallbackWorkspaceState: RequirementsWorkspaceState,
): Phase1ProjectRecord | null {
  if (
    !isRecord(value) ||
    (value.version !== 1 && value.version !== 2 && value.version !== 3)
  ) {
    return null;
  }

  const workspaceState = normalizeWorkspaceState(
    value.workspaceState,
    fallbackWorkspaceState,
  );

  if (!workspaceState) {
    return null;
  }

  const snapshotWithoutScriptVisit = summarizePhase1Workspace(
    workspaceState,
    false,
  );
  const normalizedSnapshot = normalizeWorkflowSnapshot(
    value.snapshot,
    snapshotWithoutScriptVisit,
  );
  const currentStep = normalizeWorkflowStep(
    value.currentStep,
    getRecommendedWorkflowStep(snapshotWithoutScriptVisit),
    normalizedSnapshot,
  );

  return createPhase1ProjectRecordFromWorkspaceState(workspaceState, {
    createdAt: typeof value.createdAt === "string" ? value.createdAt : nowIso(),
    currentStep,
    projectId:
      typeof value.projectId === "string" && value.projectId.length > 0
        ? value.projectId
        : createStablePhase1ProjectId(
            workspaceState.reviewState.project.projectId,
          ),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : nowIso(),
  });
}

function normalizeWorkflowStep(
  value: unknown,
  fallbackStep: Phase1WorkflowStep,
  snapshot: Phase1WorkflowSnapshot,
): Phase1WorkflowStep {
  if (isWorkflowStep(value)) {
    return value;
  }

  if (isLegacyWorkflowStep(value) || isMergedWorkflowStep(value)) {
    return resolveLegacyPhase1WorkflowStep(value, snapshot);
  }

  return fallbackStep;
}

function normalizeWorkspaceState(
  value: unknown,
  fallbackWorkspaceState: RequirementsWorkspaceState,
): RequirementsWorkspaceState | null {
  if (!isRecord(value) || !isRecord(value.source)) {
    return null;
  }

  const source = normalizeSourceMetadata(
    value.source,
    fallbackWorkspaceState.source,
  );
  const parsedRequirements = Array.isArray(value.parsedRequirements)
    ? value.parsedRequirements.filter(isParsedRequirement)
    : fallbackWorkspaceState.parsedRequirements;
  const normalized = createRequirementsWorkspaceState(
    source,
    parsedRequirements,
  );

  return {
    ...normalized,
    reviewState: parseRequirementsReviewState(
      isRecord(value.reviewState) ? JSON.stringify(value.reviewState) : null,
      normalized.reviewState,
    ),
  };
}

function normalizeWorkflowSnapshot(
  value: unknown,
  fallbackSnapshot: Phase1WorkflowSnapshot,
): Phase1WorkflowSnapshot {
  if (!isRecord(value)) {
    return fallbackSnapshot;
  }

  return {
    sourceRowCount:
      typeof value.sourceRowCount === "number"
        ? value.sourceRowCount
        : fallbackSnapshot.sourceRowCount,
    demoCount:
      typeof value.demoCount === "number"
        ? value.demoCount
        : fallbackSnapshot.demoCount,
    mvpCount:
      typeof value.mvpCount === "number"
        ? value.mvpCount
        : fallbackSnapshot.mvpCount,
    generatedCount:
      typeof value.generatedCount === "number"
        ? value.generatedCount
        : fallbackSnapshot.generatedCount,
    generatedReviewableCount:
      typeof value.generatedReviewableCount === "number"
        ? value.generatedReviewableCount
        : fallbackSnapshot.generatedReviewableCount,
    approvedCount:
      typeof value.approvedCount === "number"
        ? value.approvedCount
        : fallbackSnapshot.approvedCount,
    approvedStepCount:
      typeof value.approvedStepCount === "number"
        ? value.approvedStepCount
        : fallbackSnapshot.approvedStepCount,
    selectedCount:
      typeof value.selectedCount === "number"
        ? value.selectedCount
        : fallbackSnapshot.selectedCount,
    scriptVisited:
      typeof value.scriptVisited === "boolean"
        ? value.scriptVisited
        : fallbackSnapshot.scriptVisited,
    exportReady:
      typeof value.exportReady === "boolean"
        ? value.exportReady
        : fallbackSnapshot.exportReady,
  };
}

function createSampleIdentity(
  existingProjects: Phase1ProjectRecord[],
): ProjectIdentity {
  const baseProjectName = "Customer X Demo";
  const baseCustomerName = "Customer X";
  let suffix = 1;
  let projectName = baseProjectName;

  while (
    existingProjects.some(
      (project) =>
        project.projectName.toLowerCase() === projectName.toLowerCase(),
    )
  ) {
    suffix += 1;
    projectName = `${baseProjectName} ${suffix}`;
  }

  return {
    customerName:
      suffix === 1 ? baseCustomerName : `${baseCustomerName} ${suffix}`,
    projectId: createStablePhase1ProjectId(projectName),
    projectName,
  };
}

function createStablePhase1ProjectId(seed: string): string {
  const normalized = seed
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized) {
    return normalized;
  }

  return `phase1-project-${Math.random().toString(36).slice(2, 10)}`;
}

function sortProjects(projects: Phase1ProjectRecord[]): Phase1ProjectRecord[] {
  return [...projects].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeSourceMetadata(
  value: unknown,
  fallbackSource: RequirementsSourceMetadata,
): RequirementsSourceMetadata {
  if (!isRecord(value)) {
    return fallbackSource;
  }

  return {
    sourceId:
      typeof value.sourceId === "string" && value.sourceId.trim().length > 0
        ? value.sourceId
        : fallbackSource.sourceId,
    sourceKind: value.sourceKind === "upload" ? "upload" : "fixture",
    sourceLabel:
      typeof value.sourceLabel === "string" &&
      value.sourceLabel.trim().length > 0
        ? value.sourceLabel
        : fallbackSource.sourceLabel,
    sourceFilename:
      typeof value.sourceFilename === "string" &&
      value.sourceFilename.trim().length > 0
        ? value.sourceFilename
        : fallbackSource.sourceFilename,
    projectName:
      typeof value.projectName === "string" &&
      value.projectName.trim().length > 0
        ? value.projectName
        : fallbackSource.projectName,
    customerName:
      typeof value.customerName === "string" &&
      value.customerName.trim().length > 0
        ? value.customerName
        : fallbackSource.customerName,
    uploadedAt:
      typeof value.uploadedAt === "string" || value.uploadedAt === null
        ? value.uploadedAt
        : fallbackSource.uploadedAt,
  };
}

function isParsedRequirement(value: unknown): value is ParsedRequirement {
  return (
    isRecord(value) &&
    typeof value.sourceRowNumber === "number" &&
    typeof value.requirementId === "string" &&
    typeof value.requirementDescription === "string" &&
    typeof value.l2Process === "string" &&
    typeof value.l3Process === "string" &&
    typeof value.operation === "string" &&
    typeof value.demo === "boolean" &&
    typeof value.demoRaw === "string" &&
    typeof value.detailDescriptionAndMotivation === "string" &&
    typeof value.prioEms === "string" &&
    typeof value.prioCws === "string" &&
    typeof value.mvp === "boolean" &&
    typeof value.mvpRaw === "string" &&
    typeof value.availability === "string" &&
    typeof value.availabilityCm === "string" &&
    typeof value.descriptionAvailability === "string" &&
    typeof value.supportedPercent === "string" &&
    typeof value.sourceComment === "string"
  );
}

function isWorkflowStep(value: unknown): value is Phase1WorkflowStep {
  return (
    value === "source" ||
    value === "generate" ||
    value === "review" ||
    value === "script" ||
    value === "export"
  );
}

function isLegacyWorkflowStep(value: unknown): value is LegacyPhase1WorkflowStep {
  return (
    value === "source" ||
    value === "generate" ||
    value === "review" ||
    value === "script" ||
    value === "export"
  );
}

function isMergedWorkflowStep(
  value: unknown,
): value is Extract<LegacyPhase1WorkflowStep, "setup" | "handoff"> {
  return value === "setup" || value === "handoff";
}
