"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  assessRequirementSupport,
  mockGenerationStageLabels,
  type MockGenerationStage,
} from "@/lib/requirements/generation";
import {
  assembleDemoScript,
  type DemoScriptDraftAction,
} from "@/lib/requirements/demo-script";
import {
  buildReviewRequirements,
  filterReviewRequirements,
  requirementReviewFilters,
  summarizeReviewRequirements,
  updateRequirementsReviewState,
  updateRequirementsDemoScriptDraft,
  type RequirementReviewAction,
  type RequirementReviewFilter,
  type RequirementReviewStatus,
  type ReviewProjectMetadata,
  type ReviewRequirement,
} from "@/lib/requirements/review";
import {
  evaluateRequirementValidation,
  requirementValidationSignalLabels,
  type RequirementValidationSummary,
} from "@/lib/requirements/validation";
import {
  assertRequirementsWorkbookFilename,
  parseRequirementsWorkbook,
  type ParsedRequirement,
} from "@/lib/requirements/parser";
import {
  createRequirementsWorkspaceState,
  loadRequirementsWorkspaceState,
  loadRequirementsWorkspaceStateForSource,
  saveRequirementsWorkspaceState,
  type RequirementsWorkspaceState,
} from "@/lib/requirements/workspace-state";
import {
  createFixtureSourceMetadata,
  createUploadSourceMetadata,
  type RequirementsSourceMetadata,
} from "@/lib/requirements/source";
import { createFixtureWorkspaceState } from "@/lib/requirements/workspace-state";
import type {
  RequirementGenerationRouteBody,
  RequirementGenerationRouteMode,
} from "@/lib/requirements/generation-api";
import DemoScriptEditingPanel, {
  DemoScriptExportPanel,
} from "./demo-script-panel";
import {
  getNextAction,
  getWorkflowProgress,
  type GuidedWorkflowSnapshot,
  type GuidedWorkflowStep,
} from "./requirements-workflow";

const filterLabels: Record<RequirementReviewFilter, string> = {
  all: "All rows",
  demo: "Demo rows",
  mvp: "MVP rows",
  pending: "Pending rows",
  review: "Review rows",
  approved: "Approved rows",
  skipped: "Skipped rows",
};

const filterDescriptions: Record<RequirementReviewFilter, string> = {
  all: "Complete source inventory.",
  demo: "Rows marked for customer demo.",
  mvp: "Rows flagged for the MVP slice.",
  pending: "Rows still waiting for review.",
  review: "Rows needing consultant judgment.",
  approved: "Rows ready for the script.",
  skipped: "Rows left out of this slice.",
};

const statusStyles: Record<RequirementReviewStatus, string> = {
  pending: "border-white/15 bg-white/[0.06] text-[#d7e9e4]",
  review: "border-[#c8953f]/45 bg-[#c8953f]/12 text-[#ead19a]",
  approved: "border-[#2f8f8a]/45 bg-[#2f8f8a]/12 text-[#d2eee7]",
  skipped: "border-white/10 bg-black/20 text-[#8ea7a0]",
};

const reviewStorageChangeEventName = "cm-mes-advisor:review-state-change";

type MockGenerationStageStatus = "waiting" | "running" | "complete";

interface MockGenerationStageState {
  label: MockGenerationStage;
  status: MockGenerationStageStatus;
}

interface MockGenerationRunState {
  selectedCount: number;
  generatedCount: number;
  stages: MockGenerationStageState[];
}

interface GenerationFeedback {
  tone: "neutral" | "success" | "error";
  message: string;
}

interface SourceFeedback {
  tone: "neutral" | "success" | "error";
  message: string;
}

interface RequirementsReviewWorkspaceProps {
  projectMetadata: ReviewProjectMetadata;
  requirements: ParsedRequirement[];
}

