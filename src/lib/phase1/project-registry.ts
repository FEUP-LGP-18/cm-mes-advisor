import { assembleDemoScript } from "@/lib/requirements/demo-script";
import type { ParsedRequirement } from "@/lib/requirements/types";
import {
  buildReviewRequirements,
  createRequirementsReviewState,
  summarizeReviewRequirements,
} from "@/lib/requirements/review";
import {
  parseRequirementsReviewState,
  CUSTOMER_X_REVIEW_STORAGE_KEY,
  type StorageLike,
} from "@/lib/requirements/review-storage";
import type { RequirementsSourceMetadata } from "@/lib/requirements/source";
import {
  normalizeIndustryTemplateId,
  type IndustryTemplateId,
} from "@/lib/settings";
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
import {
  createInitialMasterDataPhase2State,
  summarizeMasterDataObjects,
  type MasterDataPhase2State,
  type MasterDataWorkflowStep,
} from "@/lib/master-data/types";

export const PHASE1_PROJECT_REGISTRY_STORAGE_KEY =
  "cm-mes-advisor:phase1-project-registry:v4";
export const LEGACY_PHASE1_PROJECT_REGISTRY_STORAGE_KEY =
  "cm-mes-advisor:phase1-project-registry:v3";
const EARLIER_LEGACY_PHASE1_PROJECT_REGISTRY_STORAGE_KEY =
  "cm-mes-advisor:phase1-project-registry:v2";
const EARLIEST_PHASE1_PROJECT_REGISTRY_STORAGE_KEY =
  "cm-mes-advisor:phase1-project-registry:v1";

export interface Phase1ProjectRecord {
  version: 4;
  projectId: string;
  projectName: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  activeFlow: "phase1" | "master-data";
  currentStep: Phase1WorkflowStep;
  phase2: MasterDataPhase2State;
  workspaceState: RequirementsWorkspaceState;
  snapshot: Phase1ProjectSnapshot;
}

export interface Phase1ProjectSnapshot extends Phase1WorkflowSnapshot {
  sourceFilename: string;
  sourceKind: RequirementsSourceMetadata["sourceKind"];
  sourceLabel: string;
  phase2Active: boolean;
  phase2ApprovedCount: number;
  phase2CurrentStep: MasterDataWorkflowStep | null;
  phase2ExportReady: boolean;
  phase2NeedsReviewCount: number;
  phase2ObjectCount: number;
}

export interface Phase1ProjectRegistry {
  version: 4;
  activeProjectId: string | null;
  projects: Phase1ProjectRecord[];
}

interface ProjectIdentity {
  customerName: string;
  projectId: string;
  projectName: string;
}

interface ServerProjectIdentity {
  createdAt: string;
  customerName: string | null;
  projectId: string;
  projectName: string;
  updatedAt: string;
}

