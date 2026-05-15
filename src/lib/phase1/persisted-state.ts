import {
  createPhase1ProjectRecordFromWorkspaceState,
  type Phase1ProjectRecord,
} from "./project-registry";
import {
  phase1WorkflowSteps,
  type Phase1WorkflowStep,
} from "./workflow";
import {
  parseRequirementsWorkspaceState,
  type RequirementsWorkspaceState,
} from "@/lib/requirements/workspace-state";

export const PHASE1_PERSISTED_STATE_KEY = "phase1";
export const PHASE1_PERSISTED_STATE_VERSION = 1;

export type PersistedPhase1State = {
  currentStep: Phase1WorkflowStep;
  stateVersion: typeof PHASE1_PERSISTED_STATE_VERSION;
  workspaceState: RequirementsWorkspaceState;
};

export function createPersistedPhase1State(
  project: Phase1ProjectRecord,
): PersistedPhase1State {
  return {
    currentStep: project.currentStep,
    stateVersion: PHASE1_PERSISTED_STATE_VERSION,
    workspaceState: project.workspaceState,
  };
}

export function parsePersistedPhase1State(
  value: unknown,
  fallbackState: RequirementsWorkspaceState,
): PersistedPhase1State | null {
  if (!isRecord(value) || value.stateVersion !== PHASE1_PERSISTED_STATE_VERSION) {
    return null;
  }

  return {
    currentStep: isPhase1WorkflowStep(value.currentStep)
      ? value.currentStep
      : "source",
    stateVersion: PHASE1_PERSISTED_STATE_VERSION,
    workspaceState: parseRequirementsWorkspaceState(
      value.workspaceState,
      fallbackState,
    ),
  };
}

export function createProjectRecordFromPersistedPhase1State(
  persistedState: PersistedPhase1State,
  options: {
    createdAt: string;
    projectId: string;
    updatedAt: string;
  },
): Phase1ProjectRecord {
  return createPhase1ProjectRecordFromWorkspaceState(
    persistedState.workspaceState,
    {
      createdAt: options.createdAt,
      currentStep: persistedState.currentStep,
      projectId: options.projectId,
      updatedAt: options.updatedAt,
    },
  );
}

function isPhase1WorkflowStep(value: unknown): value is Phase1WorkflowStep {
  return (
    typeof value === "string" &&
    phase1WorkflowSteps.includes(value as Phase1WorkflowStep)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
