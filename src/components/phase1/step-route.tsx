"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getAllowedWorkflowStep,
  getPhase1StepPath,
  type Phase1WorkflowStep,
} from "@/lib/phase1/workflow";
import { getMasterDataStepPath } from "@/lib/master-data/workflow";
import type { RequirementGenerationAvailabilityBody } from "@/lib/requirements/generation-api";
import ExportStudio from "./export-studio";
import GenerateStudio from "./generate-studio";
import { usePhase1Project } from "./project-provider";
import Phase1ProjectShell from "./project-shell";
import ReviewStudio from "./review-studio";
import ScriptStudio from "./script-studio";
import SourceStudio from "./source-studio";

export default function Phase1ProjectStepRoute({
  initialGenerationAvailability = null,
  step,
}: {
  initialGenerationAvailability?: RequirementGenerationAvailabilityBody | null;
  step: Phase1WorkflowStep;
}) {
  const router = useRouter();
  const phase1 = usePhase1Project();
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
    project,
    reviewRequirements,
    setCurrentStep,
    setMasterDataStep,
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
  } = phase1;

  const allowedStep = getAllowedWorkflowStep(workflowSnapshot, step);

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

  if (!project) {
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
            Loading the right project step
          </h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
            This stage depends on earlier Phase 1 work, so the project is being
            reopened at the next available step.
          </p>
        </div>
      </main>
    );
  }

  const projectMetadata =
    workspaceState?.reviewState.project ??
    project.workspaceState.reviewState.project;
  const navigateToStep = (nextStep: Phase1WorkflowStep) => {
    router.push(getPhase1StepPath(project.projectId, nextStep));
  };

  return (
    <Phase1ProjectShell
      currentStep={step}
      nextAction={phase1.nextAction}
      progress={workflowProgress}
      project={project}
    >
      {step === "source" ? (
        <SourceStudio
          currentSourceMetadata={currentSourceMetadata}
          demoCount={summary.demoCount}
          mvpCount={summary.mvpCount}
          onContinue={() => navigateToStep("generate")}
          onRestoreFixtureSource={restoreFixtureSource}
          onUploadWorkbook={uploadWorkbook}
          requirements={reviewRequirements}
          sourceFeedback={sourceFeedback}
          sourceRowCount={workflowSnapshot.sourceRowCount}
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
          onOpenReview={() => navigateToStep("review")}
          requirements={reviewRequirements}
        />
      ) : null}

      {step === "review" ? (
        <ReviewStudio
          approvedCount={summary.approvedCount}
          generatedCount={generatedRequirements.length}
          generatedReviewableRequirements={generatedReviewableRequirements}
          onGenerateDemoRows={() =>
            generateRows(demoRequirements, "recommended demo rows")
          }
          onGoToGenerate={() => navigateToStep("generate")}
          onOpenScript={() => navigateToStep("script")}
          onReviewAction={updateRequirementReview}
          projectId={project.projectId}
          reviewRequirements={reviewRequirements}
        />
      ) : null}

      {step === "script" ? (
        <ScriptStudio
          assembly={demoScriptAssembly}
          draft={project.workspaceState.reviewState.demoScriptDraft}
          exportReady={workflowSnapshot.exportReady}
          onDraftAction={updateDemoScriptDraft}
          onGoToReview={() => navigateToStep("review")}
          onOpenExport={() => navigateToStep("export")}
          pendingReviewCount={workflowSnapshot.generatedReviewableCount}
          projectMetadata={projectMetadata}
        />
      ) : null}

      {step === "export" ? (
        <ExportStudio
          assembly={demoScriptAssembly}
          exportReady={workflowSnapshot.exportReady}
          onGoToReview={() => navigateToStep("review")}
          onGoToScript={() => navigateToStep("script")}
          onOpenMasterData={() => {
            setMasterDataStep("setup");
            router.push(getMasterDataStepPath(project.projectId, "setup"));
          }}
          pendingReviewCount={workflowSnapshot.generatedReviewableCount}
          projectMetadata={projectMetadata}
        />
      ) : null}
    </Phase1ProjectShell>
  );
}