export function createPhase1ProjectRegistry(
  projects: Phase1ProjectRecord[] = [],
  activeProjectId: string | null = projects[0]?.projectId ?? null,
): Phase1ProjectRegistry {
  return {
    version: 4,
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
      EARLIER_LEGACY_PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
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

    const earliestLegacyRawRegistry = storage.getItem(
      EARLIEST_PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
    );

    if (earliestLegacyRawRegistry) {
      const normalized = normalizeProjectRegistry(
        JSON.parse(earliestLegacyRawRegistry),
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
    version: 4,
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

export function ensureLocalProjectForRoute(
  registry: Phase1ProjectRegistry,
  fallbackWorkspaceState: RequirementsWorkspaceState,
  projectId: string,
): Phase1ProjectRegistry {
  const existingProject = getPhase1Project(registry, projectId);

  if (existingProject) {
    return registry.activeProjectId === projectId
      ? registry
      : setActivePhase1Project(registry, projectId);
  }

  const fallbackProject = fallbackWorkspaceState.reviewState.project;
  const workspaceState = applyProjectIdentity(fallbackWorkspaceState, {
    customerName:
      fallbackProject.customerName || fallbackWorkspaceState.source.customerName,
    projectId,
    projectName:
      fallbackProject.projectName || fallbackWorkspaceState.source.projectName,
  });
  const project = createPhase1ProjectRecordFromWorkspaceState(workspaceState, {
    currentStep: "source",
    projectId,
  });

  return upsertPhase1Project(registry, project);
}

export function createPhase1ProjectRecordFromWorkspaceState(
  workspaceState: RequirementsWorkspaceState,
  options?: {
    activeFlow?: Phase1ProjectRecord["activeFlow"];
    createdAt?: string;
    currentStep?: Phase1WorkflowStep;
    phase2?: MasterDataPhase2State;
    projectId?: string;
    updatedAt?: string;
  },
): Phase1ProjectRecord {
  const createdAt =
    options?.createdAt ?? workspaceState.source.uploadedAt ?? nowIso();
  const currentStep =
    options?.currentStep ??
    getRecommendedWorkflowStep(summarizePhase1Workspace(workspaceState, false));
  const phase2 = options?.phase2 ?? createInitialMasterDataPhase2State();
  const snapshot = summarizePhase1Workspace(
    workspaceState,
    currentStep === "script" || currentStep === "export",
    phase2,
  );

  return {
    version: 4,
    activeFlow: options?.activeFlow ?? "phase1",
    projectId:
      options?.projectId ??
      createStablePhase1ProjectId(workspaceState.reviewState.project.projectId),
    projectName: workspaceState.reviewState.project.projectName,
    customerName: workspaceState.reviewState.project.customerName,
    createdAt,
    updatedAt: options?.updatedAt ?? nowIso(),
    currentStep,
    phase2,
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
    activeFlow: project.activeFlow,
    createdAt: project.createdAt,
    currentStep,
    phase2: project.phase2,
    projectId: project.projectId,
    updatedAt: nowIso(),
  });
}

export function touchPhase1ProjectStep(
  project: Phase1ProjectRecord,
  currentStep: Phase1WorkflowStep,
): Phase1ProjectRecord {
  return createPhase1ProjectRecordFromWorkspaceState(project.workspaceState, {
    activeFlow: "phase1",
    createdAt: project.createdAt,
    currentStep,
    phase2: project.phase2,
    projectId: project.projectId,
    updatedAt: nowIso(),
  });
}

export function touchMasterDataProjectStep(
  project: Phase1ProjectRecord,
  currentStep: MasterDataWorkflowStep,
): Phase1ProjectRecord {
  return createPhase1ProjectRecordFromWorkspaceState(project.workspaceState, {
    activeFlow: "master-data",
    createdAt: project.createdAt,
    currentStep: project.currentStep,
    phase2: {
      ...project.phase2,
      active: true,
      currentStep,
    },
    projectId: project.projectId,
    updatedAt: nowIso(),
  });
}

export function updateMasterDataPhase2State(
  project: Phase1ProjectRecord,
  updater:
    | MasterDataPhase2State
    | ((currentState: MasterDataPhase2State) => MasterDataPhase2State),
): Phase1ProjectRecord {
  const nextPhase2 =
    typeof updater === "function" ? updater(project.phase2) : updater;

  return createPhase1ProjectRecordFromWorkspaceState(project.workspaceState, {
    activeFlow: nextPhase2.active ? "master-data" : project.activeFlow,
    createdAt: project.createdAt,
    currentStep: project.currentStep,
    phase2: nextPhase2,
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

export function createEmptyProjectFromServerIdentity(
  identity: ServerProjectIdentity,
  options: {
    industryTemplateId?: IndustryTemplateId | null;
  } = {},
): Phase1ProjectRecord {
  const customerName = identity.customerName?.trim() || "No customer set";
  const source: RequirementsSourceMetadata = {
    customerName,
    industryTemplateId: options.industryTemplateId ?? null,
    projectName: identity.projectName,
    sourceFilename: "No workbook selected yet",
    sourceId: `empty:${identity.projectId}`,
    sourceKind: "upload",
    sourceLabel: "No workbook selected",
    uploadedAt: null,
  };
  const workspaceState = createRequirementsWorkspaceState(source, []);

  return createPhase1ProjectRecordFromWorkspaceState(workspaceState, {
    createdAt: identity.createdAt,
    currentStep: "source",
    projectId: identity.projectId,
    updatedAt: identity.updatedAt,
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

export function applyProjectIndustryTemplate(
  workspaceState: RequirementsWorkspaceState,
  industryTemplateId: IndustryTemplateId | null,
): RequirementsWorkspaceState {
  return {
    ...workspaceState,
    source: {
      ...workspaceState.source,
      industryTemplateId,
    },
  };
}

export function createFixtureWorkspaceStateForProject(
  project: Phase1ProjectRecord,
  fallbackWorkspaceState: RequirementsWorkspaceState,
): RequirementsWorkspaceState {
  const source: RequirementsSourceMetadata = {
    ...fallbackWorkspaceState.source,
    customerName: project.customerName,
    industryTemplateId: project.workspaceState.source.industryTemplateId,
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
  phase2: MasterDataPhase2State = createInitialMasterDataPhase2State(),
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
  const masterDataSummary = summarizeMasterDataObjects(phase2.generatedObjects);

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
    phase2Active: phase2.active,
    phase2ApprovedCount: masterDataSummary.approvedCount,
    phase2CurrentStep: phase2.active ? phase2.currentStep : null,
    phase2ExportReady:
      masterDataSummary.objectCount > 0 &&
      masterDataSummary.needsReviewCount === 0,
    phase2NeedsReviewCount: masterDataSummary.needsReviewCount,
    phase2ObjectCount: masterDataSummary.objectCount,
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
    (value.version !== 1 &&
      value.version !== 2 &&
      value.version !== 3 &&
      value.version !== 4) ||
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
    (value.version !== 1 &&
      value.version !== 2 &&
      value.version !== 3 &&
      value.version !== 4)
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
  const phase2 = normalizePhase2State(value.phase2);
  const activeFlow =
    value.activeFlow === "master-data" && phase2.active ? "master-data" : "phase1";

  return createPhase1ProjectRecordFromWorkspaceState(workspaceState, {
    activeFlow,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : nowIso(),
    currentStep,
    phase2,
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
    createRequirementsReviewState(
      normalizeReviewProjectMetadata(
        value.reviewState,
        source,
        parsedRequirements.length,
      ),
    ),
  );

  return {
    ...normalized,
    reviewState: parseRequirementsReviewState(
      isRecord(value.reviewState) ? JSON.stringify(value.reviewState) : null,
      normalized.reviewState,
    ),
  };
}

function normalizeReviewProjectMetadata(
  value: unknown,
  source: RequirementsSourceMetadata,
  rowCount: number,
) {
  const fallbackProject = {
    projectId: source.sourceId,
    projectName: source.projectName,
    customerName: source.customerName,
    sourceFilename: source.sourceFilename,
    sourceRowCount: rowCount,
  };

  if (!isRecord(value) || !isRecord(value.project)) {
    return fallbackProject;
  }

  return {
    customerName:
      typeof value.project.customerName === "string" &&
      value.project.customerName.trim().length > 0
        ? value.project.customerName
        : fallbackProject.customerName,
    projectId:
      typeof value.project.projectId === "string" &&
      value.project.projectId.trim().length > 0
        ? value.project.projectId
        : fallbackProject.projectId,
    projectName:
      typeof value.project.projectName === "string" &&
      value.project.projectName.trim().length > 0
        ? value.project.projectName
        : fallbackProject.projectName,
    sourceFilename: source.sourceFilename,
    sourceRowCount: rowCount,
  };
}

function normalizeWorkflowSnapshot(
  value: unknown,
  fallbackSnapshot: Phase1ProjectSnapshot,
): Phase1ProjectSnapshot {
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
    phase2Active:
      typeof value.phase2Active === "boolean"
        ? value.phase2Active
        : fallbackSnapshot.phase2Active,
    phase2ApprovedCount:
      typeof value.phase2ApprovedCount === "number"
        ? value.phase2ApprovedCount
        : fallbackSnapshot.phase2ApprovedCount,
    phase2CurrentStep: isMasterDataWorkflowStep(value.phase2CurrentStep)
      ? value.phase2CurrentStep
      : fallbackSnapshot.phase2CurrentStep,
    phase2ExportReady:
      typeof value.phase2ExportReady === "boolean"
        ? value.phase2ExportReady
        : fallbackSnapshot.phase2ExportReady,
    phase2NeedsReviewCount:
      typeof value.phase2NeedsReviewCount === "number"
        ? value.phase2NeedsReviewCount
        : fallbackSnapshot.phase2NeedsReviewCount,
    phase2ObjectCount:
      typeof value.phase2ObjectCount === "number"
        ? value.phase2ObjectCount
        : fallbackSnapshot.phase2ObjectCount,
    sourceFilename:
      typeof value.sourceFilename === "string"
        ? value.sourceFilename
        : fallbackSnapshot.sourceFilename,
    sourceKind:
      value.sourceKind === "upload" || value.sourceKind === "fixture"
        ? value.sourceKind
        : fallbackSnapshot.sourceKind,
    sourceLabel:
      typeof value.sourceLabel === "string"
        ? value.sourceLabel
        : fallbackSnapshot.sourceLabel,
  };
}

function normalizePhase2State(value: unknown): MasterDataPhase2State {
  const fallbackState = createInitialMasterDataPhase2State();

  if (!isRecord(value) || value.version !== 1) {
    return fallbackState;
  }

  const selectedObjectTypes = Array.isArray(value.selectedObjectTypes)
    ? value.selectedObjectTypes.filter(isMasterDataObjectType)
    : fallbackState.selectedObjectTypes;
  const generatedObjects = normalizeMasterDataGeneratedObjects(
    value.generatedObjects,
  );

  return {
    version: 1,
    active: typeof value.active === "boolean" ? value.active : fallbackState.active,
    currentStep: isMasterDataWorkflowStep(value.currentStep)
      ? value.currentStep
      : fallbackState.currentStep,
    mode: value.mode === "mock" ? "mock" : "real",
    applicableRequirements: Array.isArray(value.applicableRequirements)
      ? (value.applicableRequirements.filter(
          isRecord,
        ) as unknown as MasterDataPhase2State["applicableRequirements"])
      : fallbackState.applicableRequirements,
    selectedRequirementKeys: Array.isArray(value.selectedRequirementKeys)
      ? value.selectedRequirementKeys.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : fallbackState.selectedRequirementKeys,
    selectedObjectTypes:
      selectedObjectTypes.length > 0
        ? selectedObjectTypes
        : fallbackState.selectedObjectTypes,
    generationStatus:
      value.generationStatus === "running" ||
      value.generationStatus === "ready" ||
      value.generationStatus === "error"
        ? value.generationStatus
        : fallbackState.generationStatus,
    generationFeedback:
      typeof value.generationFeedback === "string" ||
      value.generationFeedback === null
        ? value.generationFeedback
        : fallbackState.generationFeedback,
    generatedAt:
      typeof value.generatedAt === "string" || value.generatedAt === null
        ? value.generatedAt
        : fallbackState.generatedAt,
    generationLogs: Array.isArray(value.generationLogs)
      ? (value.generationLogs.filter(
          isRecord,
        ) as unknown as MasterDataPhase2State["generationLogs"])
      : fallbackState.generationLogs,
    generatedObjects,
    traceability: Array.isArray(value.traceability)
      ? (value.traceability.filter(
          isRecord,
        ) as unknown as MasterDataPhase2State["traceability"])
      : fallbackState.traceability,
    exportSummary:
      isRecord(value.exportSummary) || value.exportSummary === null
        ? (value.exportSummary as MasterDataPhase2State["exportSummary"])
        : fallbackState.exportSummary,
  };
}

function normalizeMasterDataGeneratedObjects(
  value: unknown,
): MasterDataPhase2State["generatedObjects"] {
  const fallback = createInitialMasterDataPhase2State().generatedObjects;

  if (!isRecord(value)) {
    return fallback;
  }

  return {
    enterprise: Array.isArray(value.enterprise)
      ? (value.enterprise.filter(
          isRecord,
        ) as unknown as MasterDataPhase2State["generatedObjects"]["enterprise"])
      : [],
    site: Array.isArray(value.site)
      ? (value.site.filter(
          isRecord,
        ) as unknown as MasterDataPhase2State["generatedObjects"]["site"])
      : [],
    facility: Array.isArray(value.facility)
      ? (value.facility.filter(
          isRecord,
        ) as unknown as MasterDataPhase2State["generatedObjects"]["facility"])
      : [],
    area: Array.isArray(value.area)
      ? (value.area.filter(
          isRecord,
        ) as unknown as MasterDataPhase2State["generatedObjects"]["area"])
      : [],
    resource: Array.isArray(value.resource)
      ? (value.resource.filter(
          isRecord,
        ) as unknown as MasterDataPhase2State["generatedObjects"]["resource"])
      : [],
    product: Array.isArray(value.product)
      ? (value.product.filter(
          isRecord,
        ) as unknown as MasterDataPhase2State["generatedObjects"]["product"])
      : [],
    material: Array.isArray(value.material)
      ? (value.material.filter(
          isRecord,
        ) as unknown as MasterDataPhase2State["generatedObjects"]["material"])
      : [],
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
    industryTemplateId: normalizeIndustryTemplateId(
      value.industryTemplateId ?? fallbackSource.industryTemplateId,
    ),
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

function isMasterDataWorkflowStep(
  value: unknown,
): value is MasterDataWorkflowStep {
  return (
    value === "setup" ||
    value === "process" ||
    value === "review" ||
    value === "export" ||
    value === "traceability"
  );
}

function isMasterDataObjectType(value: unknown) {
  return (
    value === "enterprise" ||
    value === "site" ||
    value === "facility" ||
    value === "area" ||
    value === "resource" ||
    value === "product" ||
    value === "material"
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
