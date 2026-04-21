"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  filterReviewRequirements,
  type RequirementReviewAction,
  type RequirementReviewFilter,
  type ReviewRequirement,
} from "@/lib/requirements/review";
import type {
  RequirementGenerationAvailabilityBody,
  RequirementGenerationModeCapability,
  RequirementGenerationRouteMode,
  RequirementGenerationUnavailableReason,
} from "@/lib/requirements/generation-api";
import {
  getAllowedWorkflowStep,
  getPhase1StepPath,
  type Phase1WorkflowStep,
} from "@/lib/phase1/workflow";
import DemoScriptEditingPanel from "@/app/demo-script-panel";
import {
  ExportWorkflowStep,
  GenerateWorkflowStep,
  GuidedStepFooter,
  ReviewWorkflowStep,
  WorkspaceSourcePanel,
} from "@/app/requirements-review-workspace";
import { usePhase1Project } from "./project-provider";
import Phase1ProjectShell from "./project-shell";

const defaultGenerateFilter: RequirementReviewFilter = "demo";

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
    isHydrated && project
      ? getAllowedWorkflowStep(workflowSnapshot, step)
      : step;

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
      <main className="mesh-background flex min-h-screen items-center justify-center px-6 text-[color:var(--shell-ink)]">
        <div className="phase-empty-state max-w-xl text-center">
          <p className="phase-overline">Loading local project</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">
            Rebuilding the Phase 1 workspace
          </h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
            The local project registry is loading so this route can pick the
            right project state.
          </p>
        </div>
      </main>
    );
  }

  if (!project || !workspaceState) {
    return (
      <main className="mesh-background flex min-h-screen items-center justify-center px-6 text-[color:var(--shell-ink)]">
        <div className="phase-empty-state max-w-xl text-center">
          <p className="phase-overline">Project not found</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">
            This local project does not exist anymore
          </h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
            Go back to the project home and open another Phase 1 project.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="focus-premium theme-button-primary mt-5 rounded-2xl px-5 py-3 text-sm font-black transition"
          >
            Back to project home
          </button>
        </div>
      </main>
    );
  }

  if (allowedStep !== step) {
    return (
      <main className="mesh-background flex min-h-screen items-center justify-center px-6 text-[color:var(--shell-ink)]">
        <div className="phase-empty-state max-w-xl text-center">
          <p className="phase-overline">Redirecting</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">
            Returning to the next valid Phase 1 step
          </h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
            This route is blocked until the earlier workflow requirements are
            complete.
          </p>
        </div>
      </main>
    );
  }

  const reviewBacklogCount = generatedReviewableRequirements.length;
  const scriptNeedsReviewFollowup =
    step === "script" &&
    (demoScriptAssembly.emptyState ||
      reviewBacklogCount > 0 ||
      !workflowSnapshot.exportReady);

  return (
    <Phase1ProjectShell
      currentStep={step}
      nextAction={nextAction}
      progress={workflowProgress}
      project={project}
    >
      {step === "source" ? (
        <SourceScreen
          key={currentSourceMetadata.sourceId}
          currentSourceMetadata={currentSourceMetadata}
          demoCount={summary.demoCount}
          fallbackRowCount={workspaceState.reviewState.project.sourceRowCount}
          feedback={sourceFeedback}
          mvpCount={summary.mvpCount}
          onContinue={() =>
            router.push(getPhase1StepPath(project.projectId, "generate"))
          }
          onRestoreFixtureSource={restoreFixtureSource}
          onUploadWorkbook={uploadWorkbook}
          requirements={reviewRequirements}
        />
      ) : null}

      {step === "generate" ? (
        <GenerateScreen
          demoRequirements={demoRequirements}
          generationFeedback={generationFeedback}
          initialGenerationAvailability={initialGenerationAvailability}
          isGenerating={isGenerating}
          mockGenerationRun={mockGenerationRun}
          lastGenerationMode={lastGenerationMode}
          projectId={project.projectId}
          requirements={reviewRequirements}
          onGenerateRows={generateRows}
        />
      ) : null}

      {step === "review" ? (
        <ReviewScreen
          approvedCount={summary.approvedCount}
          generatedCount={generatedRequirements.length}
          generatedReviewableRequirements={generatedReviewableRequirements}
          onGenerateDemoRows={() => generateRows(demoRequirements, "demo rows")}
          onOpenScript={() =>
            router.push(getPhase1StepPath(project.projectId, "script"))
          }
          onReviewAction={updateRequirementReview}
          projectId={project.projectId}
        />
      ) : null}

      {step === "script" ? (
        <section className="grid gap-4">
          <DemoScriptEditingPanel
            assembly={demoScriptAssembly}
            draft={workspaceState.reviewState.demoScriptDraft}
            onDraftAction={updateDemoScriptDraft}
            onSwitchToReview={() =>
              router.push(getPhase1StepPath(project.projectId, "review"))
            }
            projectMetadata={workspaceState.reviewState.project}
          />

          <GuidedStepFooter
            disabled={false}
            helper={
              demoScriptAssembly.emptyState
                ? "Approve at least one generated row in review before export becomes available."
                : scriptNeedsReviewFollowup
                  ? `${reviewBacklogCount} generated row${reviewBacklogCount === 1 ? "" : "s"} still need consultant review before export unlocks.`
                  : `${demoScriptAssembly.approvedRequirementCount} approved requirements are ready for export.`
            }
            label={scriptNeedsReviewFollowup ? "Back to review" : "Continue to export"}
            onClick={() =>
              router.push(
                getPhase1StepPath(
                  project.projectId,
                  scriptNeedsReviewFollowup ? "review" : "export",
                ),
              )
            }
          />
        </section>
      ) : null}

      {step === "export" ? (
        <section className="grid gap-4">
          <ExportWorkflowStep
            assembly={demoScriptAssembly}
            onGoToReview={() =>
              router.push(getPhase1StepPath(project.projectId, "review"))
            }
            onGoToScript={() =>
              router.push(getPhase1StepPath(project.projectId, "script"))
            }
            projectMetadata={workspaceState.reviewState.project}
            showFrame={false}
          />
        </section>
      ) : null}
    </Phase1ProjectShell>
  );
}

