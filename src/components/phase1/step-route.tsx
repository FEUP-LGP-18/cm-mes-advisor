"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  downloadDemoScriptMarkdown,
  formatExportDownloadTime,
  readGeneralOutputPreferencesFromStorage,
} from "@/app/demo-script-panel";
import { getMasterDataStepPath } from "@/lib/master-data/workflow";
import {
  getAllowedWorkflowStep,
  getPhase1StepPath,
  type Phase1WorkflowStep,
} from "@/lib/phase1/workflow";
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
    canEditPhase1,
    canUploadWorkbook,
    currentUserRole,
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
    persistenceFeedback,
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
  const allowedStep =
    isHydrated && project ? getAllowedWorkflowStep(workflowSnapshot, step) : step;
  const [downloadedAt, setDownloadedAt] = useState<string | null>(null);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/45 border-t-white shadow-[0_0_32px_rgba(0,0,0,0.18)]" />
        <span className="sr-only">Loading project</span>
      </div>
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

  const navigateToStep = (nextStep: Phase1WorkflowStep) => {
    router.push(getPhase1StepPath(project.projectId, nextStep));
  };

  const hasReadyExportPayload =
    workflowSnapshot.exportReady &&
    !demoScriptAssembly.emptyState &&
    demoScriptAssembly.approvedRequirementCount > 0;

  const handleDownloadMarkdown = () => {
    downloadDemoScriptMarkdown({
      assembly: demoScriptAssembly,
      outputPreferences: readGeneralOutputPreferencesFromStorage(),
      projectMetadata: workspaceState.reviewState.project,
    });
    setDownloadedAt(formatExportDownloadTime(new Date()));
  };

  const headerActions =
    step === "review" ? (
      <button
        className="fv-btn-primary"
        disabled={summary.approvedCount === 0}
        onClick={() => navigateToStep("script")}
        type="button"
      >
        Generate Script
      </button>
    ) : step === "script" ? (
      <>
        <button
          className="fv-btn-primary"
          disabled={!workflowSnapshot.exportReady}
          onClick={() => navigateToStep("export")}
          type="button"
        >
          Continue to export
        </button>
        <button
          className="fv-btn-secondary"
          onClick={() => navigateToStep("review")}
          type="button"
        >
          Back to review
        </button>
      </>
    ) : step === "export" ? (
      <>
        <button
          className="fv-btn-primary"
          disabled={!hasReadyExportPayload}
          onClick={handleDownloadMarkdown}
          type="button"
        >
          Download handoff
        </button>
        <button
          className="fv-btn-secondary"
          onClick={() => navigateToStep("script")}
          type="button"
        >
          Back to Script
        </button>
        <button
          className="fv-btn-secondary"
          onClick={() => navigateToStep("review")}
          type="button"
        >
          Back to Review
        </button>
      </>
    ) : null;

  return (
    <Phase1ProjectShell
      canEditPhase1={canEditPhase1}
      currentStep={step}
      currentUserRole={currentUserRole}
      email={phase1.currentUser?.email}
      headerActions={headerActions}
      nextAction={nextAction}
      persistenceFeedback={persistenceFeedback}
      progress={workflowProgress}
      project={project}
    >
      {step === "source" ? (
        <SourceStudio
          canContinue={canEditPhase1}
          canUploadWorkbook={canUploadWorkbook}
          key={currentSourceMetadata.sourceId}
          currentSourceMetadata={currentSourceMetadata}
          demoCount={summary.demoCount}
          mvpCount={summary.mvpCount}
          onContinue={() => navigateToStep("generate")}
          onRestoreFixtureSource={restoreFixtureSource}
          onUploadWorkbook={uploadWorkbook}
          requirements={reviewRequirements}
          sourceFeedback={sourceFeedback}
          sourceRowCount={workspaceState.reviewState.project.sourceRowCount}
        />
      ) : null}

      {step === "generate" ? (
        <GenerateStudio
          canGenerateRows={canEditPhase1}
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
          canEditPhase1={canEditPhase1}
          generatedCount={generatedRequirements.length}
          generatedReviewableRequirements={generatedReviewableRequirements}
          onGenerateDemoRows={() => generateRows(demoRequirements, "demo rows")}
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
          draft={workspaceState.reviewState.demoScriptDraft}
          onDraftAction={updateDemoScriptDraft}
          onGoToReview={() => navigateToStep("review")}
          pendingReviewCount={generatedReviewableRequirements.length}
          projectMetadata={workspaceState.reviewState.project}
        />
      ) : null}

      {step === "export" ? (
        <ExportStudio
          approvedCount={summary.approvedCount}
          assembly={demoScriptAssembly}
          downloadedAt={downloadedAt}
          exportReady={workflowSnapshot.exportReady}
          onGoToReview={() => navigateToStep("review")}
          onGoToScript={() => navigateToStep("script")}
          onOpenMasterData={() => {
            setMasterDataStep("setup");
            router.push(getMasterDataStepPath(project.projectId, "setup"));
          }}
          pendingReviewCount={generatedReviewableRequirements.length}
          projectMetadata={workspaceState.reviewState.project}
        />
      ) : null}
    </Phase1ProjectShell>
  );
}
