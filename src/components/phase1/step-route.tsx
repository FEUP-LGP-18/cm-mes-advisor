"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RequirementGenerationAvailabilityBody } from "@/lib/requirements/generation-api";
import {
  getAllowedWorkflowStep,
  getPhase1StepPath,
  type Phase1WorkflowStep,
} from "@/lib/phase1/workflow";
import ExportStudio from "./export-studio";
import GenerateStudio from "./generate-studio";
import { usePhase1Project } from "./project-provider";
import Phase1ProjectShell from "./project-shell";
import ReviewStudio from "./review-studio";
import ScriptStudio from "./script-studio";
import SourceStudio from "./source-studio";
import { getMasterDataStepPath } from "@/lib/master-data/workflow";

export default function Phase1ProjectStepRoute({
  initialGenerationAvailability = null,
  step,
}: {
  initialGenerationAvailability?: RequirementGenerationAvailabilityBody | null;
  step: Phase1WorkflowStep;
}) {
  const router = useRouter();
  const {
    currentSourceMetadata,
    demoRequirements,
    demoScriptAssembly,
    generatedRequirements,
    generatedReviewableRequirements,
    generationFeedback,
    isGenerating,
    isHydrated,
    lastGenerationMode,
    mockGenerationRun,
    nextAction,
    project,
    reviewRequirements,
    setCurrentStep,
    sourceFeedback,
    summary,
    uploadWorkbook,
    workflowProgress,
    workflowSnapshot,
    workspaceState,
    updateDemoScriptDraft,
    updateRequirementReview,
    restoreFixtureSource,
    generateRows,
  } = usePhase1Project();
  const allowedStep =
    isHydrated && project ? getAllowedWorkflowStep(workflowSnapshot, step) : step;

  useEffect(() => {
    if (!isHydrated || !project) {
      return;
    }

    if (allowedStep !== step) {
      router.replace(getPhase1StepPath(project.projectId, allowedStep));
      return;
    }

    if (project.currentStep !== step) {
      setCurrentStep(step);
    }
  }, [allowedStep, isHydrated, project, router, setCurrentStep, step]);

  if (!isHydrated) {
    return (
      <main className="app-canvas flex min-h-screen items-center justify-center px-6">
        <div className="phase-empty-state max-w-xl text-center">
          <p className="phase-overline">Loading project</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Restoring the Phase 1 workspace
          </h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
            The saved project state is loading so the correct customer
            workspace can be restored before you continue.
          </p>
        </div>
      </main>
    );
  }

  if (!project || !workspaceState) {
    return (
      <main className="app-canvas flex min-h-screen items-center justify-center px-6">
        <div className="phase-empty-state max-w-xl text-center">
          <p className="phase-overline">Project not found</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            This project is no longer available
          </h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
            Return to the project desk and reopen another Phase 1 workspace.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="focus-premium theme-button-primary mt-5 rounded-2xl px-5 py-3 text-sm font-semibold transition"
          >
            Back to project desk
          </button>
        </div>
      </main>
    );
  }

  if (allowedStep !== step) {
    return (
      <main className="app-canvas flex min-h-screen items-center justify-center px-6">
        <div className="phase-empty-state max-w-xl text-center">
          <p className="phase-overline">Redirecting</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Returning to the next valid stage
          </h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
            The requested stage is blocked by the current review state, so the
            workspace is taking you to the next actionable surface.
          </p>
        </div>
      </main>
    );
  }

  return (
    <Phase1ProjectShell
      currentStep={step}
      nextAction={nextAction}
      progress={workflowProgress}
      project={project}
    >
      {step === "source" ? (
        <SourceStudio
          key={currentSourceMetadata.sourceId}
          currentSourceMetadata={currentSourceMetadata}
          demoCount={summary.demoCount}
          mvpCount={summary.mvpCount}
          onContinue={() =>
            router.push(getPhase1StepPath(project.projectId, "generate"))
          }
          onRestoreFixtureSource={restoreFixtureSource}
          onUploadWorkbook={uploadWorkbook}
          requirements={reviewRequirements}
          sourceFeedback={sourceFeedback}
          sourceRowCount={workspaceState.reviewState.project.sourceRowCount}
        />
      ) : null}

      {step === "generate" ? (
        <GenerateStudio
          demoRequirements={demoRequirements}
          generatedCount={generatedRequirements.length}
          generationFeedback={generationFeedback}
          initialGenerationAvailability={initialGenerationAvailability}
          isGenerating={isGenerating}
          lastGenerationMode={lastGenerationMode}
          mockGenerationRun={mockGenerationRun}
          onGenerateRows={generateRows}
          onOpenReview={() =>
            router.push(getPhase1StepPath(project.projectId, "review"))
          }
          requirements={reviewRequirements}
        />
      ) : null}

      {step === "review" ? (
        <ReviewStudio
          approvedCount={summary.approvedCount}
          generatedCount={generatedRequirements.length}
          generatedReviewableRequirements={generatedReviewableRequirements}
          onGenerateDemoRows={() => generateRows(demoRequirements, "demo rows")}
          onGoToGenerate={() =>
            router.push(getPhase1StepPath(project.projectId, "generate"))
          }
          onOpenScript={() =>
            router.push(getPhase1StepPath(project.projectId, "script"))
          }
          onReviewAction={updateRequirementReview}
          projectId={project.projectId}
          reviewRequirements={reviewRequirements}
        />
      ) : null}

      {step === "script" ? (
        <ScriptStudio
          assembly={demoScriptAssembly}
          draft={workspaceState.reviewState.demoScriptDraft}
          exportReady={workflowSnapshot.exportReady}
          onDraftAction={updateDemoScriptDraft}
          onGoToReview={() =>
            router.push(getPhase1StepPath(project.projectId, "review"))
          }
          onOpenExport={() =>
            router.push(getPhase1StepPath(project.projectId, "export"))
          }
          pendingReviewCount={generatedReviewableRequirements.length}
          projectMetadata={workspaceState.reviewState.project}
        />
      ) : null}

      {step === "export" ? (
        <ExportStudio
          assembly={demoScriptAssembly}
          exportReady={workflowSnapshot.exportReady}
          onGoToReview={() =>
            router.push(getPhase1StepPath(project.projectId, "review"))
          }
          onGoToScript={() =>
            router.push(getPhase1StepPath(project.projectId, "script"))
          }
          onOpenMasterData={() =>
            router.push(getMasterDataStepPath(project.projectId, "setup"))
          }
          pendingReviewCount={generatedReviewableRequirements.length}
          projectMetadata={workspaceState.reviewState.project}
        />
      ) : null}
    </Phase1ProjectShell>
  );
}
