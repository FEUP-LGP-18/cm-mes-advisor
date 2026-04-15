"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  mockGenerationStageLabels,
  type GeneratedRequirementDraft,
  type MockGenerationStage,
} from "@/lib/requirements/generation";
import {
  assembleDemoScript,
  type DemoScriptDraftAction,
} from "@/lib/requirements/demo-script";
import {
  buildReviewRequirements,
  createRequirementsReviewState,
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
import type { ParsedRequirement } from "@/lib/requirements/parser";
import {
  CUSTOMER_X_REVIEW_STORAGE_KEY,
  loadRequirementsReviewState,
  parseRequirementsReviewState,
  saveRequirementsReviewState,
} from "@/lib/requirements/review-storage";
import type { RequirementGenerationRouteBody } from "@/lib/requirements/generation-api";
import DemoScriptPanel from "./demo-script-panel";

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
  all: "All parsed requirements from the fixture.",
  demo: "Rows marked for demo in the source Excel file.",
  mvp: "Rows marked as MVP in the source Excel file.",
  pending: "Rows waiting for review actions or future AI drafts.",
  review: "Rows flagged for consultant review or workaround decisions.",
  approved: "Rows accepted for the Phase 1 demo-script flow.",
  skipped: "Rows intentionally left out of the current review slice.",
};

