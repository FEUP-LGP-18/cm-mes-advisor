export type Phase1WorkflowStep =
  | "source"
  | "generate"
  | "review"
  | "script"
  | "export";

export type LegacyPhase1WorkflowStep =
  | Phase1WorkflowStep
  | "setup"
  | "handoff";

export type Phase1WorkflowStepStatus =
  | "available"
  | "blocked"
  | "complete"
  | "ready";

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

export interface Phase1WorkflowStepMeta {
  step: Phase1WorkflowStep;
  label: string;
  subtitle: string;
}

export interface Phase1WorkflowStepState extends Phase1WorkflowStepMeta {
  status: Phase1WorkflowStepStatus;
  statusLabel: string;
}

export interface Phase1NextAction {
  step: Phase1WorkflowStep;
  label: string;
  helper: string;
}

export const phase1WorkflowMeta: Record<Phase1WorkflowStep, Phase1WorkflowStepMeta> =
  {
    source: {
      step: "source",
      label: "Source",
      subtitle: "Confirm workbook",
    },
    generate: {
      step: "generate",
      label: "Generate",
      subtitle: "Produce drafts",
    },
    review: {
      step: "review",
      label: "Review",
      subtitle: "Consultant decisions",
    },
    script: {
      step: "script",
      label: "Script",
      subtitle: "Shape narrative",
    },
    export: {
      step: "export",
      label: "Export",
      subtitle: "Download handoff",
    },
  };

export const phase1WorkflowSteps: Phase1WorkflowStep[] = [
  "source",
  "generate",
  "review",
  "script",
  "export",
];

export const phase1WorkflowLabels: Record<Phase1WorkflowStep, string> = {
  source: phase1WorkflowMeta.source.label,
  generate: phase1WorkflowMeta.generate.label,
  review: phase1WorkflowMeta.review.label,
  script: phase1WorkflowMeta.script.label,
  export: phase1WorkflowMeta.export.label,
};

export function getWorkflowProgress(
  snapshot: Phase1WorkflowSnapshot,
): Phase1WorkflowStepState[] {
  return phase1WorkflowSteps.map((step) => {
    const status = getStepStatus(snapshot, step);

    return {
      ...phase1WorkflowMeta[step],
      status,
      statusLabel: `${phase1WorkflowMeta[step].label} ${status}`,
    };
  });
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
          "Start with the Customer X sample or upload another requirements workbook for this project.",
      };
    case "generate":
      return {
        step,
        label: "Generate the recommended draft",
        helper: `${snapshot.demoCount} demo row${snapshot.demoCount === 1 ? "" : "s"} are ready for the first consultant-safe generation pass.`,
      };
    case "review":
      return {
        step,
        label:
          snapshot.approvedCount === 0
            ? "Review the first generated draft"
            : "Finish consultant review",
        helper: `${snapshot.generatedReviewableCount} generated row${snapshot.generatedReviewableCount === 1 ? "" : "s"} still need a consultant decision.`,
      };
    case "script":
      return {
        step,
        label: "Shape the narrative",
        helper:
          "Approved rows are ready for the narrative pass. Refine the structure, wording, notes, and traceability before export.",
      };
    case "export":
      return {
        step,
        label: "Download Markdown handoff",
        helper: `${snapshot.approvedCount} approved requirement${snapshot.approvedCount === 1 ? "" : "s"} and ${snapshot.approvedStepCount} script step${snapshot.approvedStepCount === 1 ? "" : "s"} are ready for export.`,
      };
  }
}

export function resolveLegacyPhase1WorkflowStep(
  step: LegacyPhase1WorkflowStep,
  snapshot?: Phase1WorkflowSnapshot,
): Phase1WorkflowStep {
  switch (step) {
    case "setup":
      return !snapshot || snapshot.sourceRowCount === 0 ? "source" : "generate";
    case "handoff":
      return snapshot?.exportReady ? "export" : "script";
    default:
      return step;
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

export function getLegacyPhase1StepRedirectPath(
  projectId: string,
  legacyStep: LegacyPhase1WorkflowStep,
  snapshot?: Phase1WorkflowSnapshot,
): string {
  return getPhase1StepPath(
    projectId,
    resolveLegacyPhase1WorkflowStep(legacyStep, snapshot),
  );
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

      return snapshot.approvedStepCount > 0 && snapshot.scriptVisited
        ? "complete"
        : "available";
    case "export":
      if (!snapshot.exportReady) {
        return "blocked";
      }

      return "ready";
  }
}
