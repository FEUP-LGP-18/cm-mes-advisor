"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FvBadge,
  FvEmptyState,
  FvPageHeader,
  FvStatCard,
  FvTable,
  FvToolbar,
  type FvBadgeTone,
} from "@/components/ui/fv";
import type {
  RequirementReviewAction,
  ReviewRequirement,
} from "@/lib/requirements/review";
import {
  assessRequirementSupport,
  type RequirementGenerationConfidence,
} from "@/lib/requirements/generation";
import { evaluateRequirementValidation } from "@/lib/requirements/validation";

type ExplorerFilter = "all" | "pending" | "review" | "approved" | "skipped";
type ProcessFilter = "all" | string;

interface ReviewStudioProps {
  approvedCount: number;
  canEditPhase1?: boolean;
  generatedCount: number;
  generatedReviewableRequirements: ReviewRequirement[];
  onGenerateDemoRows: () => Promise<boolean>;
  onGoToGenerate: () => void;
  onOpenScript: () => void;
  onReviewAction: (
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) => void;
  projectId: string;
  reviewRequirements: ReviewRequirement[];
}

interface ReviewTableRow {
  aiComment: string;
  confidence: RequirementGenerationConfidence;
  confidenceTone: FvBadgeTone;
  isQueued: boolean;
  mesObject: string;
  process: string;
  requirement: ReviewRequirement;
  requirementId: string;
  requirementText: string;
  rowClassName: string;
  searchText: string;
  statusLabel: string;
  statusTone: FvBadgeTone;
}

const STATUS_LABEL: Record<ReviewRequirement["reviewStatus"], string> = {
  pending: "Pending",
  review: "Needs review",
  approved: "Approved",
  skipped: "Skipped",
};

const STATUS_TONE: Record<ReviewRequirement["reviewStatus"], FvBadgeTone> = {
  pending: "accent",
  review: "warning",
  approved: "success",
  skipped: "neutral",
};

const STATUS_ROW_CLASS: Record<ReviewRequirement["reviewStatus"], string> = {
  pending: "fv-review-table-row-pending",
  review: "fv-review-table-row-review",
  approved: "fv-review-table-row-approved",
  skipped: "fv-review-table-row-skipped",
};

const FILTER_LABEL: Record<ExplorerFilter, string> = {
  all: "All statuses",
  pending: "Pending",
  review: "Needs review",
  approved: "Approved",
  skipped: "Skipped",
};

const SEVERITY_BG: Record<string, string> = {
  safe: "color-mix(in srgb, var(--status-approved) 10%, #f0fdf4)",
  attention: "color-mix(in srgb, var(--status-flagged) 10%, #fffbeb)",
  review: "color-mix(in srgb, var(--status-error) 8%, #fef2f2)",
};

const SEVERITY_BORDER: Record<string, string> = {
  safe: "var(--status-approved)",
  attention: "var(--status-flagged)",
  review: "var(--status-error, #ef4444)",
};

