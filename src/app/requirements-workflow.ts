export type GuidedWorkflowStep =
  | "source"
  | "generate"
  | "review"
  | "script"
  | "export";

export type GuidedWorkflowStepStatus = "available" | "blocked" | "complete";

export interface GuidedWorkflowSnapshot {
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

export interface GuidedWorkflowStepState {
  step: GuidedWorkflowStep;
  label: string;
  status: GuidedWorkflowStepStatus;
}

export interface GuidedNextAction {
  step: GuidedWorkflowStep;
  label: string;
  helper: string;
}

const workflowLabels: Record<GuidedWorkflowStep, string> = {
  source: "Source",
  generate: "Generate",
  review: "Review",
  script: "Script",
  export: "Export",
};

export const guidedWorkflowSteps: GuidedWorkflowStep[] = [
  "source",
  "generate",
  "review",
  "script",
  "export",
];

export function getWorkflowProgress(
  snapshot: GuidedWorkflowSnapshot,
): GuidedWorkflowStepState[] {
  return guidedWorkflowSteps.map((step) => ({
    step,
    label: workflowLabels[step],
    status: getStepStatus(snapshot, step),
  }));
}

export function getRecommendedWorkflowStep(
  snapshot: GuidedWorkflowSnapshot,
): GuidedWorkflowStep {
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
  snapshot: GuidedWorkflowSnapshot,
): GuidedNextAction {
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

function getStepStatus(
  snapshot: GuidedWorkflowSnapshot,
  step: GuidedWorkflowStep,
): GuidedWorkflowStepStatus {
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
