"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  filterReviewRequirements,
  type RequirementReviewAction,
  type RequirementReviewFilter,
  type ReviewRequirement,
} from "@/lib/requirements/review";
import type { RequirementGenerationRouteMode } from "@/lib/requirements/generation-api";
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
  step,
}: {
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
        <section className="grid gap-5">
          <div className="phase-screen-intro">
            <p className="phase-overline">Step 4</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[color:var(--shell-ink)]">
              Shape the consultant-facing narrative
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--shell-muted)]">
              Refine the narrative, section order, notes, and traceability
              before the final Phase 1 handoff.
            </p>
          </div>

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
            disabled={Boolean(demoScriptAssembly.emptyState)}
            helper={
              demoScriptAssembly.emptyState
                ? "Approve at least one generated row to unlock the export step."
                : `${demoScriptAssembly.approvedRequirementCount} approved requirements are ready for export.`
            }
            label="Continue to export"
            onClick={() =>
              router.push(getPhase1StepPath(project.projectId, "export"))
            }
          />
        </section>
      ) : null}

      {step === "export" ? (
        <section className="grid gap-5">
          <div className="phase-screen-intro">
            <p className="phase-overline">Step 5</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[color:var(--shell-ink)]">
              Export the Phase 1 demo document
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--shell-muted)]">
              Finalize the consultant-facing deliverable and download the
              Markdown handoff once the script is ready.
            </p>
          </div>

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
  const [sourcePreviewExpanded, setSourcePreviewExpanded] = useState(
    currentSourceMetadata.sourceKind !== "fixture",
  );
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
      <div className="phase-screen-intro">
        <p className="phase-overline">Step 1</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[color:var(--shell-ink)]">
          Confirm the source before you generate anything
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--shell-muted)]">
          Keep the source step narrow: validate the active workbook, replace it
          only when needed, and move forward once the parsed rows look right.
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
  isGenerating,
  lastGenerationMode,
  mockGenerationRun,
  projectId,
  requirements,
  onGenerateRows,
}: {
  demoRequirements: ReviewRequirement[];
  generationFeedback: ReturnType<typeof usePhase1Project>["generationFeedback"];
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

  return (
    <section className="grid gap-5">
      <div className="phase-screen-intro">
        <p className="phase-overline">Step 2</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[color:var(--shell-ink)]">
          Generate the first safe draft from the right slice
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--shell-muted)]">
          Lead with the recommended demo rows, keep custom row selection as the
          expert path, and move directly into review once drafts exist.
        </p>
      </div>

      <GenerationModeSelector
        feedbackTone={generationFeedback?.tone ?? null}
        mode={generationMode}
        onModeChange={setGenerationMode}
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
      <div className="phase-screen-intro">
        <p className="phase-overline">Step 3</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[color:var(--shell-ink)]">
          Review generated rows inside the main workspace
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--shell-muted)]">
          This is the core Phase 1 surface: stay in the queue, make the
          consultant decision quickly, and only open extra evidence when it
          changes the judgment.
        </p>
      </div>

      <ReviewWorkflowStep
        activeQueueIndex={activeQueueIndex}
        approvedCount={approvedCount}
        currentRequirement={currentRequirement}
        generatedCount={generatedCount}
        generatedReviewableCount={generatedReviewableRequirements.length}
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
        selectedRequirementKeys={new Set()}
        showFrame={false}
      />
    </section>
  );
}

function GenerationModeSelector({
  feedbackTone,
  mode,
  onModeChange,
}: {
  feedbackTone: "neutral" | "success" | "error" | null;
  mode: RequirementGenerationRouteMode;
  onModeChange: (mode: RequirementGenerationRouteMode) => void;
}) {
  return (
    <section className="phase-screen-intro">
      <p className="phase-overline">Generation mode</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => onModeChange("mock")}
          aria-pressed={mode === "mock"}
          className={`focus-premium rounded-[1.25rem] border p-4 text-left transition ${
            mode === "mock"
              ? "theme-shell-card-brand"
              : "theme-shell-card-soft hover:bg-[color:var(--shell-soft-surface-hover)]"
          }`}
        >
          <p className="theme-shell-title text-base font-bold">
            Prototype drafts
          </p>
          <p className="theme-shell-body mt-2 text-sm leading-6">
            Best local default. Generates consultant-review drafts immediately
            and keeps the demo workflow moving even when grounded real mode is
            unavailable.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onModeChange("real")}
          aria-pressed={mode === "real"}
          className={`focus-premium rounded-[1.25rem] border p-4 text-left transition ${
            mode === "real"
              ? "theme-shell-card-slate"
              : "theme-shell-card-soft hover:bg-[color:var(--shell-soft-surface-hover)]"
          }`}
        >
          <p className="theme-shell-title text-base font-bold">
            Grounded real generation
          </p>
          <p className="theme-shell-body mt-2 text-sm leading-6">
            Uses the server-side MCP + Bedrock path when available. If local
            real access is not configured yet, the step returns a precise
            unavailable message without blocking prototype mode.
          </p>
        </button>
      </div>

      <p className="mt-4 text-sm leading-6 text-[color:var(--shell-muted)]">
        Current mode:{" "}
        <span className="font-semibold text-[color:var(--shell-ink)]">
          {mode === "mock" ? "Prototype drafts" : "Grounded real generation"}
        </span>
        {feedbackTone === "error" && mode === "real"
          ? ". Real mode failed safely. You can switch back to prototype drafts and continue reviewing locally."
          : "."}
      </p>
    </section>
  );
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