function isExplorerFilter(value: string | null): value is ExplorerFilter {
  return (
    value === "all" ||
    value === "pending" ||
    value === "review" ||
    value === "approved" ||
    value === "skipped"
  );
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function getCompletionProgress(approvedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.round((approvedCount / totalCount) * 100);
}

function getRequirementText(requirement: ReviewRequirement): string {
  return (
    requirement.requirementDescription.trim() ||
    requirement.detailDescriptionAndMotivation.trim() ||
    requirement.generatedOutput.generatedCommentDraft?.trim() ||
    "No requirement text provided"
  );
}

function getAiComment(requirement: ReviewRequirement): string {
  if (requirement.generatedOutput.state !== "mock-generated-draft") {
    return "";
  }
  return requirement.generatedOutput.draft.generatedComment.trim();
}

function getMesObject(requirement: ReviewRequirement): string {
  if (requirement.generatedOutput.state === "mock-generated-draft") {
    const firstModule = requirement.generatedOutput.draft.demoSteps[0]
      ?.mesModuleOrScreen;
    if (firstModule?.trim()) return firstModule;
  }
  return requirement.l3Process || requirement.operation || "Unmapped";
}

function getProcessLabel(requirement: ReviewRequirement): string {
  const levels = [requirement.l2Process, requirement.l3Process || requirement.operation]
    .map((value) => value.trim())
    .filter(Boolean);
  return levels.length > 0 ? levels.join(" / ") : "Unassigned";
}

function getConfidence(requirement: ReviewRequirement): RequirementGenerationConfidence {
  if (requirement.generatedOutput.state === "mock-generated-draft") {
    return requirement.generatedOutput.draft.confidence;
  }
  return assessRequirementSupport(requirement).confidence;
}

function getConfidenceTone(
  confidence: RequirementGenerationConfidence,
): FvBadgeTone {
  if (confidence.level === "high") return "success";
  if (confidence.level === "medium") return "warning";
  return "error";
}

function buildReviewTableRows(
  requirements: ReviewRequirement[],
  queuedRequirementKeys: Set<string>,
  activeKey: string | null,
): ReviewTableRow[] {
  return requirements.map((requirement) => {
    const confidence = getConfidence(requirement);
    const process = getProcessLabel(requirement);
    const requirementId =
      requirement.requirementId || `Row ${requirement.sourceRowNumber}`;
    const requirementText = getRequirementText(requirement);
    const aiComment = getAiComment(requirement);
    const mesObject = getMesObject(requirement);
    const isQueued = queuedRequirementKeys.has(requirement.requirementKey);
    const isActive = requirement.requirementKey === activeKey;

    return {
      aiComment,
      confidence,
      confidenceTone: getConfidenceTone(confidence),
      isQueued,
      mesObject,
      process,
      requirement,
      requirementId,
      requirementText,
      rowClassName: [
        "fv-table-row-stripe",
        STATUS_ROW_CLASS[requirement.reviewStatus],
        isActive ? "fv-review-table-row-current" : "",
      ]
        .filter(Boolean)
        .join(" "),
      searchText: [
        requirementId,
        requirementText,
        aiComment,
        process,
        mesObject,
        STATUS_LABEL[requirement.reviewStatus],
      ]
        .join(" ")
        .toLowerCase(),
      statusLabel: STATUS_LABEL[requirement.reviewStatus],
      statusTone: STATUS_TONE[requirement.reviewStatus],
    };
  });
}

function filterReviewTableRows(
  rows: ReviewTableRow[],
  explorerFilter: ExplorerFilter,
  processFilter: ProcessFilter,
  query: string,
): ReviewTableRow[] {
  const normalizedQuery = query.trim().toLowerCase();

  return rows.filter((row) => {
    const statusMatches =
      explorerFilter === "all" ||
      row.requirement.reviewStatus === explorerFilter;
    const processMatches =
      processFilter === "all" || row.process === processFilter;
    const queryMatches =
      normalizedQuery.length === 0 || row.searchText.includes(normalizedQuery);

    return statusMatches && processMatches && queryMatches;
  });
}

function isRequirementReadyForBulkApproval(requirement: ReviewRequirement) {
  const assessment = assessRequirementSupport(requirement);
  const validation = evaluateRequirementValidation(requirement, assessment);
  return validation.isSafeToApprove;
}

function ReviewEmptyState({
  generatedCount,
  onGenerateDemoRows,
  onGoToGenerate,
}: {
  generatedCount: number;
  onGenerateDemoRows: () => Promise<boolean>;
  onGoToGenerate: () => void;
}) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    await onGenerateDemoRows();
    setGenerating(false);
  };

  return (
    <FvEmptyState
      action={
        <>
          {generatedCount === 0 ? (
            <button
              className="fv-btn-primary"
              disabled={generating}
              onClick={handleGenerate}
              type="button"
            >
              {generating ? "Generating..." : "Generate demo rows"}
            </button>
          ) : null}
          <button
            className="fv-btn-secondary"
            onClick={onGoToGenerate}
            type="button"
          >
            Back to generation
          </button>
        </>
      }
      body={
        generatedCount > 0
          ? "All generated requirements have been reviewed. Go back to generate more or proceed to the script step."
          : "Upload a source workbook and run generation to get requirements ready for review."
      }
      className="fv-review-empty-state"
      title={generatedCount > 0 ? "All rows reviewed" : "No requirements generated yet"}
    />
  );
}