const statusStyles: Record<RequirementReviewStatus, string> = {
  pending: "border-[#d0d7de] bg-[#f7f9fa] text-[#30363d]",
  review: "border-[#f59e0b] bg-[#fff7ed] text-[#92400e]",
  approved: "border-[#0f766e] bg-[#e8f4f1] text-[#0f5132]",
  skipped: "border-[#8b949e] bg-[#f3f4f6] text-[#4b5563]",
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

interface RequirementsReviewWorkspaceProps {
  projectMetadata: ReviewProjectMetadata;
  requirements: ParsedRequirement[];
}

export default function RequirementsReviewWorkspace({
  projectMetadata,
  requirements,
}: RequirementsReviewWorkspaceProps) {
  const fallbackReviewState = useMemo(
    () => createRequirementsReviewState(projectMetadata),
    [projectMetadata],
  );
  const reviewStorageSnapshot = useSyncExternalStore(
    subscribeReviewStorage,
    readReviewStorageSnapshot,
    getServerReviewStorageSnapshot,
  );
  const reviewState = useMemo(
    () =>
      parseRequirementsReviewState(reviewStorageSnapshot, fallbackReviewState),
    [fallbackReviewState, reviewStorageSnapshot],
  );
  const [activeFilter, setActiveFilter] =
    useState<RequirementReviewFilter>("all");
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<
    "review" | "script"
  >("review");

  const reviewRequirements = useMemo(
    () => buildReviewRequirements(requirements, reviewState.requirements),
    [requirements, reviewState.requirements],
  );
  const demoScriptAssembly = useMemo(
    () => assembleDemoScript(reviewRequirements, reviewState.demoScriptDraft),
    [reviewRequirements, reviewState.demoScriptDraft],
  );
  const summary = useMemo(
    () => summarizeReviewRequirements(reviewRequirements),
    [reviewRequirements],
  );
  const filteredRequirements = useMemo(
    () => filterReviewRequirements(reviewRequirements, activeFilter),
    [activeFilter, reviewRequirements],
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
  const allFilteredRequirementsSelected =
    filteredRequirements.length > 0 &&
    filteredRequirements.every((requirement) =>
      selectedRequirementKeys.has(requirement.requirementKey),
    );

  function handleReviewAction(
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) {
    const currentState = loadRequirementsReviewState(
      window.localStorage,
      fallbackReviewState,
    );
    const nextState = updateRequirementsReviewState(
      currentState,
      requirement,
      action,
    );

    saveRequirementsReviewState(window.localStorage, nextState);
    window.dispatchEvent(new Event(reviewStorageChangeEventName));
  }

  function handleDemoScriptAction(action: DemoScriptDraftAction) {
    const currentState = loadRequirementsReviewState(
      window.localStorage,
      fallbackReviewState,
    );
    const nextState = updateRequirementsDemoScriptDraft(currentState, action);

    saveRequirementsReviewState(window.localStorage, nextState);
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
      const allFilteredSelected = filteredRequirements.every((requirement) =>
        nextSelection.has(requirement.requirementKey),
      );

      filteredRequirements.forEach((requirement) => {
        if (allFilteredSelected) {
          nextSelection.delete(requirement.requirementKey);
        } else {
          nextSelection.add(requirement.requirementKey);
        }
      });

      return nextSelection;
    });
  }

  async function handleGenerateSelectedRows() {
    if (selectedRequirements.length === 0 || isGenerating) {
      setMockGenerationRun(createIdleGenerationRun());
      return;
    }

    setIsGenerating(true);
    setGenerationFeedback(null);
    setMockGenerationRun({
      selectedCount: selectedRequirements.length,
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
          requirements: selectedRequirements.map(
            toGenerationRequestRequirement,
          ),
        }),
      });

      const responseBody = (await response
        .json()
        .catch(() => null)) as RequirementGenerationRouteBody | null;

      if (!response.ok || !responseBody || !responseBody.ok) {
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
          selectedCount: selectedRequirements.length,
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
      const selectedRequirementKeys = selectedRequirements.map(
        (requirement) => requirement.requirementKey,
      );
      const responseRequirementKeys = responseBody.drafts.map(
        (draft) => draft.requirement.requirementKey,
      );
      const responseMatchesSelection =
        responseBody.drafts.length === selectedRequirements.length &&
        selectedRequirementKeys.every((requirementKey, index) => {
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
          selectedCount: selectedRequirements.length,
          generatedCount: 0,
          stages: mockGenerationStageLabels.map((label) => ({
            label,
            status: "waiting",
          })),
        });
        return;
      }

      const currentState = loadRequirementsReviewState(
        window.localStorage,
        fallbackReviewState,
      );
      const nextState = selectedRequirements.reduce((state, requirement) => {
        const draft = draftsByRequirementKey.get(requirement.requirementKey);

        if (!draft) {
          return state;
        }

        return updateRequirementsReviewState(state, requirement, {
          type: "storeMockGeneratedDraft",
          generatedOutput: draft,
        });
      }, currentState);

      saveRequirementsReviewState(window.localStorage, nextState);
      setMockGenerationRun({
        selectedCount: selectedRequirements.length,
        generatedCount: responseBody.drafts.length,
        stages: mockGenerationStageLabels.map((label) => ({
          label,
          status: "complete",
        })),
      });
      setGenerationFeedback({
        tone: "success",
        message: `Generated ${responseBody.drafts.length} server-side draft(s) in mock mode.`,
      });
      window.dispatchEvent(new Event(reviewStorageChangeEventName));
    } catch {
      setGenerationFeedback({
        tone: "error",
        message:
          "Server generation could not be reached. No local review state was changed.",
      });
      setMockGenerationRun({
        selectedCount: selectedRequirements.length,
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

  return (
    <div className="grid gap-6">
      <section
        aria-label="Requirement filters"
        className="grid gap-3 md:grid-cols-3 xl:grid-cols-7"
      >
        {requirementReviewFilters.map((filter) => (
          <button
            key={filter}
            type="button"
            aria-pressed={activeFilter === filter}
            onClick={() => {
              setActiveFilter(filter);
              setSelectedRowNumber(null);
            }}
            className={`min-h-28 rounded-lg border p-4 text-left transition ${
              activeFilter === filter
                ? "border-[#0f766e] bg-[#e8f4f1] text-[#102a27]"
                : "border-[#d0d7de] bg-white text-[#30363d] hover:border-[#8aa8a2]"
            }`}
          >
            <span className="block text-sm font-semibold">
              {filterLabels[filter]}
            </span>
            <span className="mt-2 block text-3xl font-semibold">
              {getFilterCount(summary, filter)}
            </span>
            <span className="mt-2 block text-xs leading-5 text-[#59636e]">
              {filterDescriptions[filter]}
            </span>
          </button>
        ))}
      </section>

      <MockGenerationPanel
        onGenerateSelectedRows={handleGenerateSelectedRows}
        feedback={generationFeedback}
        isGenerating={isGenerating}
        runState={mockGenerationRun}
        selectedCount={selectedRequirements.length}
      />

      <section className="rounded-lg border border-[#d0d7de] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 rounded-full border border-[#d0d7de] bg-[#f8fbfb] p-1">
            <WorkspaceTabButton
              active={activeWorkspaceTab === "review"}
              label="Review"
              onClick={() => setActiveWorkspaceTab("review")}
            />
            <WorkspaceTabButton
              active={activeWorkspaceTab === "script"}
              label="Demo Script"
              onClick={() => setActiveWorkspaceTab("script")}
            />
          </div>
          <p className="rounded-md border border-[#d0d7de] bg-[#f8fbfb] px-3 py-2 text-sm font-semibold text-[#59636e]">
            Phase 2 is optional. Markdown export is available from the Demo
            Script tab once generated rows are approved.
          </p>
        </div>

        <div className="mt-5">
          {activeWorkspaceTab === "review" ? (
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
              <div className="overflow-hidden rounded-lg border border-[#d0d7de] bg-white">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#d0d7de] p-5">
                  <div>
                    <h2 className="text-xl font-semibold text-[#111827]">
                      Requirements
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#59636e]">
                      {filteredRequirements.length} rows in{" "}
                      {filterLabels[activeFilter].toLowerCase()}. Select one
                      requirement to inspect the original Excel data and record
                      local review decisions.
                    </p>
                  </div>
                  <p className="rounded-md border border-[#d0d7de] px-3 py-2 text-sm font-semibold text-[#30363d]">
                    Local browser state
                  </p>
                </div>

                {filteredRequirements.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                      <thead className="bg-[#f0f3f3] text-xs uppercase text-[#4b5563]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">
                            <span className="sr-only">Select rows</span>
                            <input
                              type="checkbox"
                              checked={allFilteredRequirementsSelected}
                              onChange={handleToggleAllFilteredRequirements}
                              aria-label={
                                allFilteredRequirementsSelected
                                  ? "Clear selected filtered rows"
                                  : "Select all filtered rows"
                              }
                              className="h-4 w-4 accent-[#0f766e]"
                            />
                          </th>
                          <th className="px-4 py-3 font-semibold">ID</th>
                          <th className="px-4 py-3 font-semibold">Excel row</th>
                          <th className="px-4 py-3 font-semibold">
                            Requirement
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            L2 process
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            L3 or operation
                          </th>
                          <th className="px-4 py-3 font-semibold">Demo</th>
                          <th className="px-4 py-3 font-semibold">MVP</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRequirements.map((requirement) => {
                          const isSelected =
                            requirement.sourceRowNumber === selectedRowNumber;
                          const isChecked = selectedRequirementKeys.has(
                            requirement.requirementKey,
                          );

                          return (
                            <tr
                              key={requirement.requirementKey}
                              className={`border-t border-[#e5e7eb] ${
                                isSelected ? "bg-[#e8f4f1]" : "bg-white"
                              }`}
                            >
                              <td className="px-4 py-3 align-top">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    handleToggleRequirementSelection(
                                      requirement.requirementKey,
                                    )
                                  }
                                  aria-label={`Select requirement ${
                                    requirement.requirementId ||
                                    requirement.sourceRowNumber
                                  } for mock generation`}
                                  className="h-4 w-4 accent-[#0f766e]"
                                />
                              </td>
                              <td className="px-4 py-3 align-top font-semibold text-[#0f766e]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedRowNumber(
                                      requirement.sourceRowNumber,
                                    )
                                  }
                                  className="rounded-md text-left font-semibold underline-offset-4 hover:underline"
                                >
                                  {requirement.requirementId || "No ID"}
                                </button>
                              </td>
                              <td className="px-4 py-3 align-top text-[#30363d]">
                                {requirement.sourceRowNumber}
                              </td>
                              <td className="max-w-lg px-4 py-3 align-top leading-6 text-[#1f2937]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedRowNumber(
                                      requirement.sourceRowNumber,
                                    )
                                  }
                                  className="rounded-md text-left underline-offset-4 hover:underline"
                                >
                                  {emptyValue(
                                    requirement.requirementDescription,
                                  )}
                                </button>
                              </td>
                              <td className="px-4 py-3 align-top text-[#30363d]">
                                {emptyValue(requirement.l2Process)}
                              </td>
                              <td className="px-4 py-3 align-top text-[#30363d]">
                                {emptyValue(
                                  requirement.l3Process ||
                                    requirement.operation,
                                )}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <FlagBadge active={requirement.demo} />
                              </td>
                              <td className="px-4 py-3 align-top">
                                <FlagBadge active={requirement.mvp} />
                              </td>
                              <td className="px-4 py-3 align-top">
                                <StatusBadge
                                  status={requirement.reviewStatus}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyFilterState filter={activeFilter} />
                )}
              </div>

              <RequirementDetail
                onReviewAction={handleReviewAction}
                requirement={selectedRequirement}
              />
            </section>
          ) : (
            <DemoScriptPanel
              assembly={demoScriptAssembly}
              draft={reviewState.demoScriptDraft}
              onDraftAction={handleDemoScriptAction}
              onSwitchToReview={() => setActiveWorkspaceTab("review")}
              projectMetadata={projectMetadata}
            />
          )}
        </div>
      </section>
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

function MockGenerationPanel({
  onGenerateSelectedRows,
  feedback,
  isGenerating,
  runState,
  selectedCount,
}: {
  onGenerateSelectedRows: () => void | Promise<void>;
  feedback: GenerationFeedback | null;
  isGenerating: boolean;
  runState: MockGenerationRunState;
  selectedCount: number;
}) {
  return (
    <section
      aria-label="Mock generation"
      className="rounded-lg border border-[#d0d7de] bg-white p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-[#0f766e]">
            Mock generation
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#111827]">
            Generation contract preview
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#59636e]">
            Selected rows request drafts from the server route. Mock remains the
            default provider, and real Bedrock or MCP integration stays
            server-only until the future protocol is finalized.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerateSelectedRows}
          disabled={selectedCount === 0 || isGenerating}
          className="rounded-md border border-[#0f766e] bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c5f59] disabled:cursor-not-allowed disabled:border-[#a8b3bd] disabled:bg-[#e5e7eb] disabled:text-[#59636e]"
        >
          {isGenerating
            ? "Generating drafts through server route..."
            : "Generate drafts for selected rows"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {runState.stages.map((stage) => (
          <div
            key={stage.label}
            className="min-h-24 rounded-md border border-[#d0d7de] bg-[#f8fbfb] p-3"
          >
            <p className="text-xs font-semibold uppercase text-[#59636e]">
              {stage.status}
            </p>
            <p className="mt-2 text-sm font-semibold text-[#111827]">
              {stage.label}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-6 text-[#4b5563]">
        {selectedCount} rows selected. Latest run generated{" "}
        {runState.generatedCount} of {runState.selectedCount} selected rows.
      </p>

      {feedback ? (
        <div
          className={`mt-4 rounded-md border px-4 py-3 text-sm leading-6 ${
            feedback.tone === "success"
              ? "border-[#0f766e] bg-[#e8f4f1] text-[#0f5132]"
              : feedback.tone === "error"
                ? "border-[#f59e0b] bg-[#fff7ed] text-[#92400e]"
                : "border-[#d0d7de] bg-[#f7f9fa] text-[#30363d]"
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

function WorkspaceTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-[#0f766e] text-white"
          : "bg-transparent text-[#59636e] hover:bg-[#e8f4f1] hover:text-[#0f766e]"
      }`}
    >
      {label}
    </button>
  );
}

function RequirementDetail({
  onReviewAction,
  requirement,
}: {
  onReviewAction: (
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) => void;
  requirement: ReviewRequirement | null;
}) {
  if (!requirement) {
    return (
      <aside className="min-h-[420px] rounded-lg border border-dashed border-[#a8b3bd] bg-white p-6">
        <p className="text-sm font-semibold uppercase text-[#0f766e]">
          No row selected
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[#111827]">
          Select a requirement to inspect details
        </h2>
        <p className="mt-4 leading-7 text-[#4b5563]">
          Choose any row from the requirements list to review the full parsed
          Excel values, including the original source comment. Epic 3 adds local
          notes, review status actions, skip handling, and refresh-safe
          prototype persistence.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-[#d0d7de] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[#0f766e]">
            Requirement details
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
            {requirement.requirementId || "No requirement ID"}
          </h2>
        </div>
        <StatusBadge status={requirement.reviewStatus} />
      </div>

      <ReviewActionsPanel
        onReviewAction={onReviewAction}
        requirement={requirement}
      />

      <dl className="mt-6 grid gap-4">
        <DetailField label="Source Excel row">
          {requirement.sourceRowNumber}
        </DetailField>
        <DetailField label="Requirement description">
          {emptyValue(requirement.requirementDescription)}
        </DetailField>
        <DetailField label="L2 process">
          {emptyValue(requirement.l2Process)}
        </DetailField>
        <DetailField label="L3 process">
          {emptyValue(requirement.l3Process)}
        </DetailField>
        <DetailField label="Operation">
          {emptyValue(requirement.operation)}
        </DetailField>
        <DetailField label="Demo raw / normalized">
          {emptyValue(requirement.demoRaw)} / {formatBoolean(requirement.demo)}
        </DetailField>
        <DetailField label="MVP raw / normalized">
          {emptyValue(requirement.mvpRaw)} / {formatBoolean(requirement.mvp)}
        </DetailField>
        <DetailField label="Priority fields">
          EMS: {emptyValue(requirement.prioEms)}; CWS:{" "}
          {emptyValue(requirement.prioCws)}
        </DetailField>
        <DetailField label="Availability fields">
          Availability: {emptyValue(requirement.availability)}; CM:{" "}
          {emptyValue(requirement.availabilityCm)}
        </DetailField>
        <DetailField label="Description availability">
          {emptyValue(requirement.descriptionAvailability)}
        </DetailField>
        <DetailField label="Supported percentage">
          {emptyValue(requirement.supportedPercent)}
        </DetailField>
        <DetailField label="Source comment from Excel, not AI output">
          {emptyValue(requirement.sourceComment)}
        </DetailField>
      </dl>
    </aside>
  );
}

function ReviewActionsPanel({
  onReviewAction,
  requirement,
}: {
  onReviewAction: (
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) => void;
  requirement: ReviewRequirement;
}) {
  return (
    <section className="mt-6 rounded-lg border border-[#d0d7de] bg-[#f8fbfb] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#111827]">
            Consultant review state
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#4b5563]">
            Mock AI drafts are local deterministic placeholders. The editable
            consultant comment stays separate from the read-only Excel source
            comment.
          </p>
        </div>
        <span className="rounded-md border border-[#d0d7de] bg-white px-2 py-1 text-xs font-semibold text-[#59636e]">
          Auto-saved locally
        </span>
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase text-[#59636e]">
          Manual consultant comment
        </span>
        <textarea
          value={requirement.consultantComment}
          onChange={(event) =>
            onReviewAction(requirement, {
              type: "edit",
              consultantComment: event.currentTarget.value,
            })
          }
          placeholder="Generate a mock draft or add a manual consultant comment."
          className="mt-2 min-h-28 w-full rounded-md border border-[#c9d3d1] bg-white p-3 text-sm leading-6 text-[#1f2937] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#b7d7d1]"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase text-[#59636e]">
          Review note or reason
        </span>
        <textarea
          value={requirement.reviewNote}
          onChange={(event) =>
            onReviewAction(requirement, {
              type: "edit",
              reviewNote: event.currentTarget.value,
            })
          }
          placeholder="For example: needs Rui/MCP confirmation, workaround required, or not part of this demo slice."
          className="mt-2 min-h-20 w-full rounded-md border border-[#c9d3d1] bg-white p-3 text-sm leading-6 text-[#1f2937] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#b7d7d1]"
        />
      </label>

      <div className="mt-4 rounded-md border border-dashed border-[#a8b3bd] bg-white p-3 text-sm leading-6 text-[#4b5563]">
        Generated output:{" "}
        {requirement.generatedOutput.state === "mock-generated-draft"
          ? "mock generated draft available"
          : "not generated yet"}
        . Reset restores the latest generated draft when one exists; otherwise
        it clears manual edits. The source Excel comment remains read-only.
      </div>

      {requirement.generatedOutput.state === "mock-generated-draft" ? (
        <GeneratedDraftSummary draft={requirement.generatedOutput.draft} />
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <ReviewActionButton
          label="Approve"
          onClick={() => onReviewAction(requirement, { type: "approve" })}
          tone="approve"
        />
        <ReviewActionButton
          label="Flag for review"
          onClick={() => onReviewAction(requirement, { type: "flag" })}
          tone="review"
        />
        <ReviewActionButton
          label="Skip"
          onClick={() => onReviewAction(requirement, { type: "skip" })}
          tone="neutral"
        />
        <ReviewActionButton
          label="Reset to draft"
          onClick={() => onReviewAction(requirement, { type: "resetToDraft" })}
          tone="neutral"
        />
      </div>
    </section>
  );
}

function GeneratedDraftSummary({
  draft,
}: {
  draft: GeneratedRequirementDraft;
}) {
  return (
    <section className="mt-4 rounded-md border border-[#c9d3d1] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[#111827]">
            Mock generated draft
          </h4>
          <p className="mt-2 text-sm leading-6 text-[#4b5563]">
            Confidence: {draft.confidence.level} ({draft.confidence.score}) -{" "}
            {draft.confidence.rationale}
          </p>
        </div>
        <span className="rounded-md border border-[#d0d7de] bg-[#f7f9fa] px-2 py-1 text-xs font-semibold text-[#59636e]">
          {draft.generator}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[#59636e]">
            Generated comment
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#1f2937]">
            {draft.generatedComment}
          </p>
        </div>
        <GeneratedDraftList
          emptyText="No assumptions recorded for this mock draft."
          items={draft.assumptions}
          label="Assumptions"
        />
        <GeneratedDraftList
          emptyText="No warnings recorded for this mock draft."
          items={draft.warnings}
          label="Warnings"
        />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase text-[#59636e]">
          Demo steps
        </p>
        <ol className="mt-2 grid gap-3">
          {draft.demoSteps.map((step) => (
            <li
              key={step.id}
              className="rounded-md border border-[#e5e7eb] bg-[#f8fbfb] p-3 text-sm leading-6 text-[#1f2937]"
            >
              <p className="font-semibold">{step.title}</p>
              <p className="mt-1 text-[#4b5563]">
                {step.mesModuleOrScreen} - {step.reviewStatus}
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {step.instructions.map((instruction) => (
                  <li key={instruction}>{instruction}</li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase text-[#59636e]">
          Mock source references
        </p>
        <ul className="mt-2 grid gap-2">
          {draft.sourceReferences.map((sourceReference) => (
            <li
              key={sourceReference.id}
              className="text-sm leading-6 text-[#4b5563]"
            >
              <span className="font-semibold text-[#1f2937]">
                {sourceReference.kind}
              </span>
              : {sourceReference.label}. {sourceReference.note}
            </li>
          ))}
        </ul>
      </div>
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
      <p className="text-xs font-semibold uppercase text-[#59636e]">{label}</p>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#4b5563]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-[#4b5563]">{emptyText}</p>
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
      ? "border-[#0f766e] bg-[#0f766e] text-white hover:bg-[#0c5f59]"
      : tone === "review"
        ? "border-[#f59e0b] bg-[#fff7ed] text-[#92400e] hover:bg-[#ffedd5]"
        : "border-[#d0d7de] bg-white text-[#30363d] hover:bg-[#f3f4f6]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${toneClass}`}
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
    <div className="border-t border-[#e5e7eb] pt-4">
      <dt className="text-xs font-semibold uppercase text-[#59636e]">
        {label}
      </dt>
      <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#1f2937]">
        {children}
      </dd>
    </div>
  );
}

function EmptyFilterState({ filter }: { filter: RequirementReviewFilter }) {
  const emptyCopy =
    filter === "review" || filter === "approved" || filter === "skipped"
      ? "Use the row detail panel actions to move requirements into this review state."
      : "No source rows match this fixture-backed filter.";

  return (
    <div className="p-8">
      <p className="text-sm font-semibold uppercase text-[#0f766e]">
        Empty filter
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
        No {filterLabels[filter].toLowerCase()} yet
      </h2>
      <p className="mt-4 max-w-2xl leading-7 text-[#4b5563]">{emptyCopy}</p>
    </div>
  );
}

function FlagBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex min-w-16 justify-center rounded-md border px-2 py-1 text-xs font-semibold ${
        active
          ? "border-[#0f766e] bg-[#e8f4f1] text-[#0f5132]"
          : "border-[#d0d7de] bg-[#f7f9fa] text-[#59636e]"
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

function subscribeReviewStorage(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(reviewStorageChangeEventName, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(reviewStorageChangeEventName, onStoreChange);
  };
}

function readReviewStorageSnapshot(): string {
  try {
    return window.localStorage.getItem(CUSTOMER_X_REVIEW_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function getServerReviewStorageSnapshot(): string {
  return "";
}
