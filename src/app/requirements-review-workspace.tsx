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
  pending: "tone-neutral",
  review: "tone-warning",
  approved: "tone-positive",
  skipped: "tone-neutral-subtle",
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
  const [sourcePreviewExpanded, setSourcePreviewExpanded] = useState(
    fallbackWorkspaceState.source.sourceKind !== "fixture",
  );
  const [sourceDetailsExpanded, setSourceDetailsExpanded] = useState(
    fallbackWorkspaceState.source.sourceKind !== "fixture",
  );

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
    setSourcePreviewExpanded(workspaceState.source.sourceKind !== "fixture");
    setSourceDetailsExpanded(workspaceState.source.sourceKind !== "fixture");
  }, [workspaceState.source.sourceId, workspaceState.source.sourceKind]);

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
  const reviewQueue = generatedReviewableRequirements;
  const currentReviewRequirement =
    selectedRequirement?.generatedOutput.state === "mock-generated-draft" &&
    selectedRequirement.reviewStatus === "pending"
      ? selectedRequirement
      : (generatedReviewableRequirements[0] ?? null);
  const activeReviewQueueIndex = currentReviewRequirement
    ? reviewQueue.findIndex(
        (requirement) =>
          requirement.requirementKey ===
          currentReviewRequirement.requirementKey,
      )
    : -1;
  const allFilteredRequirementsSelected =
    visibleRequirements.length > 0 &&
    visibleRequirements.every((requirement) =>
      selectedRequirementKeys.has(requirement.requirementKey),
    );
  const sourceMetadata = workspaceState.source;
  const currentProjectMetadata = workspaceState.reviewState.project;
  const sourcePreviewRows = reviewRequirements.slice(0, 8);
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
        message: `Loaded ${file.name}. The preview below shows the parsed workbook rows so you can confirm the upload before continuing.`,
      });
      setSourcePreviewExpanded(true);
      setSourceDetailsExpanded(true);
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
    setSourcePreviewExpanded(false);
    setSourceDetailsExpanded(false);
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

  function handleSelectPreviousReviewRequirement(
    currentRequirement: ReviewRequirement | null,
  ) {
    if (reviewQueue.length === 0) {
      setSelectedRowNumber(null);
      return;
    }

    if (!currentRequirement) {
      setSelectedRowNumber(reviewQueue[0]?.sourceRowNumber ?? null);
      return;
    }

    const currentIndex = reviewQueue.findIndex(
      (requirement) =>
        requirement.requirementKey === currentRequirement.requirementKey,
    );

    if (currentIndex <= 0) {
      setSelectedRowNumber(reviewQueue[0]?.sourceRowNumber ?? null);
      return;
    }

    setSelectedRowNumber(
      reviewQueue[currentIndex - 1]?.sourceRowNumber ?? null,
    );
  }

  function handleSelectReviewQueueRequirement(requirement: ReviewRequirement) {
    setSelectedRowNumber(requirement.sourceRowNumber);
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
    <div id="workspace" className="animate-enter-slow grid min-w-0 gap-4">
      <WorkspaceShellHeader
        activeStep={activeWorkflowStep}
        generationMode={lastGenerationMode}
        nextAction={nextAction}
        onStepChange={goToWorkflowStep}
        progress={workflowProgress}
        sourceLabel={sourceMetadata.sourceLabel}
        sourceRowCount={currentProjectMetadata.sourceRowCount}
        demoCount={summary.demoCount}
        approvedCount={summary.approvedCount}
      />

      <div className="min-w-0">
        {activeWorkflowStep === "source" ? (
          <GuidedStepFrame
            eyebrow="Step 1"
            title="Confirm the source"
            summary="Check the active workbook, replace it only if needed, and validate the parsed rows before continuing."
          >
            <WorkspaceSourcePanel
              demoCount={summary.demoCount}
              feedback={sourceFeedback}
              mvpCount={summary.mvpCount}
              onContinue={() => goToWorkflowStep("generate")}
              onRestoreFixtureSource={handleRestoreFixtureSource}
              onToggleDetails={() =>
                setSourceDetailsExpanded((current) => !current)
              }
              onTogglePreview={() =>
                setSourcePreviewExpanded((current) => !current)
              }
              onUploadWorkbook={handleUploadWorkbook}
              previewRows={sourcePreviewRows}
              sourceMetadata={sourceMetadata}
              sourceDetailsExpanded={sourceDetailsExpanded}
              sourcePreviewExpanded={sourcePreviewExpanded}
              sourceRowCount={currentProjectMetadata.sourceRowCount}
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
            generatedCount={generatedRequirements.length}
            isGenerating={isGenerating}
            mvpCount={summary.mvpCount}
            onFilterChange={(filter) => {
              setActiveFilter(filter);
              setSelectedRowNumber(null);
            }}
            onGenerateDemoRows={handleGenerateDemoRows}
            onGenerateMvpRows={handleGenerateMvpRows}
            onGenerateSelectedRows={handleGenerateSelectedRows}
            onGoToReview={() => goToWorkflowStep("review")}
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
            activeQueueIndex={activeReviewQueueIndex}
            approvedCount={summary.approvedCount}
            currentRequirement={currentReviewRequirement}
            generatedCount={generatedRequirements.length}
            generatedReviewableCount={generatedReviewableRequirements.length}
            onGenerateDemoRows={handleGenerateDemoRows}
            onGoToGenerate={() => goToWorkflowStep("generate")}
            onOpenScript={() => goToWorkflowStep("script")}
            onReviewAction={handleGuidedReviewAction}
            onSelectPrevious={handleSelectPreviousReviewRequirement}
            onSelectQueueRequirement={handleSelectReviewQueueRequirement}
            onSelectNext={handleSelectNextReviewRequirement}
            reviewQueue={reviewQueue}
            selectedRequirementKeys={selectedRequirementKeys}
          />
        ) : null}

        {activeWorkflowStep === "script" ? (
          <GuidedStepFrame
            eyebrow="Step 4"
            title="Shape the demo script"
            summary="Refine the narrative, tune the section flow, and keep only the editing detail that helps the consultant handoff."
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
    </div>
  );
}

function WorkspaceShellHeader({
  activeStep,
  approvedCount,
  demoCount,
  generationMode,
  nextAction,
  onStepChange,
  progress,
  sourceLabel,
  sourceRowCount,
}: {
  activeStep: GuidedWorkflowStep;
  approvedCount: number;
  demoCount: number;
  generationMode: RequirementGenerationRouteMode | null;
  nextAction: ReturnType<typeof getNextAction>;
  onStepChange: (step: GuidedWorkflowStep) => void;
  progress: ReturnType<typeof getWorkflowProgress>;
  sourceLabel: string;
  sourceRowCount: number;
}) {
  const activeStepLabel =
    progress.find((stepState) => stepState.step === activeStep)?.label ??
    activeStep;

  return (
    <section
      id="guided-workflow-top"
      className="premium-panel overflow-hidden rounded-[1.75rem] p-4 sm:p-5"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="theme-shell-card-soft rounded-full px-3 py-1.5 text-xs font-bold">
              Active source: {sourceLabel}
            </span>
            <span className="theme-shell-card-soft rounded-full px-3 py-1.5 text-xs font-bold theme-shell-subtle">
              {generationMode === "real"
                ? "Grounded generation mode"
                : "Prototype draft mode"}
            </span>
          </div>
          <h2 className="theme-shell-title mt-3 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            Phase 1 workflow
          </h2>
          <p className="theme-shell-body mt-2 max-w-3xl text-sm leading-7">
            The active step below is{" "}
            <span className="theme-shell-title font-semibold">
              {activeStepLabel}
            </span>
            Next up:{" "}
            <span className="theme-shell-title font-semibold">
              {nextAction.label}
            </span>
            .
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
          <ShellMetric
            label="Rows"
            value={sourceRowCount.toLocaleString("en-US")}
          />
          <ShellMetric label="Demo" value={demoCount.toLocaleString("en-US")} />
          <ShellMetric
            label="Approved"
            value={approvedCount.toLocaleString("en-US")}
          />
        </div>
      </div>

      <div
        aria-label="Guided workflow progress"
        className="mt-4 overflow-x-auto pb-1"
      >
        <div className="flex min-w-max gap-2">
          {progress.map((stepState, index) => (
            <button
              key={stepState.step}
              type="button"
              onClick={() => onStepChange(stepState.step)}
              aria-current={activeStep === stepState.step ? "step" : undefined}
              className={`focus-premium min-w-[148px] rounded-2xl border px-4 py-3 text-left transition ${
                activeStep === stepState.step
                  ? "theme-shell-card-brand"
                  : stepState.status === "blocked"
                    ? "theme-shell-card-soft theme-shell-subtle"
                    : "theme-shell-card-soft hover:bg-[color:var(--shell-soft-surface-hover)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="theme-shell-subtle mono-label text-[0.54rem]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    stepState.status === "complete"
                      ? "bg-[#00558C]"
                      : stepState.status === "blocked"
                        ? "bg-[#64748B]/45"
                        : "bg-[#64748B]"
                  }`}
                />
              </div>
              <span className="theme-shell-title mt-2 block text-sm font-bold">
                {stepState.label}
              </span>
              <span className="theme-shell-subtle mt-1 block text-xs capitalize">
                {stepState.status}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShellMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="theme-shell-card rounded-2xl px-3 py-3">
      <p className="theme-shell-subtle mono-label text-[0.5rem]">{label}</p>
      <p className="theme-shell-title mt-1 text-lg font-black tracking-[-0.03em]">
        {value}
      </p>
    </div>
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
    <section className="premium-panel-strong min-w-0 rounded-[1.75rem] p-4 sm:p-5">
      <div className="mb-4 max-w-4xl">
        <p className="theme-shell-kicker mono-label text-[0.68rem]">
          {eyebrow}
        </p>
        <h2 className="theme-shell-title mt-2 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
          {title}
        </h2>
        <p className="theme-shell-body mt-2 text-sm leading-7">{summary}</p>
      </div>
      {children}
    </section>
  );
}

export function GuidedStepFooter({
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
    <div className="theme-shell-card mt-5 flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="theme-shell-body text-sm leading-6">{helper}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45"
      >
        {label}
      </button>
    </div>
  );
}

export function GenerateWorkflowStep({
  allFilteredRequirementsSelected,
  allRequirements,
  demoCount,
  feedback,
  filter,
  generatedCount,
  isGenerating,
  mvpCount,
  onFilterChange,
  onGenerateDemoRows,
  onGenerateMvpRows,
  onGenerateSelectedRows,
  onGoToReview,
  onSearchChange,
  onSelectRequirement,
  onToggleAllFilteredRequirements,
  onToggleRequirementSelection,
  runState,
  searchQuery,
  selectedRequirementKeys,
  selectedRowNumber,
  selectedRowsCount,
  showFrame = true,
  visibleRequirements,
}: {
  allFilteredRequirementsSelected: boolean;
  allRequirements: ReviewRequirement[];
  demoCount: number;
  feedback: GenerationFeedback | null;
  filter: RequirementReviewFilter;
  generatedCount: number;
  isGenerating: boolean;
  mvpCount: number;
  onFilterChange: (filter: RequirementReviewFilter) => void;
  onGenerateDemoRows: () => void | Promise<void>;
  onGenerateMvpRows: () => void | Promise<void>;
  onGenerateSelectedRows: () => void | Promise<void>;
  onGoToReview: () => void;
  onSearchChange: (query: string) => void;
  onSelectRequirement: (requirement: ReviewRequirement) => void;
  onToggleAllFilteredRequirements: () => void;
  onToggleRequirementSelection: (requirementKey: string) => void;
  runState: MockGenerationRunState;
  searchQuery: string;
  selectedRequirementKeys: Set<string>;
  selectedRowNumber: number | null;
  selectedRowsCount: number;
  showFrame?: boolean;
  visibleRequirements: ReviewRequirement[];
}) {
  const content = (
    <>
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
              ? "tone-positive"
              : feedback.tone === "error"
                ? "tone-warning"
                : "tone-neutral"
          }`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </div>
      ) : null}

      {generatedCount > 0 ? (
        <section className="theme-shell-card-brand mt-4 rounded-[1.5rem] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="theme-shell-kicker mono-label text-[0.6rem]">
                Drafts ready
              </p>
              <h3 className="theme-shell-title mt-2 text-xl font-bold tracking-[-0.03em]">
                {generatedCount} generated row
                {generatedCount === 1 ? "" : "s"} are ready for consultant
                review.
              </h3>
              <p className="theme-shell-body mt-2 text-sm leading-6">
                You can keep refining the generation slice here, or move
                straight into the review queue.
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToReview}
              className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-bold transition"
            >
              Open review queue
            </button>
          </div>
        </section>
      ) : null}

      <details className="theme-shell-card mt-4 rounded-xl p-4">
        <summary className="theme-shell-title cursor-pointer text-sm font-bold">
          See generation status
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {runState.stages.map((stage) => (
            <div
              key={stage.label}
              className={`rounded-2xl border p-4 ${
                stage.status === "complete"
                  ? "theme-shell-card-brand"
                  : stage.status === "running"
                    ? "pulse-glow theme-shell-card-slate"
                    : "theme-shell-card-soft"
              }`}
            >
              <p className="theme-shell-subtle mono-label text-[0.58rem]">
                {stage.status}
              </p>
              <p className="theme-shell-title mt-2 text-sm font-bold">
                {stage.label}
              </p>
            </div>
          ))}
        </div>
      </details>

      <RequirementsExplorer
        allFilteredRequirementsSelected={allFilteredRequirementsSelected}
        allRequirements={allRequirements}
        disclosureLabel="Open expert row selection"
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
    </>
  );

  if (!showFrame) {
    return content;
  }

  return (
    <GuidedStepFrame
      eyebrow="Step 2"
      title="Generate safe first drafts"
      summary="Choose the slice to generate, keep the recommended demo rows front and center, and only open the expert table when you need custom selection."
    >
      {content}
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
        recommended ? "theme-shell-card-brand" : "theme-shell-card-soft"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="theme-shell-title text-lg font-black">{title}</p>
          {recommended ? (
            <p className="theme-shell-kicker mt-1 text-xs font-bold">
              Recommended
            </p>
          ) : null}
        </div>
        <span className="theme-shell-title font-mono text-4xl font-black tracking-[-0.06em]">
          {count}
        </span>
      </div>
      <p className="theme-shell-body mt-4 min-h-14 text-sm leading-6">
        {description}
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`focus-premium mt-5 w-full rounded-2xl px-4 py-3 text-sm font-black transition ${
          recommended
            ? "theme-button-primary"
            : "theme-shell-button-secondary border"
        } disabled:cursor-not-allowed disabled:opacity-45`}
      >
        {label}
      </button>
    </article>
  );
}

export function ReviewWorkflowStep({
  activeQueueIndex,
  approvedCount,
  currentRequirement,
  generatedCount,
  generatedReviewableCount,
  onGenerateDemoRows,
  onGoToGenerate,
  onOpenScript,
  onReviewAction,
  onSelectPrevious,
  onSelectQueueRequirement,
  onSelectNext,
  reviewQueue,
  selectedRequirementKeys,
  showFrame = true,
}: {
  activeQueueIndex: number;
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
  onSelectPrevious: (requirement: ReviewRequirement | null) => void;
  onSelectQueueRequirement: (requirement: ReviewRequirement) => void;
  onSelectNext: (requirement: ReviewRequirement | null) => void;
  reviewQueue: ReviewRequirement[];
  selectedRequirementKeys: Set<string>;
  showFrame?: boolean;
}) {
  if (generatedCount === 0) {
    const blocker = (
      <GuidedBlockerCard
        actionLabel="Generate demo rows now"
        body="The review queue is intentionally empty until the prototype has produced draft comments and demo steps."
        onAction={onGenerateDemoRows}
        title="Generation is the blocker"
      />
    );

    return showFrame ? (
      <GuidedStepFrame
        eyebrow="Step 3"
        title="Review drafts"
        summary="There are no generated drafts yet. Generate the recommended demo rows first, then come back here to approve or flag outputs."
      >
        {blocker}
      </GuidedStepFrame>
    ) : (
      blocker
    );
  }

  if (!currentRequirement && approvedCount > 0) {
    const blocker = (
      <GuidedBlockerCard
        actionLabel="Open demo script"
        body="Great. Phase 1 now has enough approved material to assemble the consultant-facing demo document."
        onAction={onOpenScript}
        title="Queue cleared"
      />
    );

    return showFrame ? (
      <GuidedStepFrame
        eyebrow="Step 3"
        title="Review complete"
        summary="Every generated row has a local decision. Open the demo script to see what the approved rows produce."
      >
        {blocker}
      </GuidedStepFrame>
    ) : (
      blocker
    );
  }

  if (!currentRequirement) {
    const blocker = (
      <GuidedBlockerCard
        actionLabel="Back to generation"
        body="Rows marked as skipped or needs-review stay out of the script. Use the expert table to select another slice, or reset a row if you want to approve it."
        onAction={onGoToGenerate}
        title="Approval is the blocker"
      />
    );

    return showFrame ? (
      <GuidedStepFrame
        eyebrow="Step 3"
        title="No exportable rows yet"
        summary="Generated rows exist, but none are approved for the demo script. Approve at least one draft to finish Phase 1."
      >
        {blocker}
      </GuidedStepFrame>
    ) : (
      blocker
    );
  }

  const content = (
    <>
      <section className="theme-shell-card mb-4 rounded-[1.35rem] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="theme-shell-kicker mono-label text-[0.58rem]">
              Review focus
            </p>
            <p className="theme-shell-title mt-2 text-base font-bold">
              Keep the queue visible, act above the fold, and only open extra
              evidence when you need it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <QueueMetricChip label="Pending" value={generatedReviewableCount} />
            <QueueMetricChip label="Approved" value={approvedCount} />
            <QueueMetricChip
              label="Selected"
              value={selectedRequirementKeys.size}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
        <ReviewQueueNavigator
          activeQueueIndex={activeQueueIndex}
          approvedCount={approvedCount}
          currentRequirement={currentRequirement}
          onOpenScript={onOpenScript}
          onSelectNext={onSelectNext}
          onSelectPrevious={onSelectPrevious}
          onSelectQueueRequirement={onSelectQueueRequirement}
          reviewQueue={reviewQueue}
        />
        <GuidedReviewCard
          onReviewAction={onReviewAction}
          onSelectNext={onSelectNext}
          requirement={currentRequirement}
        />
      </div>
    </>
  );

  if (!showFrame) {
    return content;
  }

  return (
    <GuidedStepFrame
      eyebrow="Step 3"
      title="Review one generated draft"
      summary="Focus on one requirement at a time, make the consultant decision, and let the queue move you forward."
    >
      {content}
    </GuidedStepFrame>
  );
}

function ReviewQueueNavigator({
  activeQueueIndex,
  approvedCount,
  currentRequirement,
  onOpenScript,
  onSelectNext,
  onSelectPrevious,
  onSelectQueueRequirement,
  reviewQueue,
}: {
  activeQueueIndex: number;
  approvedCount: number;
  currentRequirement: ReviewRequirement | null;
  onOpenScript: () => void;
  onSelectNext: (requirement: ReviewRequirement | null) => void;
  onSelectPrevious: (requirement: ReviewRequirement | null) => void;
  onSelectQueueRequirement: (requirement: ReviewRequirement) => void;
  reviewQueue: ReviewRequirement[];
}) {
  return (
    <aside className="premium-panel rounded-[1.5rem] p-5 xl:sticky xl:top-4 xl:flex xl:max-h-[calc(100vh-8rem)] xl:flex-col">
      <p className="theme-shell-kicker mono-label text-[0.64rem]">
        Review queue
      </p>
      <h3 className="theme-shell-title mt-3 text-2xl font-bold tracking-[-0.035em]">
        Browse what is next
      </h3>
      <p className="theme-shell-body mt-3 text-sm leading-6">
        Pick any pending row, or move through the queue in order while you make
        consultant decisions.
      </p>

      <div className="theme-shell-card mt-5 rounded-[1.25rem] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="theme-shell-subtle mono-label text-[0.52rem]">
              Pending
            </p>
            <p className="theme-shell-title mt-2 text-3xl font-black tracking-[-0.04em]">
              {reviewQueue.length}
            </p>
          </div>
          <div className="text-right">
            <p className="theme-shell-subtle mono-label text-[0.52rem]">
              Position
            </p>
            <p className="theme-shell-title mt-2 text-sm font-bold">
              {activeQueueIndex >= 0
                ? `${activeQueueIndex + 1} of ${reviewQueue.length}`
                : "Select a row"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelectPrevious(currentRequirement)}
          disabled={reviewQueue.length === 0 || activeQueueIndex <= 0}
          className="focus-premium theme-shell-button-secondary rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onSelectNext(currentRequirement)}
          disabled={
            reviewQueue.length === 0 ||
            activeQueueIndex === -1 ||
            activeQueueIndex >= reviewQueue.length - 1
          }
          className="focus-premium theme-shell-button-secondary rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <div className="mt-4 min-h-[18rem] xl:min-h-0 xl:flex-1 xl:overflow-hidden">
        <div className="h-full overflow-y-auto pr-1">
          <div className="grid gap-2">
            {reviewQueue.map((requirement, index) => (
              <ReviewQueueItem
                key={requirement.requirementKey}
                active={
                  currentRequirement?.requirementKey ===
                  requirement.requirementKey
                }
                index={index}
                onClick={() => onSelectQueueRequirement(requirement)}
                requirement={requirement}
              />
            ))}
          </div>
        </div>
      </div>

      {approvedCount > 0 ? (
        <button
          type="button"
          onClick={onOpenScript}
          className="focus-premium theme-shell-button-secondary mt-4 w-full rounded-2xl px-4 py-3 text-sm font-bold transition"
        >
          Open demo script
        </button>
      ) : null}
    </aside>
  );
}

function QueueMetricChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="theme-shell-card-soft inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold">
      <span className="theme-shell-subtle mono-label text-[0.48rem]">
        {label}
      </span>
      <span className="theme-shell-title text-sm">{value}</span>
    </span>
  );
}

function ReviewQueueItem({
  active,
  index,
  onClick,
  requirement,
}: {
  active: boolean;
  index: number;
  onClick: () => void;
  requirement: ReviewRequirement;
}) {
  const assessment = assessRequirementSupport(requirement);
  const validation = evaluateRequirementValidation(requirement, assessment);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-premium rounded-[1.2rem] border p-3 text-left transition ${
        active
          ? "theme-shell-card-active"
          : "theme-shell-card-soft hover:bg-[color:var(--shell-soft-surface-hover)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="theme-shell-subtle mono-label text-[0.5rem]">
            Queue {index + 1}
          </p>
          <p className="theme-shell-title mt-1 text-sm font-bold">
            {requirement.requirementId || `Row ${requirement.sourceRowNumber}`}
          </p>
        </div>
        <span className="theme-shell-body text-xs font-semibold">
          Row {requirement.sourceRowNumber}
        </span>
      </div>

      <p className="theme-shell-body mt-2 max-h-[3.25rem] overflow-hidden text-xs leading-5">
        {emptyValue(requirement.requirementDescription)}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {requirement.demo ? <MiniQueueChip label="Demo" /> : null}
        {requirement.mvp ? <MiniQueueChip label="MVP" /> : null}
        <MiniQueueChip
          label={
            validation.severity === "review"
              ? "Review needed"
              : validation.severity === "attention"
                ? "Workaround"
                : "Ready"
          }
          tone={validation.severity}
        />
      </div>
    </button>
  );
}

function MiniQueueChip({
  label,
  tone = "safe",
}: {
  label: string;
  tone?: RequirementValidationSummary["severity"];
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-bold ${
        tone === "review"
          ? "tone-warning"
          : tone === "attention"
            ? "theme-shell-card-slate"
            : "tone-positive"
      }`}
    >
      {label}
    </span>
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
    <article className="premium-panel rounded-[1.5rem] p-5 pb-24 sm:p-6 sm:pb-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="theme-shell-kicker mono-label text-[0.64rem]">
            Row {requirement.sourceRowNumber}
          </p>
          <h3 className="theme-shell-title mt-2 break-words text-3xl font-black tracking-[-0.045em]">
            {requirement.requirementId || "No requirement ID"}
          </h3>
        </div>
        <StatusBadge status={requirement.reviewStatus} />
      </div>

      <div className="theme-shell-card mt-5 rounded-[1.25rem] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="theme-shell-subtle mono-label text-[0.58rem]">
            Requirement
          </span>
          <TinyInfoPill label="L2" value={emptyValue(requirement.l2Process)} />
          <TinyInfoPill
            label="L3"
            value={emptyValue(requirement.l3Process || requirement.operation)}
          />
          <TinyInfoPill label="Demo" value={formatBoolean(requirement.demo)} />
          <TinyInfoPill label="MVP" value={formatBoolean(requirement.mvp)} />
        </div>
        <p className="theme-shell-title mt-2 text-base leading-7">
          {emptyValue(requirement.requirementDescription)}
        </p>
      </div>

      <RequirementValidationStrip validation={validation} />

      {draft ? (
        <section className="mt-5 grid gap-4">
          <div className="theme-shell-card-brand rounded-[1.25rem] p-4">
            <p className="theme-shell-subtle mono-label text-[0.58rem]">
              Draft comment
            </p>
            <p className="theme-shell-title mt-2 whitespace-pre-wrap text-sm leading-7">
              {draft.generatedComment}
            </p>
          </div>

          <div className="theme-shell-card rounded-[1.25rem] p-4">
            <p className="theme-shell-subtle mono-label text-[0.58rem]">
              Demo steps
            </p>
            <ol className="mt-3 grid gap-3">
              {draft.demoSteps.map((step, index) => (
                <li
                  key={step.id}
                  className="theme-shell-card-soft rounded-2xl p-3"
                >
                  <p className="theme-shell-title text-sm font-bold">
                    {index + 1}. {step.title}
                  </p>
                  <p className="theme-shell-kicker mt-1 text-xs font-semibold">
                    {step.mesModuleOrScreen}
                  </p>
                  <ol className="theme-shell-body mt-2 list-decimal space-y-1 pl-5 text-sm leading-6">
                    {step.instructions.map((instruction) => (
                      <li key={instruction}>{instruction}</li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </div>

          <div className="theme-shell-card sticky bottom-3 z-20 rounded-[1.25rem] border-[color:var(--shell-border-strong)] p-3 shadow-[var(--shadow-soft)] backdrop-blur sm:p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="theme-shell-kicker mono-label text-[0.58rem]">
                  Consultant decision
                </p>
                <p className="theme-shell-body mt-1 text-sm leading-6">
                  Make the row decision now, then add notes or evidence only if
                  you need them.
                </p>
              </div>
              <StatusBadge status={requirement.reviewStatus} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
                onClick={() =>
                  onReviewAction(requirement, { type: "resetToDraft" })
                }
                tone="neutral"
              />
            </div>
          </div>
        </section>
      ) : (
        <GuidedBlockerCard
          actionLabel="Back to generation"
          body="This requirement is selected but does not have a draft yet."
          onAction={() => onSelectNext(null)}
          title="No generated draft"
        />
      )}

      <details className="theme-shell-card mt-5 rounded-[1.25rem] p-4">
        <summary className="theme-shell-title cursor-pointer text-sm font-bold">
          Consultant edits and decision notes
        </summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="theme-shell-subtle mono-label text-[0.62rem]">
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
              className="focus-premium theme-shell-input mt-2 min-h-28 w-full rounded-2xl p-3 text-sm leading-6"
            />
          </label>

          <label className="block">
            <span className="theme-shell-subtle mono-label text-[0.62rem]">
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
              className="focus-premium theme-shell-input mt-2 min-h-28 w-full rounded-2xl p-3 text-sm leading-6"
            />
          </label>
        </div>
      </details>

      <details className="theme-shell-card-soft mt-5 rounded-[1.25rem] p-4">
        <summary className="theme-shell-title cursor-pointer text-sm font-bold">
          Evidence and source context
        </summary>
        <div className="mt-4 grid gap-4">
          {draft ? (
            <>
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
                <p className="theme-shell-title text-sm font-semibold">
                  Source references
                </p>
                {draft.sourceReferences.length > 0 ? (
                  <ul className="theme-shell-body mt-2 space-y-2 text-sm leading-6">
                    {draft.sourceReferences.map((sourceReference) => (
                      <li
                        key={sourceReference.id}
                        className="theme-shell-card-soft rounded-2xl p-3"
                      >
                        <span className="theme-shell-title font-semibold">
                          {sourceReference.kind}
                        </span>
                        :{" "}
                        {sourceReference.url ? (
                          <a
                            className="theme-shell-kicker font-semibold underline underline-offset-4"
                            href={sourceReference.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {sourceReference.label}
                          </a>
                        ) : (
                          <span className="theme-shell-title font-semibold">
                            {sourceReference.label}
                          </span>
                        )}{" "}
                        {sourceReference.note}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="theme-shell-subtle mt-2 text-sm leading-6">
                    No source references recorded for this draft.
                  </p>
                )}
              </div>
            </>
          ) : null}

          <dl className="grid gap-3 md:grid-cols-2">
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
        </div>
      </details>
    </article>
  );
}

function TinyInfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="theme-shell-card rounded-full px-3 py-1.5 text-xs font-bold">
      <span className="theme-shell-subtle">{label}</span> {value}
    </span>
  );
}

export function ExportWorkflowStep({
  assembly,
  onGoToReview,
  onGoToScript,
  projectMetadata,
  showFrame = true,
}: {
  assembly: ReturnType<typeof assembleDemoScript>;
  onGoToReview: () => void;
  onGoToScript: () => void;
  projectMetadata: ReviewProjectMetadata;
  showFrame?: boolean;
}) {
  const content = (
    <DemoScriptExportPanel
      assembly={assembly}
      onSwitchToReview={onGoToReview}
      onSwitchToScript={onGoToScript}
      projectMetadata={projectMetadata}
    />
  );

  if (!showFrame) {
    return content;
  }

  return (
    <GuidedStepFrame
      eyebrow="Step 5"
      title="Export the Phase 1 demo document"
      summary="This is the completion moment: a separate Markdown document with approved comments, demo steps, assumptions, warnings, and traceability."
    >
      {content}
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
    <section className="theme-shell-card-slate rounded-2xl border border-dashed p-6">
      <p className="theme-shell-kicker mono-label text-[0.68rem]">
        Blocked state
      </p>
      <h3 className="theme-shell-title mt-2 text-3xl font-black tracking-[-0.04em]">
        {title}
      </h3>
      <p className="theme-shell-body mt-3 max-w-2xl text-sm leading-7">
        {body}
      </p>
      <button
        type="button"
        onClick={onAction}
        className="focus-premium theme-button-primary mt-5 rounded-2xl px-5 py-3 text-sm font-black transition"
      >
        {actionLabel}
      </button>
    </section>
  );
}

function RequirementsExplorer({
  allFilteredRequirementsSelected,
  allRequirements,
  disclosureLabel,
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
  disclosureLabel?: string;
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
    <details className="theme-shell-card mt-5 rounded-[1.25rem] p-4">
      <summary className="theme-shell-title cursor-pointer text-sm font-bold">
        {disclosureLabel ??
          "Open all requirements for search, filtering, and custom selection"}
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
                  ? "theme-shell-card-brand"
                  : "theme-shell-card-soft hover:bg-[color:var(--shell-soft-surface-hover)]"
              }`}
            >
              <span className="theme-shell-title block text-xs font-bold">
                {filterLabels[nextFilter]}
              </span>
              <span className="theme-shell-title mt-2 block font-mono text-2xl font-black">
                {getFilterCount(summary, nextFilter)}
              </span>
              <span className="theme-shell-subtle mt-1 block text-[0.68rem] leading-4">
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
            className="focus-premium theme-shell-input w-full rounded-2xl px-4 py-3 text-sm"
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
    <div className="theme-shell-table max-w-full overflow-x-auto rounded-[1.25rem]">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="theme-shell-table-head font-mono text-[0.68rem] uppercase tracking-[0.12em]">
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
                className="h-4 w-4 accent-[#00558C]"
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
                className={`transition ${
                  isSelected
                    ? "theme-shell-table-row-active"
                    : "theme-shell-table-row"
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
                    className="h-4 w-4 accent-[#00558C]"
                  />
                </td>
                <td className="theme-shell-title px-4 py-4 align-top font-mono">
                  <button
                    type="button"
                    onClick={() => onSelectRequirement(requirement)}
                    className="focus-premium rounded-md text-left font-bold underline-offset-4 hover:underline"
                  >
                    {requirement.requirementId || "No ID"}
                  </button>
                </td>
                <td className="theme-shell-body px-4 py-4 align-top font-mono">
                  {requirement.sourceRowNumber}
                </td>
                <td className="theme-shell-title max-w-xl px-4 py-4 align-top leading-6">
                  <button
                    type="button"
                    onClick={() => onSelectRequirement(requirement)}
                    className="focus-premium rounded-md text-left underline-offset-4 hover:underline"
                  >
                    {emptyValue(requirement.requirementDescription)}
                  </button>
                </td>
                <td className="theme-shell-body px-4 py-4 align-top">
                  {emptyValue(requirement.l2Process)}
                </td>
                <td className="theme-shell-body px-4 py-4 align-top">
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

export function WorkspaceSourcePanel({
  demoCount,
  feedback,
  mvpCount,
  onContinue,
  onRestoreFixtureSource,
  onToggleDetails,
  onTogglePreview,
  onUploadWorkbook,
  previewRows,
  sourceMetadata,
  sourceDetailsExpanded,
  sourcePreviewExpanded,
  sourceRowCount,
}: {
  demoCount: number;
  feedback: SourceFeedback | null;
  mvpCount: number;
  onContinue: () => void;
  onRestoreFixtureSource: () => void;
  onToggleDetails: () => void;
  onTogglePreview: () => void;
  onUploadWorkbook: (event: ChangeEvent<HTMLInputElement>) => void;
  previewRows: ReviewRequirement[];
  sourceMetadata: RequirementsSourceMetadata;
  sourceDetailsExpanded: boolean;
  sourcePreviewExpanded: boolean;
  sourceRowCount: number;
}) {
  const isFixtureSource = sourceMetadata.sourceKind === "fixture";
  const sourceKindLabel = isFixtureSource
    ? "Sample workbook"
    : "Uploaded workbook";
  const previewCount = previewRows.length;
  const sourceStatus = isFixtureSource
    ? "Customer X sample workbook is active for the fastest Phase 1 walkthrough."
    : "Uploaded workbook is active and its saved review state is loaded.";
  const sourceHint = isFixtureSource
    ? "Upload another workbook only when you want to replace the sample for this run."
    : "Upload a new workbook to replace this source, or restore the sample workbook.";

  return (
    <section className="grid min-w-0 gap-4">
      <article className="theme-shell-card rounded-[1.5rem] p-5 sm:p-6">
        <div
          className={`rounded-[1.35rem] border p-4 sm:p-5 ${
            isFixtureSource
              ? "theme-shell-card-brand"
              : "theme-shell-card-slate"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <p className="theme-shell-subtle mono-label text-[0.56rem]">
                  Current source
                </p>
                <span className="tone-neutral-subtle rounded-full border px-3 py-1 text-[0.65rem] font-bold">
                  {sourceKindLabel}
                </span>
              </div>
              <h3 className="theme-shell-title mt-2 text-xl font-bold tracking-[-0.03em] sm:text-2xl">
                {sourceMetadata.sourceLabel}
              </h3>
              <p className="theme-shell-body mt-2 text-sm leading-6">
                {sourceStatus}
              </p>
              <p className="theme-shell-subtle mt-2 break-all text-xs leading-5">
                {sourceMetadata.sourceFilename}
              </p>
            </div>

            <button
              type="button"
              onClick={onContinue}
              className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-black transition lg:mt-1"
            >
              Continue to generation
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SourceMeta label="Rows" value={sourceRowCount.toLocaleString()} />
            <SourceMeta label="Demo" value={demoCount.toLocaleString()} />
            <SourceMeta label="MVP" value={mvpCount.toLocaleString()} />
          </div>
        </div>

        <div className="theme-shell-card-soft mt-4 rounded-[1.35rem] p-4 sm:p-5">
          <p className="theme-shell-subtle mono-label text-[0.56rem]">
            Replace source
          </p>
          <h4 className="theme-shell-title mt-2 text-lg font-bold">
            Upload another workbook only when you need to change the input
          </h4>
          <p className="theme-shell-body mt-2 text-sm leading-6">
            {sourceHint}
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="focus-premium theme-shell-button-secondary inline-flex cursor-pointer justify-center rounded-2xl px-4 py-3 text-sm font-bold transition">
              Upload .xlsx workbook
              <input
                accept=".xlsx"
                type="file"
                onChange={onUploadWorkbook}
                className="sr-only"
              />
            </label>

            {!isFixtureSource ? (
              <button
                type="button"
                onClick={onRestoreFixtureSource}
                className="focus-premium theme-shell-button-secondary rounded-2xl px-4 py-3 text-sm font-bold transition"
              >
                Restore sample workbook
              </button>
            ) : null}
          </div>

          {feedback ? (
            <div
              className={`mt-4 rounded-[1.1rem] border px-4 py-3 text-sm leading-6 ${
                feedback.tone === "success"
                  ? "tone-positive"
                  : feedback.tone === "error"
                    ? "tone-warning"
                    : "tone-neutral"
              }`}
              role="status"
              aria-live="polite"
            >
              {feedback.message}
            </div>
          ) : null}
        </div>
      </article>

      <section className="theme-shell-card rounded-[1.5rem] p-4 sm:p-5">
        <p className="theme-shell-kicker mono-label text-[0.58rem]">
          Validate parsed workbook
        </p>
        <h4 className="theme-shell-title mt-2 text-lg font-bold">
          Open the checks only when you want to confirm the parser read the
          workbook correctly
        </h4>
        <p className="theme-shell-body mt-2 text-sm leading-6">
          The preview and workbook details stay secondary for the sample, then
          open automatically after a new upload so you can verify the parsed
          input immediately.
        </p>

        <div className="mt-4 grid gap-3">
          <div className="theme-shell-card-soft rounded-[1.25rem] p-3 sm:p-4">
            <button
              type="button"
              onClick={onTogglePreview}
              className="focus-premium flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-1 text-left transition"
              aria-expanded={sourcePreviewExpanded}
            >
              <div>
                <p className="theme-shell-title text-sm font-bold">
                  Preview parsed rows
                </p>
                <p className="theme-shell-body mt-1 text-sm leading-6">
                  Showing {previewCount} of {sourceRowCount} rows from the
                  active workbook.
                </p>
              </div>
              <span className="theme-shell-subtle text-xs font-bold">
                {sourcePreviewExpanded ? "Hide" : "Show"}
              </span>
            </button>

            {sourcePreviewExpanded ? (
              <SourceWorkbookPreview
                previewRows={previewRows}
                sourceRowCount={sourceRowCount}
              />
            ) : null}
          </div>

          <div className="theme-shell-card-soft rounded-[1.25rem] p-3 sm:p-4">
            <button
              type="button"
              onClick={onToggleDetails}
              className="focus-premium flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-1 text-left transition"
              aria-expanded={sourceDetailsExpanded}
            >
              <div>
                <p className="theme-shell-title text-sm font-bold">
                  Workbook details
                </p>
                <p className="theme-shell-body mt-1 text-sm leading-6">
                  Project, customer, filename, and row counts for the active
                  source.
                </p>
              </div>
              <span className="theme-shell-subtle text-xs font-bold">
                {sourceDetailsExpanded ? "Hide" : "Show"}
              </span>
            </button>

            {sourceDetailsExpanded ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <dl className="grid gap-3">
                  <SourceDetailRow
                    label="Project"
                    value={sourceMetadata.projectName}
                  />
                  <SourceDetailRow
                    label="Customer"
                    value={sourceMetadata.customerName}
                  />
                  <SourceDetailRow
                    label="Source label"
                    value={sourceMetadata.sourceLabel}
                  />
                  <SourceDetailRow
                    label="Filename"
                    value={sourceMetadata.sourceFilename}
                  />
                </dl>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <SourceMeta
                    label="Rows"
                    value={sourceRowCount.toLocaleString()}
                  />
                  <SourceMeta label="Demo" value={demoCount.toLocaleString()} />
                  <SourceMeta label="MVP" value={mvpCount.toLocaleString()} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
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
    <div className="theme-shell-card-soft min-w-0 rounded-2xl p-3">
      <p className="theme-shell-subtle mono-label text-[0.56rem]">{label}</p>
      <p
        className={`theme-shell-title mt-2 text-sm font-bold ${
          breakWords ? "break-all" : "truncate"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SourceDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="theme-shell-subtle text-xs font-semibold uppercase tracking-[0.16em]">
        {label}
      </dt>
      <dd className="theme-shell-title break-all text-right text-sm font-bold">
        {value}
      </dd>
    </div>
  );
}

function SourceWorkbookPreview({
  previewRows,
  sourceRowCount,
}: {
  previewRows: ReviewRequirement[];
  sourceRowCount: number;
}) {
  return (
    <div className="mt-5 grid gap-3">
      <div className="theme-shell-card-soft rounded-[1.25rem] px-4 py-3 text-sm leading-6">
        <span className="theme-shell-title font-bold">
          Showing {previewRows.length} of {sourceRowCount}
        </span>{" "}
        parsed rows from the active workbook.
      </div>

      <div className="theme-shell-table max-w-full overflow-x-auto rounded-[1.25rem]">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead className="theme-shell-table-head font-mono text-[0.68rem] uppercase tracking-[0.12em]">
            <tr>
              <th className="px-4 py-4 font-semibold">ID</th>
              <th className="px-4 py-4 font-semibold">Row</th>
              <th className="px-4 py-4 font-semibold">Requirement</th>
              <th className="px-4 py-4 font-semibold">L2 process</th>
              <th className="px-4 py-4 font-semibold">L3 or operation</th>
              <th className="px-4 py-4 font-semibold">Demo</th>
              <th className="px-4 py-4 font-semibold">MVP</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((requirement) => (
              <tr
                key={`source-preview-${requirement.requirementKey}`}
                className="theme-shell-table-row"
              >
                <td className="theme-shell-title px-4 py-4 align-top font-mono">
                  {requirement.requirementId || "No ID"}
                </td>
                <td className="theme-shell-body px-4 py-4 align-top font-mono">
                  {requirement.sourceRowNumber}
                </td>
                <td className="theme-shell-title max-w-xl px-4 py-4 align-top leading-6">
                  {emptyValue(requirement.requirementDescription)}
                </td>
                <td className="theme-shell-body px-4 py-4 align-top">
                  {emptyValue(requirement.l2Process)}
                </td>
                <td className="theme-shell-body px-4 py-4 align-top">
                  {emptyValue(requirement.l3Process || requirement.operation)}
                </td>
                <td className="px-4 py-4 align-top">
                  <FlagBadge active={requirement.demo} />
                </td>
                <td className="px-4 py-4 align-top">
                  <FlagBadge active={requirement.mvp} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    ? "tone-positive"
    : validation.severity === "attention"
      ? "tone-warning"
      : "tone-danger";

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
                  ? "tone-positive"
                  : validation.severity === "attention"
                    ? "tone-warning"
                    : "tone-danger"
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
      <p className="theme-shell-subtle mono-label text-[0.58rem]">{label}</p>
      {items.length > 0 ? (
        <ul className="theme-shell-body mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="theme-shell-body mt-2 text-sm leading-6">{emptyText}</p>
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
      ? "theme-button-primary"
      : tone === "review"
        ? "tone-warning hover:brightness-[0.98]"
        : "theme-shell-button-secondary";

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
    <div className="theme-shell-card-soft rounded-2xl p-4">
      <dt className="theme-shell-subtle mono-label text-[0.58rem]">{label}</dt>
      <dd className="theme-shell-title mt-2 whitespace-pre-wrap break-words text-sm leading-6">
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
      <p className="theme-shell-kicker mono-label text-[0.68rem]">
        Empty filter
      </p>
      <h2 className="theme-shell-title mt-2 text-2xl font-bold tracking-[-0.03em]">
        {searchQuery.trim().length > 0
          ? "No rows match this search"
          : `No ${filterLabels[filter].toLowerCase()} yet`}
      </h2>
      <p className="theme-shell-body mt-4 max-w-2xl leading-7">{emptyCopy}</p>
    </div>
  );
}

function FlagBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex min-w-16 justify-center rounded-md border px-2 py-1 text-xs font-semibold ${
        active ? "tone-positive" : "tone-neutral"
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