function ReviewRequirementsTable({
  currentRequirement,
  onOpenRequirement,
  rows,
}: {
  currentRequirement: ReviewRequirement | null;
  onOpenRequirement: (requirement: ReviewRequirement) => void;
  rows: ReviewTableRow[];
}) {
  if (rows.length === 0) {
    return (
      <FvEmptyState
        body="Clear the search or status filters to return to the generated requirements inventory."
        className="fv-review-filter-empty"
        title="No matching requirements"
      />
    );
  }

  return (
    <FvTable
      aria-label="Generated requirements review table"
      className="fv-review-table"
      minWidth="980px"
    >
      <thead>
        <tr>
          <th aria-label="Selection status" className="fv-review-table-check" />
          <th>Req ID</th>
          <th>Requirement Text</th>
          <th>MES Object</th>
          <th>Confidence</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const isCurrent =
            currentRequirement?.requirementKey === row.requirement.requirementKey;

          return (
            <tr
              aria-current={isCurrent ? "true" : undefined}
              className={row.rowClassName}
              key={row.requirement.requirementKey}
            >
              <td className="fv-review-table-check">
                <span
                  aria-label={isCurrent ? "Current review row" : "Review row"}
                  className={
                    isCurrent
                      ? "fv-review-check-spacer fv-review-check-spacer-current"
                      : "fv-review-check-spacer"
                  }
                />
              </td>
              <td>
                <div className="fv-review-table-id">
                  <span>{row.requirementId}</span>
                  <span>Row {row.requirement.sourceRowNumber}</span>
                </div>
              </td>
              <td>
                <div className="fv-review-table-requirement">
                  <button
                    className="fv-review-row-button"
                    disabled={!row.isQueued}
                    onClick={() => onOpenRequirement(row.requirement)}
                    type="button"
                  >
                    {row.requirementText}
                  </button>
                  {row.aiComment ? (
                    <p className="fv-review-ai-note">AI: {row.aiComment}</p>
                  ) : (
                    <p className="fv-review-muted-note">
                      No generated AI comment available.
                    </p>
                  )}
                  <p className="fv-review-muted-note">{row.process}</p>
                </div>
              </td>
              <td>{row.mesObject}</td>
              <td>
                <FvBadge compact tone={row.confidenceTone}>
                  {row.confidence.level} · {formatPercent(row.confidence.score)}
                </FvBadge>
              </td>
              <td>
                <FvBadge dot tone={row.statusTone}>
                  {row.statusLabel}
                </FvBadge>
              </td>
            </tr>
          );
        })}
      </tbody>
    </FvTable>
  );
}

function ReviewQueueControls({
  activeQueueIndex,
  approvedCount,
  canEdit,
  currentRequirement,
  onApproveReadyRows,
  onOpenScript,
  onSelectNext,
  onSelectPrevious,
  onSkipRemainingRows,
  readyBulkCount,
  reviewQueue,
}: {
  activeQueueIndex: number;
  approvedCount: number;
  canEdit: boolean;
  currentRequirement: ReviewRequirement | null;
  onApproveReadyRows: () => void;
  onOpenScript: () => void;
  onSelectNext: (requirement: ReviewRequirement | null) => void;
  onSelectPrevious: (requirement: ReviewRequirement | null) => void;
  onSkipRemainingRows: () => void;
  readyBulkCount: number;
  reviewQueue: ReviewRequirement[];
}) {
  return (
    <section className="fv-card fv-review-queue-card">
      <div>
        <p className="fv-review-kicker">Review queue</p>
        <h2 className="fv-review-card-title">Pending requirements</h2>
      </div>
      <div className="fv-review-queue-metrics">
        <span>{reviewQueue.length} pending</span>
        <span>{approvedCount} approved</span>
        <span>
          {activeQueueIndex >= 0
            ? `${activeQueueIndex + 1}/${reviewQueue.length}`
            : "0/0"}
        </span>
      </div>
      <div className="fv-review-queue-actions">
        <button
          className="fv-btn-secondary"
          disabled={reviewQueue.length === 0 || activeQueueIndex <= 0}
          onClick={() => onSelectPrevious(currentRequirement)}
          type="button"
        >
          Previous
        </button>
        <button
          className="fv-btn-secondary"
          disabled={
            reviewQueue.length === 0 ||
            activeQueueIndex >= reviewQueue.length - 1
          }
          onClick={() => onSelectNext(currentRequirement)}
          type="button"
        >
          Next
        </button>
      </div>
      {canEdit ? (
        <div className="fv-review-queue-actions">
          <button
            className="fv-btn-secondary"
            disabled={readyBulkCount === 0}
            onClick={onApproveReadyRows}
            type="button"
          >
            Approve ready rows
          </button>
          <button
            className="fv-btn-secondary"
            disabled={reviewQueue.length === 0}
            onClick={onSkipRemainingRows}
            type="button"
          >
            Skip remaining rows
          </button>
        </div>
      ) : null}
      <button
        className="fv-btn-primary"
        disabled={approvedCount === 0}
        onClick={onOpenScript}
        type="button"
      >
        Generate Script
      </button>
    </section>
  );
}

