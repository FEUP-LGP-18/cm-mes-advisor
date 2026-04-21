export type Phase1WorkflowStep =
  | "source"
  | "generate"
  | "review"
  | "script"
  | "export";

export type Phase1WorkflowStepStatus = "available" | "blocked" | "complete";

export interface Phase1WorkflowSnapshot {
  sourceRowCount: number;
  demoCount: number;
  mvpCount: number;
  generatedCount: number;
  generatedReviewableCount: number;
  approvedCount: number;
  approvedStepCount: number;
  selectedCount: number;
  scriptVisited: boolean;
  exportReady: boolean;
}

export interface Phase1WorkflowStepState {
  step: Phase1WorkflowStep;
  label: string;
  status: Phase1WorkflowStepStatus;
}

export interface Phase1NextAction {
  step: Phase1WorkflowStep;
  label: string;
  helper: string;
}

export const phase1WorkflowLabels: Record<Phase1WorkflowStep, string> = {
  source: "Source",
  generate: "Generate",
  review: "Review",
  script: "Script",
  export: "Export",
};

export const phase1WorkflowSteps: Phase1WorkflowStep[] = [
  "source",
  "generate",
  "review",
  "script",
  "export",
];

export function getWorkflowProgress(
  snapshot: Phase1WorkflowSnapshot,
): Phase1WorkflowStepState[] {
  return phase1WorkflowSteps.map((step) => ({
    step,
    label: phase1WorkflowLabels[step],
    status: getStepStatus(snapshot, step),
  }));
}

export function getRecommendedWorkflowStep(
  snapshot: Phase1WorkflowSnapshot,
): Phase1WorkflowStep {
  if (snapshot.sourceRowCount === 0) {
    return "source";
  }

  if (snapshot.generatedCount === 0) {
    return "generate";
  }

  if (snapshot.approvedCount === 0 || snapshot.generatedReviewableCount > 0) {
    return "review";
  }

  if (snapshot.approvedStepCount === 0 || !snapshot.scriptVisited) {
    return "script";
  }

  return "export";
}

export function getNextAction(
  snapshot: Phase1WorkflowSnapshot,
): Phase1NextAction {
  const step = getRecommendedWorkflowStep(snapshot);

  switch (step) {
    case "source":
      return {
        step,
        label: "Confirm the workbook",
        helper:
          "Start with the Customer X sample or upload another requirements Excel.",
      };
    case "generate":
      return {
        step,
        label: "Generate drafts for demo rows",
        helper: `${snapshot.demoCount} demo rows are ready for safe prototype generation.`,
      };
    case "review":
      return {
        step,
        label:
          snapshot.approvedCount === 0
            ? "Review the first generated draft"
            : "Finish reviewing generated drafts",
        helper: `${snapshot.generatedReviewableCount} generated rows still need a consultant decision.`,
      };
    case "script":
      return {
        step,
        label: "Shape the assembled demo script",
        helper:
          "Approved rows are ready. Review the narrative, section names, notes, and traceability before the final handoff.",
      };
    case "export":
      return {
        step,
        label: "Download the Phase 1 deliverable",
        helper: `${snapshot.approvedCount} approved requirements and ${snapshot.approvedStepCount} demo steps are ready for the final Markdown handoff.`,
      };
  }
}

export function isWorkflowStepAccessible(
  snapshot: Phase1WorkflowSnapshot,
  step: Phase1WorkflowStep,
): boolean {
  return getStepStatus(snapshot, step) !== "blocked";
}

export function getAllowedWorkflowStep(
  snapshot: Phase1WorkflowSnapshot,
  step: Phase1WorkflowStep,
): Phase1WorkflowStep {
  return isWorkflowStepAccessible(snapshot, step)
    ? step
    : getRecommendedWorkflowStep(snapshot);
}

export function getPhase1StepPath(
  projectId: string,
  step: Phase1WorkflowStep,
): string {
  return `/projects/${encodeURIComponent(projectId)}/${step}`;
}

function getStepStatus(
  snapshot: Phase1WorkflowSnapshot,
  step: Phase1WorkflowStep,
): Phase1WorkflowStepStatus {
  switch (step) {
    case "source":
      return snapshot.sourceRowCount > 0 ? "complete" : "available";
    case "generate":
      if (snapshot.sourceRowCount === 0) {
        return "blocked";
      }

      return snapshot.generatedCount > 0 ? "complete" : "available";
    case "review":
      if (snapshot.generatedCount === 0) {
        return "blocked";
      }

      return snapshot.approvedCount > 0 &&
        snapshot.generatedReviewableCount === 0
        ? "complete"
        : "available";
    case "script":
      if (snapshot.approvedCount === 0) {
        return "blocked";
      }

      return snapshot.approvedStepCount > 0 ? "complete" : "available";
    case "export":
      if (!snapshot.exportReady) {
        return "blocked";
      }

      return "available";
  }
}
