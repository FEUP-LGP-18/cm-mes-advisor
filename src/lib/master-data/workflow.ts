import type { Phase1ProjectRecord } from "@/lib/phase1/project-registry";
import type {
  MasterDataPhase2State,
  MasterDataWorkflowStep,
} from "./types";

export function getMasterDataStepPath(
  projectId: string,
  step: MasterDataWorkflowStep,
): string {
  return `/projects/${encodeURIComponent(projectId)}/master-data/${step}`;
}

export function getAllowedMasterDataStep(
  state: MasterDataPhase2State,
  step: MasterDataWorkflowStep,
): MasterDataWorkflowStep {
  if (step === "setup") {
    return step;
  }

  if (step === "process") {
    return state.applicableRequirements.length > 0 &&
      state.selectedRequirementKeys.length > 0
      ? step
      : "setup";
  }

  const objectCount = Object.values(state.generatedObjects).reduce(
    (total, entries) => total + entries.length,
    0,
  );

  if (objectCount === 0) {
    return state.selectedRequirementKeys.length > 0 ? "process" : "setup";
  }

  if (step === "review") {
    return step;
  }

  if (step === "traceability") {
    return state.exportSummary !== null ? step : "export";
  }

  return step;
}

export function getProjectResumePath(project: Phase1ProjectRecord): string {
  if (project.activeFlow === "master-data" && project.phase2?.active) {
    return getMasterDataStepPath(project.projectId, project.phase2.currentStep);
  }

  return `/projects/${encodeURIComponent(project.projectId)}/${project.currentStep}`;
}