function ReviewCurrentRowPanel({
  currentRequirement,
}: {
  currentRequirement: ReviewRequirement;
}) {
  const assessment = assessRequirementSupport(currentRequirement);
  const validation = evaluateRequirementValidation(currentRequirement, assessment);
  const draft =
    currentRequirement.generatedOutput.state === "mock-generated-draft"
      ? currentRequirement.generatedOutput.draft
      : null;

  return (
    <section className="fv-card fv-review-current-card">
      <div className="fv-review-current-header">
        <div>
          <p className="fv-review-kicker">Current row</p>
          <h2 className="fv-review-card-title">
            {currentRequirement.requirementId || "No ID"}
          </h2>
        </div>
        <FvBadge tone={STATUS_TONE[currentRequirement.reviewStatus]}>
          {STATUS_LABEL[currentRequirement.reviewStatus]}
        </FvBadge>
      </div>

      <div className="fv-review-tags">
        <span>L2: {currentRequirement.l2Process || "Unassigned"}</span>
        <span>
          L3: {currentRequirement.l3Process || currentRequirement.operation || "Unassigned"}
        </span>
        <span>{currentRequirement.demo ? "Demo" : "Non-demo"}</span>
        <span>{currentRequirement.mvp ? "MVP" : "Non-MVP"}</span>
      </div>

      <p className="fv-review-current-description">
        {getRequirementText(currentRequirement)}
      </p>

      <div
        className="fv-review-validation"
        style={{
          background: SEVERITY_BG[validation.severity],
          borderColor: SEVERITY_BORDER[validation.severity],
        }}
      >
        <p className="fv-review-kicker">Validation</p>
        <strong>{validation.headline}</strong>
        <span>{validation.guidance}</span>
        {validation.signals.length > 0 ? (
          <small>{validation.signals.join(" · ")}</small>
        ) : (
          <small>No validation flags from the draft heuristic.</small>
        )}
      </div>

      {draft ? (
        <div className="fv-review-draft-panel">
          <p className="fv-review-kicker">Draft comment</p>
          <p>{draft.generatedComment}</p>
          {draft.demoSteps.length > 0 ? (
            <div className="fv-review-step-list">
              {draft.demoSteps.slice(0, 3).map((step, index) => (
                <article key={step.id}>
                  <strong>
                    {index + 1}. {step.title}
                  </strong>
                  <span>{step.mesModuleOrScreen}</span>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="fv-review-draft-panel">
          <p className="fv-review-kicker">Draft comment</p>
          <p>No generated draft exists for this requirement yet.</p>
        </div>
      )}
    </section>
  );
}

function ReviewDecisionPanel({
  canEdit,
  onReviewAction,
  requirement,
}: {
  canEdit: boolean;
  onReviewAction: (
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) => void;
  requirement: ReviewRequirement;
}) {
  return (
    <section className="fv-card fv-review-decision-card">
      <div>
        <p className="fv-review-kicker">Consultant decision</p>
        <h2 className="fv-review-card-title">Approve, flag, or skip</h2>
      </div>
      <div className="fv-review-decision-actions">
        <button
          className="fv-btn-primary"
          disabled={!canEdit}
          onClick={() => onReviewAction(requirement, { type: "approve" })}
          type="button"
        >
          Approve and next
        </button>
        <button
          className="fv-btn-secondary"
          disabled={!canEdit}
          onClick={() => onReviewAction(requirement, { type: "flag" })}
          type="button"
        >
          Needs review
        </button>
        <button
          className="fv-btn-secondary"
          disabled={!canEdit}
          onClick={() => onReviewAction(requirement, { type: "skip" })}
          type="button"
        >
          Skip row
        </button>
        <button
          className="fv-btn-secondary"
          disabled={!canEdit}
          onClick={() => onReviewAction(requirement, { type: "resetToDraft" })}
          type="button"
        >
          Reset draft
        </button>
      </div>
      <label className="fv-review-field">
        <span>Consultant comment</span>
        <textarea
          className="fv-input"
          disabled={!canEdit}
          onChange={(event) =>
            onReviewAction(requirement, {
              consultantComment: event.currentTarget.value,
              type: "edit",
            })
          }
          placeholder="Edit the customer-facing wording before approval."
          rows={4}
          value={requirement.consultantComment}
        />
      </label>
      <label className="fv-review-field">
        <span>Review note</span>
        <textarea
          className="fv-input"
          disabled={!canEdit}
          onChange={(event) =>
            onReviewAction(requirement, {
              reviewNote: event.currentTarget.value,
              type: "edit",
            })
          }
          placeholder="Why approve, flag, or skip this row?"
          rows={3}
          value={requirement.reviewNote}
        />
      </label>
    </section>
  );
}

function getProcessFilterOptions(rows: ReviewTableRow[]): string[] {
  return Array.from(new Set(rows.map((row) => row.process))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export default function ReviewStudio({
  approvedCount,
  canEditPhase1 = true,
  generatedCount,
  generatedReviewableRequirements,
  onGenerateDemoRows,
  onGoToGenerate,
  onOpenScript,
  onReviewAction,
  projectId,
  reviewRequirements,
}: ReviewStudioProps) {
  const selectionKey = `cm-mes-advisor:review-selection:${projectId}`;
  const filterKey = `cm-mes-advisor:review-explorer-filter:${projectId}`;
  const queryKey = `cm-mes-advisor:review-explorer-query:${projectId}`;

  const reviewQueue = generatedReviewableRequirements;
  const generatedInventory = useMemo(
    () =>
      reviewRequirements.filter(
        (requirement) =>
          requirement.generatedOutput.state === "mock-generated-draft",
      ),
    [reviewRequirements],
  );
  const queuedRequirementKeys = useMemo(
    () => new Set(reviewQueue.map((requirement) => requirement.requirementKey)),
    [reviewQueue],
  );
  const readyBulkRequirements = useMemo(
    () => reviewQueue.filter(isRequirementReadyForBulkApproval),
    [reviewQueue],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(
    generatedReviewableRequirements[0]?.requirementKey ?? null,
  );
  const [explorerFilter, setExplorerFilter] =
    useState<ExplorerFilter>("pending");
  const [explorerQuery, setExplorerQuery] = useState("");
  const [processFilter, setProcessFilter] = useState<ProcessFilter>("all");

  useEffect(() => {
    let frame = 0;
    try {
      const selection = window.localStorage.getItem(selectionKey);
      const filter = window.localStorage.getItem(filterKey);
      const query = window.localStorage.getItem(queryKey);
      frame = window.requestAnimationFrame(() => {
        if (selection) setSelectedKey(selection);
        if (isExplorerFilter(filter)) setExplorerFilter(filter);
        if (query) setExplorerQuery(query);
      });
    } catch {
      /* localStorage is optional */
    }
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [filterKey, queryKey, selectionKey]);

  const activeKey =
    selectedKey && reviewQueue.some((requirement) => requirement.requirementKey === selectedKey)
      ? selectedKey
      : (reviewQueue[0]?.requirementKey ?? null);

  const currentRequirement =
    reviewQueue.find((requirement) => requirement.requirementKey === activeKey) ??
    reviewQueue[0] ??
    null;
  const activeQueueIndex = currentRequirement
    ? reviewQueue.findIndex(
        (requirement) =>
          requirement.requirementKey === currentRequirement.requirementKey,
      )
    : -1;

  const tableRows = useMemo(
    () => buildReviewTableRows(generatedInventory, queuedRequirementKeys, activeKey),
    [activeKey, generatedInventory, queuedRequirementKeys],
  );
  const processOptions = useMemo(
    () => getProcessFilterOptions(tableRows),
    [tableRows],
  );
  const visibleRows = useMemo(
    () =>
      filterReviewTableRows(
        tableRows,
        explorerFilter,
        processFilter,
        explorerQuery,
      ),
    [explorerFilter, explorerQuery, processFilter, tableRows],
  );

  const flaggedCount = reviewRequirements.filter(
    (requirement) => requirement.reviewStatus === "review",
  ).length;
  const totalGeneratedCount = generatedInventory.length || generatedCount;
  const completionProgress = getCompletionProgress(
    approvedCount,
    totalGeneratedCount,
  );

  const selectNext = useCallback(
    (requirement: ReviewRequirement | null) => {
      if (!requirement) {
        setSelectedKey(reviewQueue[0]?.requirementKey ?? null);
        return;
      }
      const remaining = reviewQueue.filter(
        (row) => row.requirementKey !== requirement.requirementKey,
      );
      const next =
        remaining.find(
          (row) => row.sourceRowNumber > requirement.sourceRowNumber,
        ) ??
        remaining[0] ??
        null;
      setSelectedKey(next?.requirementKey ?? null);
    },
    [reviewQueue],
  );

  const selectPrevious = useCallback(
    (requirement: ReviewRequirement | null) => {
      if (reviewQueue.length === 0) {
        setSelectedKey(null);
        return;
      }
      if (!requirement) {
        setSelectedKey(reviewQueue[0]?.requirementKey ?? null);
        return;
      }
      const index = reviewQueue.findIndex(
        (row) => row.requirementKey === requirement.requirementKey,
      );
      setSelectedKey(
        index <= 0
          ? (reviewQueue[0]?.requirementKey ?? null)
          : (reviewQueue[index - 1]?.requirementKey ?? null),
      );
    },
    [reviewQueue],
  );

  const handleReviewAction = useCallback(
    (requirement: ReviewRequirement, action: RequirementReviewAction) => {
      if (!canEditPhase1) return;
      onReviewAction(requirement, action);
      if (
        action.type === "approve" ||
        action.type === "flag" ||
        action.type === "skip"
      ) {
        selectNext(requirement);
      }
    },
    [canEditPhase1, onReviewAction, selectNext],
  );

  const handleApproveReadyRows = useCallback(() => {
    if (!canEditPhase1 || readyBulkRequirements.length === 0) return;
    const approvedKeys = new Set(
      readyBulkRequirements.map((requirement) => requirement.requirementKey),
    );
    readyBulkRequirements.forEach((requirement) =>
      onReviewAction(requirement, { type: "approve" }),
    );
    const next =
      reviewQueue.find(
        (requirement) => !approvedKeys.has(requirement.requirementKey),
      ) ?? null;
    setSelectedKey(next?.requirementKey ?? null);
  }, [canEditPhase1, onReviewAction, readyBulkRequirements, reviewQueue]);

  const handleSkipRemainingRows = useCallback(() => {
    if (!canEditPhase1 || reviewQueue.length === 0) return;
    reviewQueue.forEach((requirement) =>
      onReviewAction(requirement, { type: "skip" }),
    );
    setSelectedKey(null);
  }, [canEditPhase1, onReviewAction, reviewQueue]);

  useEffect(() => {
    if (!activeKey) return;
    try {
      window.localStorage.setItem(selectionKey, activeKey);
    } catch {
      /* localStorage is optional */
    }
  }, [activeKey, selectionKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(filterKey, explorerFilter);
      window.localStorage.setItem(queryKey, explorerQuery);
    } catch {
      /* localStorage is optional */
    }
  }, [explorerFilter, explorerQuery, filterKey, queryKey]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";
      if (typing || !currentRequirement) return;
      if (event.key === "[") {
        event.preventDefault();
        selectPrevious(currentRequirement);
      }
      if (event.key === "]") {
        event.preventDefault();
        selectNext(currentRequirement);
      }
      if (!canEditPhase1) return;
      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        handleReviewAction(currentRequirement, { type: "approve" });
      }
      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        handleReviewAction(currentRequirement, { type: "flag" });
      }
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleReviewAction(currentRequirement, { type: "skip" });
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        handleReviewAction(currentRequirement, { type: "resetToDraft" });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    canEditPhase1,
    currentRequirement,
    handleReviewAction,
    selectNext,
    selectPrevious,
  ]);

  const reviewWorkspaceReady = generatedCount > 0 && currentRequirement !== null;

  if (!reviewWorkspaceReady) {
    return (
      <ReviewEmptyState
        generatedCount={generatedCount}
        onGenerateDemoRows={onGenerateDemoRows}
        onGoToGenerate={onGoToGenerate}
      />
    );
  }

  return (
    <div className="fv-review-workspace">
      <FvPageHeader
        actions={
          <>
            <button
              className="fv-btn-secondary"
              disabled={approvedCount === 0}
              onClick={onOpenScript}
              type="button"
            >
              Export
            </button>
            <button
              className="fv-btn-primary"
              disabled={approvedCount === 0}
              onClick={onOpenScript}
              type="button"
            >
              Generate Script
            </button>
          </>
        }
        description="Review generated MES requirements, resolve flagged rows, and approve the set before script generation."
        eyebrow="Phase 1 / Requirements"
        title="Requirements Review"
      />

      <div className="fv-stats-row fv-review-stats">
        <FvStatCard
          helper="Generated requirements"
          label="Total"
          tone="info"
          value={formatCount(totalGeneratedCount)}
        />
        <FvStatCard
          helper={`${completionProgress}% complete`}
          label="Approved"
          progress={completionProgress}
          tone="success"
          value={formatCount(approvedCount)}
        />
        <FvStatCard
          helper="Flagged for consultant review"
          label="Flagged"
          tone="warning"
          value={formatCount(flaggedCount)}
        />
        <FvStatCard
          helper="Rows still in the review queue"
          label="Pending"
          tone="accent"
          value={formatCount(reviewQueue.length)}
        />
      </div>

      <FvToolbar
        className="fv-review-toolbar"
        left={
          <>
            <input
              className="fv-search-input fv-review-search"
              onChange={(event) => setExplorerQuery(event.target.value)}
              placeholder="Search requirements..."
              type="search"
              value={explorerQuery}
            />
            <select
              className="fv-select fv-review-filter"
              onChange={(event) =>
                setExplorerFilter(event.currentTarget.value as ExplorerFilter)
              }
              value={explorerFilter}
            >
              {(Object.keys(FILTER_LABEL) as ExplorerFilter[]).map((filter) => (
                <option key={filter} value={filter}>
                  {FILTER_LABEL[filter]}
                </option>
              ))}
            </select>
            <select
              className="fv-select fv-review-filter"
              onChange={(event) => setProcessFilter(event.currentTarget.value)}
              value={processFilter}
            >
              <option value="all">All processes</option>
              {processOptions.map((process) => (
                <option key={process} value={process}>
                  {process}
                </option>
              ))}
            </select>
          </>
        }
        right={
          <span className="fv-review-showing">
            Showing {visibleRows.length} of {tableRows.length}
          </span>
        }
      />

      <ReviewRequirementsTable
        currentRequirement={currentRequirement}
        onOpenRequirement={(requirement) =>
          setSelectedKey(requirement.requirementKey)
        }
        rows={visibleRows}
      />

      <div className="fv-review-transition-grid">
        <ReviewQueueControls
          activeQueueIndex={activeQueueIndex}
          approvedCount={approvedCount}
          canEdit={canEditPhase1}
          currentRequirement={currentRequirement}
          onApproveReadyRows={handleApproveReadyRows}
          onOpenScript={onOpenScript}
          onSelectNext={selectNext}
          onSelectPrevious={selectPrevious}
          onSkipRemainingRows={handleSkipRemainingRows}
          readyBulkCount={readyBulkRequirements.length}
          reviewQueue={reviewQueue}
        />
        <ReviewCurrentRowPanel currentRequirement={currentRequirement} />
        <ReviewDecisionPanel
          canEdit={canEditPhase1}
          onReviewAction={handleReviewAction}
          requirement={currentRequirement}
        />
      </div>

      <div className="fv-mobile-action-bar">
        <button
          className="fv-btn-primary"
          disabled={!canEditPhase1}
          onClick={() => handleReviewAction(currentRequirement, { type: "approve" })}
          type="button"
        >
          Approve
        </button>
        <button
          className="fv-btn-secondary"
          disabled={!canEditPhase1}
          onClick={() => handleReviewAction(currentRequirement, { type: "flag" })}
          type="button"
        >
          Flag
        </button>
        <button
          className="fv-btn-secondary"
          disabled={!canEditPhase1}
          onClick={() => handleReviewAction(currentRequirement, { type: "skip" })}
          type="button"
        >
          Skip
        </button>
        <button
          className="fv-btn-secondary"
          onClick={() => selectNext(currentRequirement)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}