export default function RequirementsReviewWorkspace({
  projectMetadata,
  requirements,
}: RequirementsReviewWorkspaceProps) {
  const fixtureSource = useMemo(
    () => createFixtureSourceMetadata(projectMetadata),
    [projectMetadata],
  );
  const fallbackWorkspaceState = useMemo(
    () => createFixtureWorkspaceState(fixtureSource, requirements),
    [fixtureSource, requirements],
  );
  const [workspaceState, setWorkspaceState] =
    useState<RequirementsWorkspaceState>(fallbackWorkspaceState);
  const [sourceFeedback, setSourceFeedback] = useState<SourceFeedback | null>(
    null,
  );
  const [activeFilter, setActiveFilter] =
    useState<RequirementReviewFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(
    null,
  );
  const [selectedRequirementKeys, setSelectedRequirementKeys] = useState<
    Set<string>
  >(() => new Set());
  const [mockGenerationRun, setMockGenerationRun] =
    useState<MockGenerationRunState>(() => createIdleGenerationRun());
  const [generationFeedback, setGenerationFeedback] =
    useState<GenerationFeedback | null>(null);
  const [lastGenerationMode, setLastGenerationMode] =
    useState<RequirementGenerationRouteMode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeWorkflowStep, setActiveWorkflowStep] =
    useState<GuidedWorkflowStep>("source");
  const [reviewedScriptStageKey, setReviewedScriptStageKey] = useState<
    string | null
  >(null);

  useEffect(() => {
    const syncWorkspaceState = () => {
      setWorkspaceState(
        loadRequirementsWorkspaceState(
          window.localStorage,
          fallbackWorkspaceState,
        ),
      );
    };

    syncWorkspaceState();
    window.addEventListener(reviewStorageChangeEventName, syncWorkspaceState);
    return () => {
      window.removeEventListener(
        reviewStorageChangeEventName,
        syncWorkspaceState,
      );
    };
  }, [fallbackWorkspaceState]);

  useEffect(() => {
    setSelectedRowNumber(null);
    setSelectedRequirementKeys(new Set());
    setMockGenerationRun(createIdleGenerationRun());
    setGenerationFeedback(null);
    setLastGenerationMode(null);
    setReviewedScriptStageKey(null);
  }, [workspaceState.source.sourceId]);

  const reviewRequirements = useMemo(
    () =>
      buildReviewRequirements(
        workspaceState.parsedRequirements,
        workspaceState.reviewState.requirements,
      ),
    [
      workspaceState.parsedRequirements,
      workspaceState.reviewState.requirements,
    ],
  );
  const demoScriptAssembly = useMemo(
    () =>
      assembleDemoScript(
        reviewRequirements,
        workspaceState.reviewState.demoScriptDraft,
      ),
    [reviewRequirements, workspaceState.reviewState.demoScriptDraft],
  );
  const summary = useMemo(
    () => summarizeReviewRequirements(reviewRequirements),
    [reviewRequirements],
  );
  const filteredRequirements = useMemo(
    () => filterReviewRequirements(reviewRequirements, activeFilter),
    [activeFilter, reviewRequirements],
  );
  const visibleRequirements = useMemo(
    () => searchRequirements(filteredRequirements, searchQuery),
    [filteredRequirements, searchQuery],
  );
  const selectedRequirements = useMemo(
    () =>
      reviewRequirements.filter((requirement) =>
        selectedRequirementKeys.has(requirement.requirementKey),
      ),
    [reviewRequirements, selectedRequirementKeys],
  );
  const selectedRequirement =
    reviewRequirements.find(
      (requirement) => requirement.sourceRowNumber === selectedRowNumber,
    ) ?? null;
  const demoRequirements = useMemo(
    () => reviewRequirements.filter((requirement) => requirement.demo),
    [reviewRequirements],
  );
  const mvpRequirements = useMemo(
    () => reviewRequirements.filter((requirement) => requirement.mvp),
    [reviewRequirements],
  );
  const generatedRequirements = useMemo(
    () =>
      reviewRequirements.filter(
        (requirement) =>
          requirement.generatedOutput.state === "mock-generated-draft",
      ),
    [reviewRequirements],
  );
  const generatedReviewableRequirements = useMemo(
    () =>
      generatedRequirements.filter(
        (requirement) => requirement.reviewStatus === "pending",
      ),
    [generatedRequirements],
  );
  const currentReviewRequirement =
    selectedRequirement?.generatedOutput.state === "mock-generated-draft" &&
    selectedRequirement.reviewStatus === "pending"
      ? selectedRequirement
      : (generatedReviewableRequirements[0] ?? null);
  const allFilteredRequirementsSelected =
    visibleRequirements.length > 0 &&
    visibleRequirements.every((requirement) =>
      selectedRequirementKeys.has(requirement.requirementKey),
    );
  const sourceMetadata = workspaceState.source;
  const currentProjectMetadata = workspaceState.reviewState.project;
  const scriptStageKey = `${summary.approvedCount}:${demoScriptAssembly.approvedStepCount}:${demoScriptAssembly.emptyState ?? "ready"}`;

  useEffect(() => {
    if (activeWorkflowStep === "script" && !demoScriptAssembly.emptyState) {
      setReviewedScriptStageKey(scriptStageKey);
    }
  }, [activeWorkflowStep, demoScriptAssembly.emptyState, scriptStageKey]);

  const workflowSnapshot: GuidedWorkflowSnapshot = {
    sourceRowCount: reviewRequirements.length,
    demoCount: summary.demoCount,
    mvpCount: summary.mvpCount,
    generatedCount: generatedRequirements.length,
    generatedReviewableCount: generatedReviewableRequirements.length,
    approvedCount: summary.approvedCount,
    approvedStepCount: demoScriptAssembly.approvedStepCount,
    selectedCount: selectedRequirements.length,
    scriptVisited:
      reviewedScriptStageKey === scriptStageKey &&
      demoScriptAssembly.emptyState === null,
    exportReady: !demoScriptAssembly.emptyState,
  };
  const workflowProgress = getWorkflowProgress(workflowSnapshot);
  const nextAction = getNextAction(workflowSnapshot);

  function goToWorkflowStep(step: GuidedWorkflowStep) {
    setActiveWorkflowStep(step);
    window.setTimeout(() => {
      const workflowTop = document.getElementById("guided-workflow-top");

      if (!workflowTop) {
        return;
      }

      window.scrollTo({
        behavior: "auto",
        top: workflowTop.getBoundingClientRect().top + window.scrollY - 16,
      });
    }, 0);
  }

  function handleReviewAction(
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) {
    const currentState = loadRequirementsWorkspaceState(
      window.localStorage,
      fallbackWorkspaceState,
    );
    const nextState = {
      ...currentState,
      reviewState: updateRequirementsReviewState(
        currentState.reviewState,
        requirement,
        action,
      ),
    };

    saveRequirementsWorkspaceState(window.localStorage, nextState);
    window.dispatchEvent(new Event(reviewStorageChangeEventName));
  }

  function handleDemoScriptAction(action: DemoScriptDraftAction) {
    const currentState = loadRequirementsWorkspaceState(
      window.localStorage,
      fallbackWorkspaceState,
    );
    const nextState = {
      ...currentState,
      reviewState: updateRequirementsDemoScriptDraft(
        currentState.reviewState,
        action,
      ),
    };

    saveRequirementsWorkspaceState(window.localStorage, nextState);
    window.dispatchEvent(new Event(reviewStorageChangeEventName));
  }

  async function handleUploadWorkbook(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    setSourceFeedback(null);

    try {
      assertRequirementsWorkbookFilename(file.name);
      const workbookBuffer = await file.arrayBuffer();
      const parsedRequirements =
        await parseRequirementsWorkbook(workbookBuffer);
      const sourceMetadata = createUploadSourceMetadata(
        file.name,
        workbookBuffer,
      );
      const nextState =
        loadRequirementsWorkspaceStateForSource(
          window.localStorage,
          sourceMetadata.sourceId,
          createRequirementsWorkspaceState(sourceMetadata, parsedRequirements),
        ) ??
        createRequirementsWorkspaceState(sourceMetadata, parsedRequirements);
      const hydratedState: RequirementsWorkspaceState = {
        ...nextState,
        source: sourceMetadata,
        parsedRequirements,
      };

      saveRequirementsWorkspaceState(window.localStorage, hydratedState);
      setSourceFeedback({
        tone: "success",
        message: `Loaded ${file.name}. Prototype drafts stay consultant-review oriented unless real mode is configured later.`,
      });
      goToWorkflowStep("generate");
      window.dispatchEvent(new Event(reviewStorageChangeEventName));
    } catch (error) {
      setSourceFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "The uploaded workbook could not be parsed.",
      });
    }
  }

  function handleRestoreFixtureSource() {
    const fixtureWorkspaceState =
      loadRequirementsWorkspaceStateForSource(
        window.localStorage,
        fallbackWorkspaceState.source.sourceId,
        fallbackWorkspaceState,
      ) ?? fallbackWorkspaceState;

    setSourceFeedback({
      tone: "success",
      message:
        "Restored the committed Customer X fixture and its saved review state.",
    });
    saveRequirementsWorkspaceState(window.localStorage, fixtureWorkspaceState);
    goToWorkflowStep("generate");
    window.dispatchEvent(new Event(reviewStorageChangeEventName));
  }

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

  async function handleGenerateRows(
    targetRequirements: ReviewRequirement[],
    targetLabel: string,
  ) {
    if (targetRequirements.length === 0 || isGenerating) {
      setMockGenerationRun(createIdleGenerationRun());
      return;
    }

    setIsGenerating(true);
    setGenerationFeedback(null);
    setMockGenerationRun({
      selectedCount: targetRequirements.length,
      generatedCount: 0,
      stages: mockGenerationStageLabels.map((label, index) => ({
        label,
        status: index === 0 ? "running" : "waiting",
      })),
    });

    try {
      const response = await fetch("/api/requirements/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requirements: targetRequirements.map(toGenerationRequestRequirement),
        }),
      });

      const responseBody = (await response
        .json()
        .catch(() => null)) as RequirementGenerationRouteBody | null;

      if (!response.ok || !responseBody || !responseBody.ok) {
        setLastGenerationMode(null);
        const message =
          responseBody && !responseBody.ok
            ? responseBody.error.message
            : `Server generation failed with status ${response.status}.`;
        setGenerationFeedback({
          tone: "error",
          message:
            message ||
            "Server generation failed. Your local review state was not changed.",
        });
        setMockGenerationRun({
          selectedCount: targetRequirements.length,
          generatedCount: 0,
          stages: mockGenerationStageLabels.map((label) => ({
            label,
            status: "waiting",
          })),
        });
        return;
      }

      const draftsByRequirementKey = new Map(
        responseBody.drafts.map((draft) => [
          draft.requirement.requirementKey,
          draft,
        ]),
      );
      const targetRequirementKeys = targetRequirements.map(
        (requirement) => requirement.requirementKey,
      );
      const responseRequirementKeys = responseBody.drafts.map(
        (draft) => draft.requirement.requirementKey,
      );
      const responseMatchesSelection =
        responseBody.drafts.length === targetRequirements.length &&
        targetRequirementKeys.every((requirementKey, index) => {
          const draftKey = responseRequirementKeys[index];
          return requirementKey === draftKey;
        });

      if (!responseMatchesSelection) {
        setGenerationFeedback({
          tone: "error",
          message:
            "Server generation returned drafts that did not match the selected rows. No local review state was changed.",
        });
        setMockGenerationRun({
          selectedCount: targetRequirements.length,
          generatedCount: 0,
          stages: mockGenerationStageLabels.map((label) => ({
            label,
            status: "waiting",
          })),
        });
        return;
      }

      const currentState = loadRequirementsWorkspaceState(
        window.localStorage,
        fallbackWorkspaceState,
      );
      const nextReviewState = targetRequirements.reduce(
        (state, requirement) => {
          const draft = draftsByRequirementKey.get(requirement.requirementKey);

          if (!draft) {
            return state;
          }

          return updateRequirementsReviewState(state, requirement, {
            type: "storeMockGeneratedDraft",
            generatedOutput: draft,
          });
        },
        currentState.reviewState,
      );

      saveRequirementsWorkspaceState(window.localStorage, {
        ...currentState,
        reviewState: nextReviewState,
      });
      setLastGenerationMode(responseBody.mode);
      setSelectedRequirementKeys(new Set(targetRequirementKeys));
      setSelectedRowNumber(targetRequirements[0]?.sourceRowNumber ?? null);
      goToWorkflowStep("review");
      setMockGenerationRun({
        selectedCount: targetRequirements.length,
        generatedCount: responseBody.drafts.length,
        stages: mockGenerationStageLabels.map((label) => ({
          label,
          status: "complete",
        })),
      });
      setGenerationFeedback({
        tone: "success",
        message:
          responseBody.mode === "real"
            ? `Generated ${responseBody.drafts.length} grounded draft(s) for ${targetLabel}.`
            : `Generated ${responseBody.drafts.length} prototype draft(s) for ${targetLabel}.`,
      });
      window.dispatchEvent(new Event(reviewStorageChangeEventName));
    } catch {
      setLastGenerationMode(null);
      setGenerationFeedback({
        tone: "error",
        message:
          "Server generation could not be reached. No local review state was changed.",
      });
      setMockGenerationRun({
        selectedCount: targetRequirements.length,
        generatedCount: 0,
        stages: mockGenerationStageLabels.map((label) => ({
          label,
          status: "waiting",
        })),
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateSelectedRows() {
    await handleGenerateRows(selectedRequirements, "selected rows");
  }

  async function handleGenerateDemoRows() {
    await handleGenerateRows(demoRequirements, "demo rows");
  }

  async function handleGenerateMvpRows() {
    await handleGenerateRows(mvpRequirements, "MVP rows");
  }

  function handleSelectNextReviewRequirement(
    currentRequirement: ReviewRequirement | null,
  ) {
    if (!currentRequirement) {
      setSelectedRowNumber(
        generatedReviewableRequirements[0]?.sourceRowNumber ??
          generatedRequirements[0]?.sourceRowNumber ??
          null,
      );
      return;
    }

    const remainingQueue = generatedReviewableRequirements.filter(
      (requirement) =>
        requirement.requirementKey !== currentRequirement.requirementKey,
    );
    const nextRequirement =
      remainingQueue.find(
        (requirement) =>
          requirement.sourceRowNumber > currentRequirement.sourceRowNumber,
      ) ??
      remainingQueue[0] ??
      generatedRequirements.find(
        (requirement) =>
          requirement.requirementKey !== currentRequirement.requirementKey,
      ) ??
      null;

    setSelectedRowNumber(nextRequirement?.sourceRowNumber ?? null);
  }

  function handleGuidedReviewAction(
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) {
    handleReviewAction(requirement, action);

    if (
      action.type === "approve" ||
      action.type === "flag" ||
      action.type === "skip"
    ) {
      handleSelectNextReviewRequirement(requirement);
    }
  }

  return (
    <div id="workspace" className="animate-enter-slow grid min-w-0 gap-6">
      <GuidedActionHeader
        activeStep={activeWorkflowStep}
        generationMode={lastGenerationMode}
        nextAction={nextAction}
        onPrimaryAction={() => goToWorkflowStep(nextAction.step)}
        onStepChange={goToWorkflowStep}
        progress={workflowProgress}
      />

      <section className="grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <WorkflowRail
          activeStep={activeWorkflowStep}
          onStepChange={goToWorkflowStep}
          progress={workflowProgress}
        />

        <div className="min-w-0">
          {activeWorkflowStep === "source" ? (
            <GuidedStepFrame
              eyebrow="Step 1"
              title="Confirm the Excel source"
              summary="Start from one trusted workbook. Everything else in Phase 1 depends on this source being clear."
            >
              <WorkspaceSourcePanel
                feedback={sourceFeedback}
                generationMode={lastGenerationMode}
                onRestoreFixtureSource={handleRestoreFixtureSource}
                onUploadWorkbook={handleUploadWorkbook}
                sourceMetadata={sourceMetadata}
                sourceRowCount={currentProjectMetadata.sourceRowCount}
              />
              <GuidedStepFooter
                helper={`${summary.demoCount} demo rows and ${summary.mvpCount} MVP rows are available from this workbook.`}
                label="Continue to generation"
                onClick={() => goToWorkflowStep("generate")}
              />
            </GuidedStepFrame>
          ) : null}

          {activeWorkflowStep === "generate" ? (
            <GenerateWorkflowStep
              allFilteredRequirementsSelected={allFilteredRequirementsSelected}
              allRequirements={reviewRequirements}
              demoCount={summary.demoCount}
              feedback={generationFeedback}
              filter={activeFilter}
              isGenerating={isGenerating}
              mvpCount={summary.mvpCount}
              onFilterChange={(filter) => {
                setActiveFilter(filter);
                setSelectedRowNumber(null);
              }}
              onGenerateDemoRows={handleGenerateDemoRows}
              onGenerateMvpRows={handleGenerateMvpRows}
              onGenerateSelectedRows={handleGenerateSelectedRows}
              onSearchChange={setSearchQuery}
              onSelectRequirement={(requirement) =>
                setSelectedRowNumber(requirement.sourceRowNumber)
              }
              onToggleAllFilteredRequirements={
                handleToggleAllFilteredRequirements
              }
              onToggleRequirementSelection={handleToggleRequirementSelection}
              runState={mockGenerationRun}
              searchQuery={searchQuery}
              selectedRequirementKeys={selectedRequirementKeys}
              selectedRowNumber={selectedRowNumber}
              selectedRowsCount={selectedRequirements.length}
              visibleRequirements={visibleRequirements}
            />
          ) : null}

          {activeWorkflowStep === "review" ? (
            <ReviewWorkflowStep
              currentRequirement={currentReviewRequirement}
              approvedCount={summary.approvedCount}
              generatedCount={generatedRequirements.length}
              generatedReviewableCount={generatedReviewableRequirements.length}
              onGenerateDemoRows={handleGenerateDemoRows}
              onGoToGenerate={() => goToWorkflowStep("generate")}
              onOpenScript={() => goToWorkflowStep("script")}
              onReviewAction={handleGuidedReviewAction}
              onSelectNext={handleSelectNextReviewRequirement}
              selectedRequirementKeys={selectedRequirementKeys}
            />
          ) : null}

          {activeWorkflowStep === "script" ? (
            <GuidedStepFrame
              eyebrow="Step 4"
              title="Shape the demo script"
              summary="Approved requirement drafts become the in-app demo narrative. Edit the script before exporting."
            >
              <DemoScriptEditingPanel
                assembly={demoScriptAssembly}
                draft={workspaceState.reviewState.demoScriptDraft}
                onDraftAction={handleDemoScriptAction}
                onSwitchToReview={() => goToWorkflowStep("review")}
                projectMetadata={currentProjectMetadata}
              />
              <GuidedStepFooter
                disabled={Boolean(demoScriptAssembly.emptyState)}
                helper={
                  demoScriptAssembly.emptyState
                    ? "Approve at least one generated row to unlock the export step."
                    : `${demoScriptAssembly.approvedRequirementCount} approved requirements are ready for export.`
                }
                label="Continue to export"
                onClick={() => goToWorkflowStep("export")}
              />
            </GuidedStepFrame>
          ) : null}

          {activeWorkflowStep === "export" ? (
            <ExportWorkflowStep
              assembly={demoScriptAssembly}
              onGoToReview={() => goToWorkflowStep("review")}
              onGoToScript={() => goToWorkflowStep("script")}
              projectMetadata={currentProjectMetadata}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function GuidedActionHeader({
  activeStep,
  generationMode,
  nextAction,
  onPrimaryAction,
  onStepChange,
  progress,
}: {
  activeStep: GuidedWorkflowStep;
  generationMode: RequirementGenerationRouteMode | null;
  nextAction: ReturnType<typeof getNextAction>;
  onPrimaryAction: () => void;
  onStepChange: (step: GuidedWorkflowStep) => void;
  progress: ReturnType<typeof getWorkflowProgress>;
}) {
  return (
    <section
      id="guided-workflow-top"
      className="premium-panel-strong overflow-hidden rounded-2xl p-4 sm:p-5"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#2f8f8a]/35 bg-[#2f8f8a]/12 px-3 py-1 text-xs font-bold text-[#d2eee7]">
              Next best action
            </span>
            <span className="rounded-full border border-[#c8953f]/28 bg-[#c8953f]/10 px-3 py-1 text-xs font-bold text-[#ead19a]">
              {generationMode === "real"
                ? "Grounded generation mode"
                : "Prototype generation mode"}
            </span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-white sm:text-5xl">
            {nextAction.label}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#bdd7d0]">
            {nextAction.helper}
          </p>
        </div>

        <button
          type="button"
          onClick={onPrimaryAction}
          className="focus-premium rounded-2xl bg-[#2f8f8a] px-6 py-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(0,0,0,0.26)] transition hover:-translate-y-0.5 hover:bg-[#3b9d98]"
        >
          Open {nextAction.step}
        </button>
      </div>

      <div
        aria-label="Guided workflow progress"
        className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5"
      >
        {progress.map((stepState, index) => (
          <button
            key={stepState.step}
            type="button"
            onClick={() => onStepChange(stepState.step)}
            aria-current={activeStep === stepState.step ? "step" : undefined}
            className={`focus-premium rounded-2xl border p-3 text-left transition ${
              activeStep === stepState.step
                ? "border-[#2f8f8a]/60 bg-[#2f8f8a]/14 shadow-[0_10px_24px_rgba(0,0,0,0.2)]"
                : stepState.status === "blocked"
                  ? "border-white/8 bg-white/[0.025] text-[#76908a]"
                  : "border-white/10 bg-white/[0.055] hover:border-[#6fa8b8]/35 hover:bg-white/[0.08]"
            }`}
          >
            <span className="mono-label text-[0.56rem] text-[#8ea7a0]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="mt-2 block text-sm font-bold text-white">
              {stepState.label}
            </span>
            <span className="mt-1 block text-xs capitalize text-[#9fb9b2]">
              {stepState.status}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function WorkflowRail({
  activeStep,
  onStepChange,
  progress,
}: {
  activeStep: GuidedWorkflowStep;
  onStepChange: (step: GuidedWorkflowStep) => void;
  progress: ReturnType<typeof getWorkflowProgress>;
}) {
  return (
    <aside className="premium-panel sticky top-4 hidden h-fit rounded-2xl p-4 xl:block">
      <p className="mono-label text-[0.66rem] text-[#8fcac0]">
        Phase 1 journey
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white">
        One decision at a time
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#9fb9b2]">
        Finish the Excel-driven demo script without touching Phase 2.
      </p>

      <div className="mt-5 grid gap-2">
        {progress.map((stepState, index) => (
          <button
            key={stepState.step}
            type="button"
            onClick={() => onStepChange(stepState.step)}
            className={`focus-premium flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
              activeStep === stepState.step
                ? "border-[#2f8f8a]/55 bg-[#2f8f8a]/12"
                : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
            }`}
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-xs font-black ${
                stepState.status === "complete"
                  ? "bg-[#2f8f8a] text-white"
                  : stepState.status === "blocked"
                    ? "bg-white/[0.06] text-[#77928c]"
                    : "bg-[#6fa8b8]/12 text-[#c9dde3]"
              }`}
            >
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white">
                {stepState.label}
              </span>
              <span className="block text-xs capitalize text-[#9fb9b2]">
                {stepState.status}
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function GuidedStepFrame({
  children,
  eyebrow,
  summary,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  summary: string;
  title: string;
}) {
  return (
    <section className="premium-panel-strong min-w-0 rounded-2xl p-4 sm:p-5">
      <div className="mb-5 max-w-4xl">
        <p className="mono-label text-[0.68rem] text-[#8fcac0]">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#a9c5be]">{summary}</p>
      </div>
      {children}
    </section>
  );
}

function GuidedStepFooter({
  disabled,
  helper,
  label,
  onClick,
}: {
  disabled?: boolean;
  helper: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 rounded-xl border border-white/10 bg-black/22 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-6 text-[#bdd7d0]">{helper}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="focus-premium rounded-2xl bg-[#2f8f8a] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#3b9d98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#7f9992]"
      >
        {label}
      </button>
    </div>
  );
}

function GenerateWorkflowStep({
  allFilteredRequirementsSelected,
  allRequirements,
  demoCount,
  feedback,
  filter,
  isGenerating,
  mvpCount,
  onFilterChange,
  onGenerateDemoRows,
  onGenerateMvpRows,
  onGenerateSelectedRows,
  onSearchChange,
  onSelectRequirement,
  onToggleAllFilteredRequirements,
  onToggleRequirementSelection,
  runState,
  searchQuery,
  selectedRequirementKeys,
  selectedRowNumber,
  selectedRowsCount,
  visibleRequirements,
}: {
  allFilteredRequirementsSelected: boolean;
  allRequirements: ReviewRequirement[];
  demoCount: number;
  feedback: GenerationFeedback | null;
  filter: RequirementReviewFilter;
  isGenerating: boolean;
  mvpCount: number;
  onFilterChange: (filter: RequirementReviewFilter) => void;
  onGenerateDemoRows: () => void | Promise<void>;
  onGenerateMvpRows: () => void | Promise<void>;
  onGenerateSelectedRows: () => void | Promise<void>;
  onSearchChange: (query: string) => void;
  onSelectRequirement: (requirement: ReviewRequirement) => void;
  onToggleAllFilteredRequirements: () => void;
  onToggleRequirementSelection: (requirementKey: string) => void;
  runState: MockGenerationRunState;
  searchQuery: string;
  selectedRequirementKeys: Set<string>;
  selectedRowNumber: number | null;
  selectedRowsCount: number;
  visibleRequirements: ReviewRequirement[];
}) {
  return (
    <GuidedStepFrame
      eyebrow="Step 2"
      title="Generate safe first drafts"
      summary="Choose a preset and let the prototype create consultant-reviewable comments and demo steps. Demo rows are the recommended Phase 1 path."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <GenerationPresetCard
          count={demoCount}
          description="Best default for a client demo: rows already marked as demo-relevant."
          disabled={demoCount === 0 || isGenerating}
          label={isGenerating ? "Generating..." : "Generate demo rows"}
          onClick={onGenerateDemoRows}
          recommended
          title="Demo rows"
        />
        <GenerationPresetCard
          count={mvpCount}
          description="Use this when the team wants to align with the MVP slice instead."
          disabled={mvpCount === 0 || isGenerating}
          label={isGenerating ? "Generating..." : "Generate MVP rows"}
          onClick={onGenerateMvpRows}
          title="MVP rows"
        />
        <GenerationPresetCard
          count={selectedRowsCount}
          description="Power-user path for hand-picked rows from the expert table below."
          disabled={selectedRowsCount === 0 || isGenerating}
          label={
            selectedRowsCount > 0
              ? `Generate ${selectedRowsCount} selected`
              : "Select rows first"
          }
          onClick={onGenerateSelectedRows}
          title="Selected rows"
        />
      </div>

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${
            feedback.tone === "success"
              ? "border-[#2f8f8a]/45 bg-[#2f8f8a]/12 text-[#d2eee7]"
              : feedback.tone === "error"
                ? "border-[#c8953f]/45 bg-[#c8953f]/12 text-[#ead19a]"
                : "border-white/12 bg-white/[0.06] text-[#d8eee8]"
          }`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </div>
      ) : null}

      <details className="mt-4 rounded-xl border border-white/10 bg-black/18 p-4">
        <summary className="cursor-pointer text-sm font-bold text-white">
          Generation details
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {runState.stages.map((stage) => (
            <div
              key={stage.label}
              className={`rounded-2xl border p-4 ${
                stage.status === "complete"
                  ? "border-[#2f8f8a]/40 bg-[#2f8f8a]/10"
                  : stage.status === "running"
                    ? "pulse-glow border-[#6fa8b8]/45 bg-[#6fa8b8]/10"
                    : "border-white/10 bg-white/[0.045]"
              }`}
            >
              <p className="mono-label text-[0.58rem] text-[#8ea7a0]">
                {stage.status}
              </p>
              <p className="mt-2 text-sm font-bold text-[#effffb]">
                {stage.label}
              </p>
            </div>
          ))}
        </div>
      </details>

      <RequirementsExplorer
        allFilteredRequirementsSelected={allFilteredRequirementsSelected}
        allRequirements={allRequirements}
        filter={filter}
        onFilterChange={onFilterChange}
        onSearchChange={onSearchChange}
        onSelectRequirement={onSelectRequirement}
        onToggleAllFilteredRequirements={onToggleAllFilteredRequirements}
        onToggleRequirementSelection={onToggleRequirementSelection}
        searchQuery={searchQuery}
        selectedRequirementKeys={selectedRequirementKeys}
        selectedRowNumber={selectedRowNumber}
        visibleRequirements={visibleRequirements}
      />
    </GuidedStepFrame>
  );
}

function GenerationPresetCard({
  count,
  description,
  disabled,
  label,
  onClick,
  recommended,
  title,
}: {
  count: number;
  description: string;
  disabled: boolean;
  label: string;
  onClick: () => void | Promise<void>;
  recommended?: boolean;
  title: string;
}) {
  return (
    <article
      className={`rounded-2xl border p-5 ${
        recommended
          ? "border-[#2f8f8a]/55 bg-[#2f8f8a]/12 shadow-[0_14px_34px_rgba(0,0,0,0.2)]"
          : "border-white/10 bg-white/[0.045]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black text-white">{title}</p>
          {recommended ? (
            <p className="mt-1 text-xs font-bold text-[#d2eee7]">Recommended</p>
          ) : null}
        </div>
        <span className="font-mono text-4xl font-black tracking-[-0.06em] text-white">
          {count}
        </span>
      </div>
      <p className="mt-4 min-h-14 text-sm leading-6 text-[#a9c5be]">
        {description}
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`focus-premium mt-5 w-full rounded-2xl px-4 py-3 text-sm font-black transition ${
          recommended
            ? "bg-[#2f8f8a] text-white hover:bg-[#3b9d98]"
            : "border border-white/12 bg-white/[0.06] text-[#e9fbf6] hover:bg-white/[0.1]"
        } disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#7f9992]`}
      >
        {label}
      </button>
    </article>
  );
}

function ReviewWorkflowStep({
  approvedCount,
  currentRequirement,
  generatedCount,
  generatedReviewableCount,
  onGenerateDemoRows,
  onGoToGenerate,
  onOpenScript,
  onReviewAction,
  onSelectNext,
  selectedRequirementKeys,
}: {
  approvedCount: number;
  currentRequirement: ReviewRequirement | null;
  generatedCount: number;
  generatedReviewableCount: number;
  onGenerateDemoRows: () => void | Promise<void>;
  onGoToGenerate: () => void;
  onOpenScript: () => void;
  onReviewAction: (
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) => void;
  onSelectNext: (requirement: ReviewRequirement | null) => void;
  selectedRequirementKeys: Set<string>;
}) {
  if (generatedCount === 0) {
    return (
      <GuidedStepFrame
        eyebrow="Step 3"
        title="Review drafts"
        summary="There are no generated drafts yet. Generate the recommended demo rows first, then come back here to approve or flag outputs."
      >
        <GuidedBlockerCard
          actionLabel="Generate demo rows now"
          body="The review queue is intentionally empty until the prototype has produced draft comments and demo steps."
          onAction={onGenerateDemoRows}
          title="Generation is the blocker"
        />
      </GuidedStepFrame>
    );
  }

  if (!currentRequirement && approvedCount > 0) {
    return (
      <GuidedStepFrame
        eyebrow="Step 3"
        title="Review complete"
        summary="Every generated row has a local decision. Open the demo script to see what the approved rows produce."
      >
        <GuidedBlockerCard
          actionLabel="Open demo script"
          body="Great. Phase 1 now has enough approved material to assemble the consultant-facing demo document."
          onAction={onOpenScript}
          title="Queue cleared"
        />
      </GuidedStepFrame>
    );
  }

  if (!currentRequirement) {
    return (
      <GuidedStepFrame
        eyebrow="Step 3"
        title="No exportable rows yet"
        summary="Generated rows exist, but none are approved for the demo script. Approve at least one draft to finish Phase 1."
      >
        <GuidedBlockerCard
          actionLabel="Back to generation"
          body="Rows marked as skipped or needs-review stay out of the script. Use the expert table to select another slice, or reset a row if you want to approve it."
          onAction={onGoToGenerate}
          title="Approval is the blocker"
        />
      </GuidedStepFrame>
    );
  }

  return (
    <GuidedStepFrame
      eyebrow="Step 3"
      title="Review one generated draft"
      summary="Make a consultant decision, then move to the next draft. The full Excel table is no longer the main path."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <GuidedReviewCard
          onReviewAction={onReviewAction}
          onSelectNext={onSelectNext}
          requirement={currentRequirement}
        />
        <aside className="rounded-2xl border border-white/10 bg-black/18 p-5">
          <p className="mono-label text-[0.64rem] text-[#8fcac0]">
            Review queue
          </p>
          <p className="mt-3 font-mono text-5xl font-black tracking-[-0.06em] text-white">
            {generatedReviewableCount}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#a9c5be]">
            generated rows still need a decision. {selectedRequirementKeys.size}{" "}
            rows are selected from the expert table.
          </p>
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={() => onSelectNext(currentRequirement)}
              className="focus-premium rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm font-bold text-[#e9fbf6] transition hover:bg-white/[0.1]"
            >
              Skip to next draft
            </button>
            <button
              type="button"
              onClick={onGoToGenerate}
              className="focus-premium rounded-2xl border border-[#6fa8b8]/24 bg-[#6fa8b8]/10 px-4 py-3 text-sm font-bold text-[#c9dde3] transition hover:bg-[#6fa8b8]/16"
            >
              Generate more rows
            </button>
          </div>
        </aside>
      </div>
    </GuidedStepFrame>
  );
}

function GuidedReviewCard({
  onReviewAction,
  onSelectNext,
  requirement,
}: {
  onReviewAction: (
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) => void;
  onSelectNext: (requirement: ReviewRequirement | null) => void;
  requirement: ReviewRequirement;
}) {
  const assessment = assessRequirementSupport(requirement);
  const validation = evaluateRequirementValidation(requirement, assessment);
  const draft =
    requirement.generatedOutput.state === "mock-generated-draft"
      ? requirement.generatedOutput.draft
      : null;

  return (
    <article className="rounded-2xl border border-white/10 bg-[#071214]/90 p-5 shadow-2xl shadow-black/25">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="mono-label text-[0.64rem] text-[#8fcac0]">
            Row {requirement.sourceRowNumber}
          </p>
          <h3 className="mt-2 break-words text-3xl font-black tracking-[-0.045em] text-white">
            {requirement.requirementId || "No requirement ID"}
          </h3>
        </div>
        <StatusBadge status={requirement.reviewStatus} />
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.045] p-4">
        <p className="mono-label text-[0.58rem] text-[#8ea7a0]">Requirement</p>
        <p className="mt-2 text-base leading-7 text-[#f3fffb]">
          {emptyValue(requirement.requirementDescription)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <TinyInfoPill label="L2" value={emptyValue(requirement.l2Process)} />
          <TinyInfoPill
            label="L3"
            value={emptyValue(requirement.l3Process || requirement.operation)}
          />
          <TinyInfoPill label="Demo" value={formatBoolean(requirement.demo)} />
          <TinyInfoPill label="MVP" value={formatBoolean(requirement.mvp)} />
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-xl border border-[#2f8f8a]/20 bg-[#2f8f8a]/7 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <ReviewActionButton
          label="Approve and next"
          onClick={() => onReviewAction(requirement, { type: "approve" })}
          tone="approve"
        />
        <ReviewActionButton
          label="Needs review"
          onClick={() => onReviewAction(requirement, { type: "flag" })}
          tone="review"
        />
        <ReviewActionButton
          label="Skip row"
          onClick={() => onReviewAction(requirement, { type: "skip" })}
          tone="neutral"
        />
        <ReviewActionButton
          label="Reset draft"
          onClick={() => onReviewAction(requirement, { type: "resetToDraft" })}
          tone="neutral"
        />
      </div>

      <RequirementValidationStrip validation={validation} />

      {draft ? (
        <section className="mt-5 grid gap-4">
          <div className="rounded-xl border border-[#2f8f8a]/24 bg-[#2f8f8a]/8 p-4">
            <p className="mono-label text-[0.58rem] text-[#8ea7a0]">
              Draft comment
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#eefcf8]">
              {draft.generatedComment}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="mono-label text-[0.58rem] text-[#8ea7a0]">
              Demo steps
            </p>
            <ol className="mt-3 grid gap-3">
              {draft.demoSteps.map((step, index) => (
                <li
                  key={step.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <p className="text-sm font-bold text-white">
                    {index + 1}. {step.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#8fcac0]">
                    {step.mesModuleOrScreen}
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-[#bdd7d0]">
                    {step.instructions.map((instruction) => (
                      <li key={instruction}>{instruction}</li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </div>

          <details className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <summary className="cursor-pointer text-sm font-bold text-white">
              Assumptions, warnings, and traceability
            </summary>
            <div className="mt-4 grid gap-4">
              <GeneratedDraftList
                emptyText="No assumptions recorded for this draft."
                items={draft.assumptions}
                label="Assumptions"
              />
              <GeneratedDraftList
                emptyText="No warnings recorded for this draft."
                items={draft.warnings}
                label="Warnings"
              />
              <div>
                <p className="text-sm font-semibold text-white">
                  Source references
                </p>
                {draft.sourceReferences.length > 0 ? (
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-[#bdd7d0]">
                    {draft.sourceReferences.map((sourceReference) => (
                      <li
                        key={sourceReference.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                      >
                        <span className="font-semibold text-white">
                          {sourceReference.kind}
                        </span>
                        :{" "}
                        {sourceReference.url ? (
                          <a
                            className="font-semibold text-[#8fcac0] underline decoration-[#8fcac0]/35 underline-offset-4"
                            href={sourceReference.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {sourceReference.label}
                          </a>
                        ) : (
                          <span className="font-semibold text-white">
                            {sourceReference.label}
                          </span>
                        )}{" "}
                        {sourceReference.note}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-[#8ea7a0]">
                    No source references recorded for this draft.
                  </p>
                )}
              </div>
            </div>
          </details>
        </section>
      ) : (
        <GuidedBlockerCard
          actionLabel="Back to generation"
          body="This requirement is selected but does not have a draft yet."
          onAction={() => onSelectNext(null)}
          title="No generated draft"
        />
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mono-label text-[0.62rem] text-[#8ea7a0]">
            Consultant comment
          </span>
          <textarea
            value={requirement.consultantComment}
            onChange={(event) =>
              onReviewAction(requirement, {
                type: "edit",
                consultantComment: event.currentTarget.value,
              })
            }
            placeholder="Edit the customer-facing wording before approval."
            className="focus-premium mt-2 min-h-28 w-full rounded-2xl border border-white/12 bg-black/22 p-3 text-sm leading-6 text-[#eefcf8] placeholder:text-[#78928b]"
          />
        </label>

        <label className="block">
          <span className="mono-label text-[0.62rem] text-[#8ea7a0]">
            Review note
          </span>
          <textarea
            value={requirement.reviewNote}
            onChange={(event) =>
              onReviewAction(requirement, {
                type: "edit",
                reviewNote: event.currentTarget.value,
              })
            }
            placeholder="Why approve, flag, or skip this row?"
            className="focus-premium mt-2 min-h-28 w-full rounded-2xl border border-white/12 bg-black/22 p-3 text-sm leading-6 text-[#eefcf8] placeholder:text-[#78928b]"
          />
        </label>
      </div>

      <details className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-4">
        <summary className="cursor-pointer text-sm font-bold text-white">
          Full Excel context
        </summary>
        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          <DetailField label="Source Excel row">
            {requirement.sourceRowNumber}
          </DetailField>
          <DetailField label="Operation">
            {emptyValue(requirement.operation)}
          </DetailField>
          <DetailField label="Priority fields">
            EMS: {emptyValue(requirement.prioEms)}; CWS:{" "}
            {emptyValue(requirement.prioCws)}
          </DetailField>
          <DetailField label="Availability fields">
            Availability: {emptyValue(requirement.availability)}; CM:{" "}
            {emptyValue(requirement.availabilityCm)}
          </DetailField>
          <DetailField label="Supported percentage">
            {emptyValue(requirement.supportedPercent)}
          </DetailField>
          <DetailField label="Source comment from Excel">
            {emptyValue(requirement.sourceComment)}
          </DetailField>
        </dl>
      </details>
    </article>
  );
}

function TinyInfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/24 px-3 py-1.5 text-xs font-bold text-[#dff8f0]">
      <span className="text-[#8ea7a0]">{label}</span> {value}
    </span>
  );
}

function ExportWorkflowStep({
  assembly,
  onGoToReview,
  onGoToScript,
  projectMetadata,
}: {
  assembly: ReturnType<typeof assembleDemoScript>;
  onGoToReview: () => void;
  onGoToScript: () => void;
  projectMetadata: ReviewProjectMetadata;
}) {
  return (
    <GuidedStepFrame
      eyebrow="Step 5"
      title="Export the Phase 1 demo document"
      summary="This is the completion moment: a separate Markdown document with approved comments, demo steps, assumptions, warnings, and traceability."
    >
      <DemoScriptExportPanel
        assembly={assembly}
        onSwitchToReview={onGoToReview}
        onSwitchToScript={onGoToScript}
        projectMetadata={projectMetadata}
      />
    </GuidedStepFrame>
  );
}

function GuidedBlockerCard({
  actionLabel,
  body,
  onAction,
  title,
}: {
  actionLabel: string;
  body: string;
  onAction: () => void | Promise<void>;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-[#6fa8b8]/28 bg-[#6fa8b8]/8 p-6">
      <p className="mono-label text-[0.68rem] text-[#8fcac0]">Blocked state</p>
      <h3 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
        {title}
      </h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#bdd7d0]">{body}</p>
      <button
        type="button"
        onClick={onAction}
        className="focus-premium mt-5 rounded-2xl bg-[#2f8f8a] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#3b9d98]"
      >
        {actionLabel}
      </button>
    </section>
  );
}

function RequirementsExplorer({
  allFilteredRequirementsSelected,
  allRequirements,
  filter,
  onFilterChange,
  onSearchChange,
  onSelectRequirement,
  onToggleAllFilteredRequirements,
  onToggleRequirementSelection,
  searchQuery,
  selectedRequirementKeys,
  selectedRowNumber,
  visibleRequirements,
}: {
  allFilteredRequirementsSelected: boolean;
  allRequirements: ReviewRequirement[];
  filter: RequirementReviewFilter;
  onFilterChange: (filter: RequirementReviewFilter) => void;
  onSearchChange: (query: string) => void;
  onSelectRequirement: (requirement: ReviewRequirement) => void;
  onToggleAllFilteredRequirements: () => void;
  onToggleRequirementSelection: (requirementKey: string) => void;
  searchQuery: string;
  selectedRequirementKeys: Set<string>;
  selectedRowNumber: number | null;
  visibleRequirements: ReviewRequirement[];
}) {
  const summary = summarizeReviewRequirements(allRequirements);

  return (
    <details className="mt-5 rounded-xl border border-white/10 bg-black/18 p-4">
      <summary className="cursor-pointer text-sm font-bold text-white">
        Open all requirements for search, filtering, and custom selection
      </summary>
      <div className="mt-4 grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {requirementReviewFilters.map((nextFilter) => (
            <button
              key={nextFilter}
              type="button"
              aria-pressed={filter === nextFilter}
              onClick={() => onFilterChange(nextFilter)}
              className={`focus-premium rounded-2xl border p-3 text-left transition ${
                filter === nextFilter
                  ? "border-[#2f8f8a]/55 bg-[#2f8f8a]/12"
                  : "border-white/10 bg-white/[0.045] hover:bg-white/[0.075]"
              }`}
            >
              <span className="block text-xs font-bold text-[#effffb]">
                {filterLabels[nextFilter]}
              </span>
              <span className="mt-2 block font-mono text-2xl font-black text-white">
                {getFilterCount(summary, nextFilter)}
              </span>
              <span className="mt-1 block text-[0.68rem] leading-4 text-[#8ea7a0]">
                {filterDescriptions[nextFilter]}
              </span>
            </button>
          ))}
        </div>

        <label>
          <span className="sr-only">Search requirements</span>
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            placeholder="Search ID, process, text, or status..."
            className="focus-premium w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-[#78928b]"
          />
        </label>

        <RequirementsTable
          allFilteredRequirementsSelected={allFilteredRequirementsSelected}
          filter={filter}
          onSelectRequirement={onSelectRequirement}
          onToggleAllFilteredRequirements={onToggleAllFilteredRequirements}
          onToggleRequirementSelection={onToggleRequirementSelection}
          searchQuery={searchQuery}
          selectedRequirementKeys={selectedRequirementKeys}
          selectedRowNumber={selectedRowNumber}
          visibleRequirements={visibleRequirements}
        />
      </div>
    </details>
  );
}

function RequirementsTable({
  allFilteredRequirementsSelected,
  filter,
  onSelectRequirement,
  onToggleAllFilteredRequirements,
  onToggleRequirementSelection,
  searchQuery,
  selectedRequirementKeys,
  selectedRowNumber,
  visibleRequirements,
}: {
  allFilteredRequirementsSelected: boolean;
  filter: RequirementReviewFilter;
  onSelectRequirement: (requirement: ReviewRequirement) => void;
  onToggleAllFilteredRequirements: () => void;
  onToggleRequirementSelection: (requirementKey: string) => void;
  searchQuery: string;
  selectedRequirementKeys: Set<string>;
  selectedRowNumber: number | null;
  visibleRequirements: ReviewRequirement[];
}) {
  if (visibleRequirements.length === 0) {
    return <EmptyFilterState filter={filter} searchQuery={searchQuery} />;
  }

  return (
    <div className="max-w-full overflow-x-auto rounded-[1.25rem] border border-white/10 bg-[#0a1518]/88">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="bg-white/[0.045] font-mono text-[0.68rem] uppercase tracking-[0.12em] text-[#8ea7a0]">
          <tr>
            <th className="px-4 py-4 font-semibold">
              <span className="sr-only">Select rows</span>
              <input
                type="checkbox"
                checked={allFilteredRequirementsSelected}
                onChange={onToggleAllFilteredRequirements}
                aria-label={
                  allFilteredRequirementsSelected
                    ? "Clear selected visible rows"
                    : "Select all visible rows"
                }
                className="h-4 w-4 accent-[#2f8f8a]"
              />
            </th>
            <th className="px-4 py-4 font-semibold">ID</th>
            <th className="px-4 py-4 font-semibold">Row</th>
            <th className="px-4 py-4 font-semibold">Requirement</th>
            <th className="px-4 py-4 font-semibold">L2 process</th>
            <th className="px-4 py-4 font-semibold">L3 or operation</th>
            <th className="px-4 py-4 font-semibold">Demo</th>
            <th className="px-4 py-4 font-semibold">MVP</th>
            <th className="px-4 py-4 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {visibleRequirements.map((requirement) => {
            const isSelected =
              requirement.sourceRowNumber === selectedRowNumber;
            const isChecked = selectedRequirementKeys.has(
              requirement.requirementKey,
            );

            return (
              <tr
                key={requirement.requirementKey}
                className={`border-t border-white/8 transition ${
                  isSelected
                    ? "bg-[#2f8f8a]/11 shadow-[inset_4px_0_0_#2f8f8a]"
                    : "bg-transparent hover:bg-white/[0.04]"
                }`}
              >
                <td className="px-4 py-4 align-top">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() =>
                      onToggleRequirementSelection(requirement.requirementKey)
                    }
                    aria-label={`Select requirement ${
                      requirement.requirementId || requirement.sourceRowNumber
                    } for prototype draft generation`}
                    className="h-4 w-4 accent-[#2f8f8a]"
                  />
                </td>
                <td className="px-4 py-4 align-top font-mono text-[#d2eee7]">
                  <button
                    type="button"
                    onClick={() => onSelectRequirement(requirement)}
                    className="focus-premium rounded-md text-left font-bold underline-offset-4 hover:underline"
                  >
                    {requirement.requirementId || "No ID"}
                  </button>
                </td>
                <td className="px-4 py-4 align-top font-mono text-[#b6cbc5]">
                  {requirement.sourceRowNumber}
                </td>
                <td className="max-w-xl px-4 py-4 align-top leading-6 text-[#e4f4ef]">
                  <button
                    type="button"
                    onClick={() => onSelectRequirement(requirement)}
                    className="focus-premium rounded-md text-left underline-offset-4 hover:text-white hover:underline"
                  >
                    {emptyValue(requirement.requirementDescription)}
                  </button>
                </td>
                <td className="px-4 py-4 align-top text-[#b6cbc5]">
                  {emptyValue(requirement.l2Process)}
                </td>
                <td className="px-4 py-4 align-top text-[#b6cbc5]">
                  {emptyValue(requirement.l3Process || requirement.operation)}
                </td>
                <td className="px-4 py-4 align-top">
                  <FlagBadge active={requirement.demo} />
                </td>
                <td className="px-4 py-4 align-top">
                  <FlagBadge active={requirement.mvp} />
                </td>
                <td className="px-4 py-4 align-top">
                  <StatusBadge status={requirement.reviewStatus} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getFilterCount(
  summary: ReturnType<typeof summarizeReviewRequirements>,
  filter: RequirementReviewFilter,
): number {
  switch (filter) {
    case "all":
      return summary.allCount;
    case "demo":
      return summary.demoCount;
    case "mvp":
      return summary.mvpCount;
    case "pending":
      return summary.pendingCount;
    case "review":
      return summary.reviewCount;
    case "approved":
      return summary.approvedCount;
    case "skipped":
      return summary.skippedCount;
  }
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

function WorkspaceSourcePanel({
  feedback,
  generationMode,
  onRestoreFixtureSource,
  onUploadWorkbook,
  sourceMetadata,
  sourceRowCount,
}: {
  feedback: SourceFeedback | null;
  generationMode: RequirementGenerationRouteMode | null;
  onRestoreFixtureSource: () => void;
  onUploadWorkbook: (event: ChangeEvent<HTMLInputElement>) => void;
  sourceMetadata: RequirementsSourceMetadata;
  sourceRowCount: number;
}) {
  const isFixtureSource = sourceMetadata.sourceKind === "fixture";

  return (
    <section className="premium-panel min-w-0 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="mono-label text-[0.68rem] text-[#8fcac0]">
            Source workbook
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-white">
            {sourceMetadata.sourceLabel}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#bdd7d0]">
            Upload a `.xlsx` requirements workbook or return to the committed
            Customer X fixture. The app keeps fixture and upload state separate
            so review decisions stay source-aware.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SourceMeta label="Project" value={sourceMetadata.projectName} />
            <SourceMeta label="Customer" value={sourceMetadata.customerName} />
            <SourceMeta
              label="Rows"
              value={sourceRowCount.toLocaleString("en-US")}
            />
            <SourceMeta
              label="Source file"
              value={sourceMetadata.sourceFilename}
              breakWords
            />
          </div>
        </div>
        <div className="grid gap-3 sm:min-w-64">
          <span className="rounded-2xl border border-[#c8953f]/35 bg-[#c8953f]/10 px-4 py-3 text-sm font-bold text-[#ead19a]">
            {generationMode === "real"
              ? "Grounded generation mode"
              : "Prototype draft mode"}
          </span>
          <label className="focus-premium cursor-pointer rounded-2xl bg-[#2f8f8a] px-4 py-3 text-center text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:bg-[#3b9d98]">
            Upload workbook
            <input
              accept=".xlsx"
              type="file"
              onChange={onUploadWorkbook}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={onRestoreFixtureSource}
            disabled={isFixtureSource}
            className="focus-premium rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm font-bold text-[#e9fbf6] transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Restore sample
          </button>
        </div>
      </div>

      <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-[#acc7c0]">
        {generationMode === "real"
          ? "The latest generation run used grounded MES documentation through the MCP and Bedrock server path. Keep consultant review in the loop for uncertain rows."
          : "Prototype drafts are consultant-friendly heuristics. When the server is configured for real generation, grounded documentation references will appear here."}
      </p>

      {feedback ? (
        <div
          className={`mt-4 rounded-md border px-4 py-3 text-sm leading-6 ${
            feedback.tone === "success"
              ? "border-[#2f8f8a]/45 bg-[#2f8f8a]/12 text-[#d2eee7]"
              : feedback.tone === "error"
                ? "border-[#c8953f]/45 bg-[#c8953f]/12 text-[#ead19a]"
                : "border-white/12 bg-white/[0.06] text-[#d8eee8]"
          }`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </div>
      ) : null}
    </section>
  );
}

function SourceMeta({
  breakWords,
  label,
  value,
}: {
  breakWords?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
      <p className="mono-label text-[0.56rem] text-[#7fa49c]">{label}</p>
      <p
        className={`mt-2 text-sm font-bold text-[#eefcf8] ${
          breakWords ? "break-all" : "truncate"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function RequirementValidationStrip({
  validation,
}: {
  validation: RequirementValidationSummary;
}) {
  const isSafeToApprove = validation.isSafeToApprove;
  const toneClasses = isSafeToApprove
    ? "border-[#2f8f8a]/45 bg-[#2f8f8a]/12 text-[#d2eee7]"
    : validation.severity === "attention"
      ? "border-[#c8953f]/45 bg-[#c8953f]/12 text-[#ead19a]"
      : "border-[#ff776d]/45 bg-[#ff776d]/12 text-[#ffb4ae]";

  return (
    <section className={`mt-4 rounded-2xl border px-4 py-3 ${toneClasses}`}>
      <p className="mono-label text-[0.58rem]">Validation</p>
      <p className="mt-2 text-sm font-bold">{validation.headline}</p>
      <p className="mt-2 text-sm leading-6">{validation.guidance}</p>

      {validation.signals.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {validation.signals.map((signal) => (
            <span
              key={signal}
              className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                isSafeToApprove
                  ? "border-[#2f8f8a]/45 bg-black/20 text-[#d2eee7]"
                  : validation.severity === "attention"
                    ? "border-[#c8953f]/45 bg-black/20 text-[#ead19a]"
                    : "border-[#ff776d]/45 bg-black/20 text-[#ffb4ae]"
              }`}
            >
              {requirementValidationSignalLabels[signal]}
            </span>
          ))}
        </div>
      ) : (
        <p className="mono-label mt-3 text-[0.58rem]">
          No validation flags from the draft heuristic.
        </p>
      )}
    </section>
  );
}

function GeneratedDraftList({
  emptyText,
  items,
  label,
}: {
  emptyText: string;
  items: string[];
  label: string;
}) {
  return (
    <div>
      <p className="mono-label text-[0.58rem] text-[#8ea7a0]">{label}</p>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#bdd7d0]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-[#bdd7d0]">{emptyText}</p>
      )}
    </div>
  );
}

function ReviewActionButton({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone: "approve" | "review" | "neutral";
}) {
  const toneClass =
    tone === "approve"
      ? "border-[#2f8f8a] bg-[#2f8f8a] text-white hover:bg-[#3b9d98]"
      : tone === "review"
        ? "border-[#c8953f]/45 bg-[#c8953f]/12 text-[#ead19a] hover:bg-[#c8953f]/18"
        : "border-white/12 bg-white/[0.06] text-[#dff8f0] hover:bg-white/[0.1]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-premium rounded-2xl border px-3 py-2 text-sm font-bold transition ${toneClass}`}
    >
      {label}
    </button>
  );
}

function DetailField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <dt className="mono-label text-[0.58rem] text-[#8ea7a0]">{label}</dt>
      <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#e4f4ef]">
        {children}
      </dd>
    </div>
  );
}

function EmptyFilterState({
  filter,
  searchQuery,
}: {
  filter: RequirementReviewFilter;
  searchQuery: string;
}) {
  const emptyCopy =
    searchQuery.trim().length > 0
      ? "Try a different requirement ID, process, status, or source text."
      : filter === "review" || filter === "approved" || filter === "skipped"
        ? "Use the row detail panel actions to move requirements into this review state."
        : "No source rows match this fixture-backed filter.";

  return (
    <div className="p-8">
      <p className="mono-label text-[0.68rem] text-[#8fcac0]">Empty filter</p>
      <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-white">
        {searchQuery.trim().length > 0
          ? "No rows match this search"
          : `No ${filterLabels[filter].toLowerCase()} yet`}
      </h2>
      <p className="mt-4 max-w-2xl leading-7 text-[#9fb9b2]">{emptyCopy}</p>
    </div>
  );
}

function FlagBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex min-w-16 justify-center rounded-md border px-2 py-1 text-xs font-semibold ${
        active
          ? "border-[#2f8f8a]/45 bg-[#2f8f8a]/12 text-[#d2eee7]"
          : "border-white/10 bg-white/[0.05] text-[#8ea7a0]"
      }`}
    >
      {formatBoolean(active)}
    </span>
  );
}

function StatusBadge({ status }: { status: RequirementReviewStatus }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function formatBoolean(value: boolean): string {
  return value ? "Yes" : "No";
}

function emptyValue(value: string | null | undefined): string {
  return value?.trim() || "Not provided";
}

function createIdleGenerationRun(): MockGenerationRunState {
  return {
    selectedCount: 0,
    generatedCount: 0,
    stages: mockGenerationStageLabels.map((label) => ({
      label,
      status: "waiting",
    })),
  };
}

function toGenerationRequestRequirement(
  requirement: ParsedRequirement,
): ParsedRequirement {
  return {
    sourceRowNumber: requirement.sourceRowNumber,
    requirementId: requirement.requirementId,
    requirementDescription: requirement.requirementDescription,
    l2Process: requirement.l2Process,
    l3Process: requirement.l3Process,
    operation: requirement.operation,
    demo: requirement.demo,
    demoRaw: requirement.demoRaw,
    detailDescriptionAndMotivation: requirement.detailDescriptionAndMotivation,
    prioEms: requirement.prioEms,
    prioCws: requirement.prioCws,
    mvp: requirement.mvp,
    mvpRaw: requirement.mvpRaw,
    availability: requirement.availability,
    availabilityCm: requirement.availabilityCm,
    descriptionAvailability: requirement.descriptionAvailability,
    supportedPercent: requirement.supportedPercent,
    sourceComment: requirement.sourceComment,
  };
}