function SourceScreen({
  currentSourceMetadata,
  demoCount,
  fallbackRowCount,
  feedback,
  mvpCount,
  onContinue,
  onRestoreFixtureSource,
  onUploadWorkbook,
  requirements,
}: {
  currentSourceMetadata: ReturnType<
    typeof usePhase1Project
  >["currentSourceMetadata"];
  demoCount: number;
  fallbackRowCount: number;
  feedback: ReturnType<typeof usePhase1Project>["sourceFeedback"];
  mvpCount: number;
  onContinue: () => void;
  onRestoreFixtureSource: () => void;
  onUploadWorkbook: (file: File) => Promise<boolean>;
  requirements: ReviewRequirement[];
}) {
  const [sourcePreviewExpanded, setSourcePreviewExpanded] = useState(true);
  const [sourceDetailsExpanded, setSourceDetailsExpanded] = useState(
    currentSourceMetadata.sourceKind !== "fixture",
  );

  async function handleUploadWorkbook(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const uploaded = await onUploadWorkbook(file);

    if (uploaded) {
      setSourcePreviewExpanded(true);
      setSourceDetailsExpanded(true);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="phase-screen-intro phase-screen-intro-compact">
        <p className="phase-overline">Step 1</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--shell-muted)]">
          Confirm the active workbook, scan the parsed rows, and only replace
          the source when you intentionally want a new input.
        </p>
      </div>

      <WorkspaceSourcePanel
        demoCount={demoCount}
        feedback={feedback}
        mvpCount={mvpCount}
        onContinue={onContinue}
        onRestoreFixtureSource={onRestoreFixtureSource}
        onToggleDetails={() => setSourceDetailsExpanded((current) => !current)}
        onTogglePreview={() => setSourcePreviewExpanded((current) => !current)}
        onUploadWorkbook={handleUploadWorkbook}
        previewRows={requirements.slice(0, 8)}
        sourceMetadata={currentSourceMetadata}
        sourceDetailsExpanded={sourceDetailsExpanded}
        sourcePreviewExpanded={sourcePreviewExpanded}
        sourceRowCount={fallbackRowCount}
      />
    </section>
  );
}

function GenerateScreen({
  demoRequirements,
  generationFeedback,
  initialGenerationAvailability,
  isGenerating,
  lastGenerationMode,
  mockGenerationRun,
  projectId,
  requirements,
  onGenerateRows,
}: {
  demoRequirements: ReviewRequirement[];
  generationFeedback: ReturnType<typeof usePhase1Project>["generationFeedback"];
  initialGenerationAvailability: RequirementGenerationAvailabilityBody | null;
  isGenerating: boolean;
  lastGenerationMode: ReturnType<typeof usePhase1Project>["lastGenerationMode"];
  mockGenerationRun: ReturnType<typeof usePhase1Project>["mockGenerationRun"];
  projectId: string;
  requirements: ReviewRequirement[];
  onGenerateRows: (
    targetRequirements: ReviewRequirement[],
    targetLabel: string,
    mode?: RequirementGenerationRouteMode,
  ) => Promise<boolean>;
}) {
  const router = useRouter();
  const [generationMode, setGenerationMode] =
    useState<RequirementGenerationRouteMode>("mock");
  const [generationAvailability, setGenerationAvailability] =
    useState<RequirementGenerationAvailabilityBody | null>(
      initialGenerationAvailability,
    );
  const [isRefreshingAvailability, setIsRefreshingAvailability] =
    useState(false);
  const [activeFilter, setActiveFilter] = useState<RequirementReviewFilter>(
    defaultGenerateFilter,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(
    null,
  );
  const [selectedRequirementKeys, setSelectedRequirementKeys] = useState<
    Set<string>
  >(() => new Set());

  const filteredRequirements = useMemo(
    () => filterReviewRequirements(requirements, activeFilter),
    [activeFilter, requirements],
  );
  const visibleRequirements = useMemo(
    () => searchRequirements(filteredRequirements, searchQuery),
    [filteredRequirements, searchQuery],
  );
  const selectedRequirements = useMemo(
    () =>
      requirements.filter((requirement) =>
        selectedRequirementKeys.has(requirement.requirementKey),
      ),
    [requirements, selectedRequirementKeys],
  );
  const demoCount = useMemo(
    () => demoRequirements.length,
    [demoRequirements.length],
  );
  const mvpRequirements = useMemo(
    () => filterReviewRequirements(requirements, "mvp"),
    [requirements],
  );
  const allFilteredRequirementsSelected =
    visibleRequirements.length > 0 &&
    visibleRequirements.every((requirement) =>
      selectedRequirementKeys.has(requirement.requirementKey),
    );
  const realGenerationCapability =
    generationAvailability?.modes.real ?? createFallbackRealCapability();
  const realGenerationAvailable = realGenerationCapability.available;

  useEffect(() => {
    setGenerationAvailability(initialGenerationAvailability);
  }, [initialGenerationAvailability]);

  useEffect(() => {
    if (generationMode === "real" && !realGenerationAvailable) {
      setGenerationMode("mock");
    }
  }, [generationMode, realGenerationAvailable]);

  useEffect(() => {
    const feedbackReason = generationFeedback?.reason;
    if (
      generationFeedback?.code !== "real-generation-unavailable" ||
      !feedbackReason
    ) {
      return;
    }

    setGenerationAvailability((currentAvailability) => ({
      ok: true,
      checkedAt: new Date().toISOString(),
      modes: {
        mock:
          currentAvailability?.modes.mock ?? {
            available: true,
            message: "Prototype drafts are available locally.",
            mode: "mock",
            status: "available",
          },
        real: {
          available: false,
          message: generationFeedback.message,
          missingConfig: generationFeedback.missingConfig,
          mode: "real",
          status: feedbackReason,
        },
      },
    }));
  }, [generationFeedback]);

  function handleToggleRequirementSelection(requirementKey: string) {
    setSelectedRequirementKeys((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      if (nextSelection.has(requirementKey)) {
        nextSelection.delete(requirementKey);
      } else {
        nextSelection.add(requirementKey);
      }

      return nextSelection;
    });
  }

  function handleToggleAllFilteredRequirements() {
    setSelectedRequirementKeys((currentSelection) => {
      const nextSelection = new Set(currentSelection);
      const allFilteredSelected = visibleRequirements.every((requirement) =>
        nextSelection.has(requirement.requirementKey),
      );

      visibleRequirements.forEach((requirement) => {
        if (allFilteredSelected) {
          nextSelection.delete(requirement.requirementKey);
        } else {
          nextSelection.add(requirement.requirementKey);
        }
      });

      return nextSelection;
    });
  }

  async function handleGenerateAndAdvance(
    targetRequirements: ReviewRequirement[],
    targetLabel: string,
  ) {
    const generated = await onGenerateRows(
      targetRequirements,
      targetLabel,
      generationMode,
    );

    if (generated) {
      router.push(getPhase1StepPath(projectId, "review"));
    }
  }

  async function handleRefreshGenerationAvailability() {
    setIsRefreshingAvailability(true);

    try {
      const response = await fetch(
        "/api/requirements/generation-availability?refresh=1",
        {
          cache: "no-store",
        },
      );
      const responseBody = (await response.json().catch(() => null)) as
        | RequirementGenerationAvailabilityBody
        | null;

      if (response.ok && responseBody?.ok) {
        setGenerationAvailability(responseBody);
        return;
      }

      setGenerationAvailability((currentAvailability) => ({
        ok: true,
        checkedAt: new Date().toISOString(),
        modes: {
          mock:
            currentAvailability?.modes.mock ?? {
              available: true,
              message: "Prototype drafts are available locally.",
              mode: "mock",
              status: "available",
            },
          real: createUnavailableRealCapability(
            "check-failed",
            "Grounded real generation could not be confirmed right now. You can continue with prototype drafts and recheck later.",
          ),
        },
      }));
    } finally {
      setIsRefreshingAvailability(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="phase-screen-intro phase-screen-intro-compact">
        <p className="phase-overline">Step 2</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--shell-muted)]">
          Run the demo slice first. Treat every other control here as an expert
          override.
        </p>
      </div>

      <GenerationModeSelector
        availability={realGenerationCapability}
        feedbackTone={generationFeedback?.tone ?? null}
        isRefreshingAvailability={isRefreshingAvailability}
        mode={generationMode}
        onModeChange={setGenerationMode}
        onRefreshAvailability={handleRefreshGenerationAvailability}
      />

      <GenerateWorkflowStep
        allFilteredRequirementsSelected={allFilteredRequirementsSelected}
        allRequirements={requirements}
        demoCount={demoCount}
        feedback={generationFeedback}
        filter={activeFilter}
        generatedCount={
          requirements.filter(
            (requirement) =>
              requirement.generatedOutput.state === "mock-generated-draft",
          ).length
        }
        isGenerating={isGenerating}
        mvpCount={mvpRequirements.length}
        onFilterChange={(filter) => {
          setActiveFilter(filter);
          setSelectedRowNumber(null);
        }}
        onGenerateDemoRows={() =>
          handleGenerateAndAdvance(demoRequirements, "demo rows")
        }
        onGenerateMvpRows={() =>
          handleGenerateAndAdvance(mvpRequirements, "MVP rows")
        }
        onGenerateSelectedRows={() =>
          handleGenerateAndAdvance(selectedRequirements, "selected rows")
        }
        onGoToReview={() => router.push(getPhase1StepPath(projectId, "review"))}
        onSearchChange={setSearchQuery}
        onSelectRequirement={(requirement) =>
          setSelectedRowNumber(requirement.sourceRowNumber)
        }
        onToggleAllFilteredRequirements={handleToggleAllFilteredRequirements}
        onToggleRequirementSelection={handleToggleRequirementSelection}
        runState={mockGenerationRun}
        searchQuery={searchQuery}
        selectedRequirementKeys={selectedRequirementKeys}
        selectedRowNumber={selectedRowNumber}
        selectedRowsCount={selectedRequirements.length}
        showFrame={false}
        visibleRequirements={visibleRequirements}
      />

      {lastGenerationMode === "real" && generationMode === "mock" ? (
        <p className="text-sm leading-6 text-[color:var(--shell-muted)]">
          Last successful run used grounded real generation. You are currently
          set to prototype drafts for a faster local pass.
        </p>
      ) : null}
    </section>
  );
}

function ReviewScreen({
  approvedCount,
  generatedCount,
  generatedReviewableRequirements,
  onGenerateDemoRows,
  onOpenScript,
  onReviewAction,
  projectId,
}: {
  approvedCount: number;
  generatedCount: number;
  generatedReviewableRequirements: ReviewRequirement[];
  onGenerateDemoRows: () => Promise<boolean>;
  onOpenScript: () => void;
  onReviewAction: (
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) => void;
  projectId: string;
}) {
  const router = useRouter();
  const [selectedRequirementKey, setSelectedRequirementKey] = useState<
    string | null
  >(generatedReviewableRequirements[0]?.requirementKey ?? null);

  const reviewQueue = generatedReviewableRequirements;
  const activeRequirementKey =
    selectedRequirementKey &&
    reviewQueue.some(
      (requirement) => requirement.requirementKey === selectedRequirementKey,
    )
      ? selectedRequirementKey
      : (reviewQueue[0]?.requirementKey ?? null);
  const currentRequirement =
    reviewQueue.find(
      (requirement) => requirement.requirementKey === activeRequirementKey,
    ) ??
    reviewQueue[0] ??
    null;
  const activeQueueIndex = currentRequirement
    ? reviewQueue.findIndex(
        (requirement) =>
          requirement.requirementKey === currentRequirement.requirementKey,
      )
    : -1;

  function handleSelectNextReviewRequirement(
    requirement: ReviewRequirement | null,
  ) {
    if (!requirement) {
      setSelectedRequirementKey(reviewQueue[0]?.requirementKey ?? null);
      return;
    }

    const remainingQueue = reviewQueue.filter(
      (entry) => entry.requirementKey !== requirement.requirementKey,
    );
    const nextRequirement =
      remainingQueue.find(
        (entry) => entry.sourceRowNumber > requirement.sourceRowNumber,
      ) ??
      remainingQueue[0] ??
      null;

    setSelectedRequirementKey(nextRequirement?.requirementKey ?? null);
  }

  function handleSelectPreviousReviewRequirement(
    requirement: ReviewRequirement | null,
  ) {
    if (reviewQueue.length === 0) {
      setSelectedRequirementKey(null);
      return;
    }

    if (!requirement) {
      setSelectedRequirementKey(reviewQueue[0]?.requirementKey ?? null);
      return;
    }

    const currentIndex = reviewQueue.findIndex(
      (entry) => entry.requirementKey === requirement.requirementKey,
    );

    if (currentIndex <= 0) {
      setSelectedRequirementKey(reviewQueue[0]?.requirementKey ?? null);
      return;
    }

    setSelectedRequirementKey(
      reviewQueue[currentIndex - 1]?.requirementKey ?? null,
    );
  }

  function handleGuidedReviewAction(
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) {
    onReviewAction(requirement, action);

    if (
      action.type === "approve" ||
      action.type === "flag" ||
      action.type === "skip"
    ) {
      handleSelectNextReviewRequirement(requirement);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="phase-screen-intro phase-screen-intro-compact">
        <p className="phase-overline">Step 3</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--shell-muted)]">
          Keep the current requirement in view, make the consultant decision
          quickly, and let the queue stay secondary.
        </p>
      </div>

      <ReviewWorkflowStep
        activeQueueIndex={activeQueueIndex}
        approvedCount={approvedCount}
        currentRequirement={currentRequirement}
        generatedCount={generatedCount}
        onGenerateDemoRows={async () => {
          const generated = await onGenerateDemoRows();

          if (generated) {
            router.refresh();
          }
        }}
        onGoToGenerate={() =>
          router.push(getPhase1StepPath(projectId, "generate"))
        }
        onOpenScript={onOpenScript}
        onReviewAction={handleGuidedReviewAction}
        onSelectPrevious={handleSelectPreviousReviewRequirement}
        onSelectQueueRequirement={(requirement) =>
          setSelectedRequirementKey(requirement.requirementKey)
        }
        onSelectNext={handleSelectNextReviewRequirement}
        reviewQueue={reviewQueue}
        showFrame={false}
      />
    </section>
  );
}

function GenerationModeSelector({
  availability,
  feedbackTone,
  isRefreshingAvailability,
  mode,
  onModeChange,
  onRefreshAvailability,
}: {
  availability: RequirementGenerationModeCapability;
  feedbackTone: "neutral" | "success" | "error" | null;
  isRefreshingAvailability: boolean;
  mode: RequirementGenerationRouteMode;
  onModeChange: (mode: RequirementGenerationRouteMode) => void;
  onRefreshAvailability: () => Promise<void>;
}) {
  const realModeDisabled = !availability.available;

  return (
    <section className="theme-shell-card rounded-[1.35rem] p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p className="phase-overline">Generation mode</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--shell-muted)]">
            Prototype mode is the default. Grounded real mode only matters when
            the server path is actually reachable.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onModeChange("mock")}
            aria-pressed={mode === "mock"}
            className={`focus-premium rounded-full border px-4 py-2 text-sm font-bold transition ${
              mode === "mock"
                ? "theme-shell-card-brand"
                : "theme-shell-card-soft hover:bg-[color:var(--shell-soft-surface-hover)]"
            }`}
          >
            Prototype drafts
          </button>
          <button
            type="button"
            onClick={() => onModeChange("real")}
            disabled={realModeDisabled}
            aria-pressed={mode === "real"}
            aria-disabled={realModeDisabled}
            className={`focus-premium rounded-full border px-4 py-2 text-sm font-bold transition ${
              mode === "real"
                ? "theme-shell-card-slate"
                : "theme-shell-card-soft hover:bg-[color:var(--shell-soft-surface-hover)]"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            Grounded real mode
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="theme-shell-card-soft rounded-[1.1rem] px-4 py-3">
          <p className="text-sm leading-6 text-[color:var(--shell-muted)]">
            Current mode:{" "}
            <span className="font-semibold text-[color:var(--shell-ink)]">
              {mode === "mock" ? "Prototype drafts" : "Grounded real generation"}
            </span>
            {feedbackTone === "error" && mode === "real"
              ? ". Real mode failed safely, so prototype generation is still available."
              : "."}
          </p>
          {!availability.available ? (
            <p className="mt-2 text-sm leading-6 text-[color:var(--shell-muted)]">
              {availability.message}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-start lg:justify-end">
          {!availability.available ? (
            <button
              type="button"
              onClick={() => void onRefreshAvailability()}
              disabled={isRefreshingAvailability}
              className="focus-premium theme-shell-button-secondary rounded-full border px-4 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshingAvailability ? "Rechecking..." : "Recheck real access"}
            </button>
          ) : (
            <span className="theme-shell-card-brand rounded-full px-4 py-2 text-xs font-bold">
              Real mode available
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function createFallbackRealCapability(): RequirementGenerationModeCapability {
  return createUnavailableRealCapability(
    "check-failed",
    "Grounded real generation could not be confirmed right now. You can continue with prototype drafts and recheck later.",
  );
}

function createUnavailableRealCapability(
  reason: RequirementGenerationUnavailableReason,
  message: string,
  missingConfig?: string[],
): RequirementGenerationModeCapability {
  return {
    available: false,
    message,
    missingConfig,
    mode: "real",
    status: reason,
  };
}

function searchRequirements(
  requirements: ReviewRequirement[],
  searchQuery: string,
): ReviewRequirement[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return requirements;
  }

  return requirements.filter((requirement) =>
    [
      requirement.requirementId,
      requirement.requirementDescription,
      requirement.l2Process,
      requirement.l3Process,
      requirement.operation,
      requirement.reviewStatus,
      requirement.sourceComment,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}
