"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FvBadge,
  FvCallout,
  FvEmptyState,
  FvInspectorPanel,
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

type BulkReviewActionType = Extract<
  RequirementReviewAction["type"],
  "approve" | "flag" | "skip"
>;

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
  return requirement.l3Process || requirement.operation || "—";
}

function getSafeSourceReferenceHref(url: string | undefined): string | null {
  const normalizedUrl = url?.trim();
  if (!normalizedUrl) return null;

  if (normalizedUrl.startsWith("/") && !normalizedUrl.startsWith("//")) {
    return normalizedUrl;
  }

  try {
    const parsed = new URL(normalizedUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
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
  activeKey: string | null,
  selectedRowKey: string | null,
): ReviewTableRow[] {
  return requirements.map((requirement) => {
    const confidence = getConfidence(requirement);
    const process = getProcessLabel(requirement);
    const requirementId =
      requirement.requirementId || `Row ${requirement.sourceRowNumber}`;
    const requirementText = getRequirementText(requirement);
    const aiComment = getAiComment(requirement);
    const mesObject = getMesObject(requirement);
    const isActive = requirement.requirementKey === activeKey;
    const isSelected = requirement.requirementKey === selectedRowKey;

    return {
      aiComment,
      confidence,
      confidenceTone: getConfidenceTone(confidence),
      mesObject,
      process,
      requirement,
      requirementId,
      requirementText,
      rowClassName: [
        "fv-table-row-stripe",
        STATUS_ROW_CLASS[requirement.reviewStatus],
        isActive ? "fv-review-table-row-current" : "",
        isSelected ? "fv-review-table-row-selected" : "",
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
  approvedCount,
  generatedCount,
  onGenerateDemoRows,
  onGoToGenerate,
  onOpenScript,
}: {
  approvedCount: number;
  generatedCount: number;
  onGenerateDemoRows: () => Promise<boolean>;
  onGoToGenerate: () => void;
  onOpenScript: () => void;
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
          ) : approvedCount > 0 ? (
            <button
              className="fv-btn-primary"
              onClick={onOpenScript}
              type="button"
            >
              Open script studio
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
          ? "Every generated requirement has a review decision. Proceed to the script step when approved content is ready, or return to generation to add more rows."
          : "Upload a source workbook and run generation to get requirements ready for review."
      }
      className="fv-review-empty-state"
      title={
        generatedCount > 0
          ? "Review decisions complete"
          : "No requirements generated yet"
      }
    />
  );
}

function ReviewNoResultsState({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  return (
    <FvEmptyState
      action={
        <button
          className="fv-btn-secondary"
          onClick={onClearFilters}
          type="button"
        >
          Clear filters
        </button>
      }
      body="Clear the search or filters to return to the generated review queue."
      className="fv-review-filter-empty fv-review-no-results-state"
      title="No requirements match your filters"
    />
  );
}

function ReviewRequirementsTable({
  allVisibleRowsChecked,
  checkedRowKeys,
  currentRequirement,
  onSelectRequirement,
  onToggleRequirementChecked,
  onToggleVisibleRows,
  rows,
  selectedRequirement,
  someVisibleRowsChecked,
}: {
  allVisibleRowsChecked: boolean;
  checkedRowKeys: Set<string>;
  currentRequirement: ReviewRequirement | null;
  onSelectRequirement: (requirement: ReviewRequirement) => void;
  onToggleRequirementChecked: (
    requirement: ReviewRequirement,
    checked: boolean,
  ) => void;
  onToggleVisibleRows: (checked: boolean) => void;
  rows: ReviewTableRow[];
  selectedRequirement: ReviewRequirement | null;
  someVisibleRowsChecked: boolean;
}) {
  return (
    <FvTable
      aria-label="Generated requirements review table"
      className="fv-review-table"
      minWidth="980px"
    >
      <thead>
        <tr>
          <th className="fv-review-table-check">
            <input
              aria-label="Select all visible requirements"
              checked={allVisibleRowsChecked}
              className="fv-review-checkbox"
              disabled={rows.length === 0}
              onChange={(event) =>
                onToggleVisibleRows(event.currentTarget.checked)
              }
              ref={(input) => {
                if (input) {
                  input.indeterminate =
                    someVisibleRowsChecked && !allVisibleRowsChecked;
                }
              }}
              type="checkbox"
            />
          </th>
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
          const isSelected =
            selectedRequirement?.requirementKey === row.requirement.requirementKey;
          const isChecked = checkedRowKeys.has(row.requirement.requirementKey);

          return (
            <tr
              aria-current={isCurrent ? "true" : undefined}
              aria-selected={isSelected ? "true" : undefined}
              className={
                [
                  row.rowClassName,
                  isChecked ? "fv-review-table-row-checked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              key={row.requirement.requirementKey}
              onClick={() => onSelectRequirement(row.requirement)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectRequirement(row.requirement);
                }
              }}
              tabIndex={0}
            >
              <td className="fv-review-table-check">
                <input
                  aria-label={`Select requirement ${row.requirementId}`}
                  checked={isChecked}
                  className="fv-review-checkbox"
                  onChange={(event) =>
                    onToggleRequirementChecked(
                      row.requirement,
                      event.currentTarget.checked,
                    )
                  }
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  type="checkbox"
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
                    aria-label={`Select ${row.requirementId} for inspection`}
                    className="fv-review-row-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectRequirement(row.requirement);
                    }}
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

function ReviewBulkActionBar({
  canEdit,
  onBulkAction,
  onClearSelection,
  selectedCount,
}: {
  canEdit: boolean;
  onBulkAction: (actionType: BulkReviewActionType) => void;
  onClearSelection: () => void;
  selectedCount: number;
}) {
  if (selectedCount === 0) return null;

  return (
    <section
      aria-label="Selected requirements"
      className="fv-bulk-bar fv-review-bulk-bar"
    >
      <span className="fv-bulk-count">
        {selectedCount} {selectedCount === 1 ? "selected" : "selected"}
      </span>
      <button
        className="fv-bulk-action"
        disabled={!canEdit}
        onClick={() => onBulkAction("approve")}
        type="button"
      >
        Approve selected
      </button>
      <button
        className="fv-bulk-action"
        disabled={!canEdit}
        onClick={() => onBulkAction("flag")}
        type="button"
      >
        Flag selected
      </button>
      <button
        className="fv-bulk-action"
        disabled={!canEdit}
        onClick={() => onBulkAction("skip")}
        type="button"
      >
        Skip selected
      </button>
      <button
        className="fv-bulk-clear"
        onClick={onClearSelection}
        type="button"
      >
        Clear selection
      </button>
    </section>
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

function ReviewSelectedInspector({
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
  const assessment = assessRequirementSupport(requirement);
  const confidence = getConfidence(requirement);
  const draft =
    requirement.generatedOutput.state === "mock-generated-draft"
      ? requirement.generatedOutput.draft
      : null;
  const sourceReference = draft?.sourceReferences[0] ?? null;
  const safeSourceReferenceHref = getSafeSourceReferenceHref(
    sourceReference?.url,
  );
  const warnings = draft?.warnings.filter(Boolean) ?? [];
  const assumptions = draft?.assumptions.filter(Boolean) ?? [];

  return (
    <FvInspectorPanel
      actions={
        <FvBadge tone={STATUS_TONE[requirement.reviewStatus]}>
          {STATUS_LABEL[requirement.reviewStatus]}
        </FvBadge>
      }
      className="fv-review-inspector"
      footer={
        <>
          <button
            className="fv-btn-primary"
            disabled={!canEdit}
            onClick={() => onReviewAction(requirement, { type: "approve" })}
            type="button"
          >
            Approve
          </button>
          <button
            className="fv-btn-secondary"
            disabled={!canEdit}
            onClick={() => onReviewAction(requirement, { type: "flag" })}
            type="button"
          >
            Flag
          </button>
          <button
            className="fv-btn-secondary"
            disabled={!canEdit}
            onClick={() => onReviewAction(requirement, { type: "skip" })}
            type="button"
          >
            Skip
          </button>
          <button
            className="fv-btn-secondary"
            disabled={!canEdit}
            onClick={() => onReviewAction(requirement, { type: "resetToDraft" })}
            type="button"
          >
            Reset draft
          </button>
        </>
      }
      metadata={`Req. ${requirement.requirementId || "No ID"} · Row ${requirement.sourceRowNumber}`}
      sticky
      title="Selected requirement"
    >
      <div className="fv-review-inspector-heading">
        <p className="fv-review-inspector-id">
          {requirement.requirementId || `Row ${requirement.sourceRowNumber}`}
        </p>
        <h3>{getRequirementText(requirement)}</h3>
      </div>

      <div className="fv-review-inspector-badges">
        <FvBadge compact tone={getConfidenceTone(confidence)}>
          {confidence.level} confidence · {formatPercent(confidence.score)}
        </FvBadge>
        <FvBadge compact tone={assessment.supportType === "standard" ? "success" : "warning"}>
          {assessment.supportType}
        </FvBadge>
      </div>

      <FvCallout tone="info" title="AI comment">
        {draft?.generatedComment || "No generated consultant comment is available for this row."}
      </FvCallout>

      <div className="fv-review-inspector-section">
        <p className="fv-review-kicker">MES object</p>
        <div className="fv-review-inspector-object">{getMesObject(requirement)}</div>
      </div>

      <dl className="fv-review-inspector-details">
        <div>
          <dt>Process</dt>
          <dd>{requirement.l2Process || "—"}</dd>
        </div>
        <div>
          <dt>L3 / operation</dt>
          <dd>{requirement.l3Process || requirement.operation || "—"}</dd>
        </div>
        <div>
          <dt>Demo flagged</dt>
          <dd>{requirement.demo ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>MVP</dt>
          <dd>{requirement.mvp ? "Yes" : "No"}</dd>
        </div>
      </dl>

      {sourceReference ? (
        <div className="fv-review-inspector-section">
          <p className="fv-review-kicker">Source reference</p>
          {safeSourceReferenceHref ? (
            <a href={safeSourceReferenceHref}>{sourceReference.label}</a>
          ) : (
            <span>{sourceReference.label}</span>
          )}
          <small>{sourceReference.note}</small>
        </div>
      ) : (
        <div className="fv-review-inspector-section">
          <p className="fv-review-kicker">Source reference</p>
          <span>Source row {requirement.sourceRowNumber}</span>
        </div>
      )}

      {warnings.length > 0 || assumptions.length > 0 ? (
        <div className="fv-review-inspector-section">
          <p className="fv-review-kicker">Warnings and assumptions</p>
          <ul className="fv-review-inspector-list">
            {[...warnings, ...assumptions].slice(0, 4).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

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
    </FvInspectorPanel>
  );
}

function ReviewInspectorEmptyState() {
  return (
    <FvInspectorPanel
      className="fv-review-inspector"
      metadata="Click any visible table row to inspect details."
      sticky
      title="Selected requirement"
    >
      <FvEmptyState
        body="Select a generated requirement to inspect its AI comment, MES object, source context, and review notes."
        className="fv-review-inspector-empty"
        title="No row selected"
      />
    </FvInspectorPanel>
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
  const readyBulkRequirements = useMemo(
    () => reviewQueue.filter(isRequirementReadyForBulkApproval),
    [reviewQueue],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(
    generatedReviewableRequirements[0]?.requirementKey ?? null,
  );
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(
    generatedReviewableRequirements[0]?.requirementKey ?? null,
  );
  const [checkedRowKeys, setCheckedRowKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [explorerFilter, setExplorerFilter] =
    useState<ExplorerFilter>("all");
  const [explorerQuery, setExplorerQuery] = useState("");
  const [processFilter, setProcessFilter] = useState<ProcessFilter>("all");

  useEffect(() => {
    let frame = 0;
    try {
      const selection = window.localStorage.getItem(selectionKey);
      const filter = window.localStorage.getItem(filterKey);
      const query = window.localStorage.getItem(queryKey);
      frame = window.requestAnimationFrame(() => {
        if (selection) {
          setSelectedKey(selection);
          setSelectedRowKey(selection);
        }
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
    () =>
      buildReviewTableRows(
        generatedInventory,
        activeKey,
        selectedRowKey,
      ),
    [activeKey, generatedInventory, selectedRowKey],
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
  const generatedInventoryKeys = useMemo(
    () =>
      new Set(
        generatedInventory.map((requirement) => requirement.requirementKey),
      ),
    [generatedInventory],
  );
  const effectiveCheckedRowKeys = useMemo(
    () =>
      new Set(
        Array.from(checkedRowKeys).filter((key) =>
          generatedInventoryKeys.has(key),
        ),
      ),
    [checkedRowKeys, generatedInventoryKeys],
  );
  const checkedRequirements = useMemo(
    () =>
      generatedInventory.filter((requirement) =>
        effectiveCheckedRowKeys.has(requirement.requirementKey),
      ),
    [effectiveCheckedRowKeys, generatedInventory],
  );
  const checkedVisibleRowCount = visibleRows.filter((row) =>
    effectiveCheckedRowKeys.has(row.requirement.requirementKey),
  ).length;
  const allVisibleRowsChecked =
    visibleRows.length > 0 && checkedVisibleRowCount === visibleRows.length;
  const someVisibleRowsChecked = checkedVisibleRowCount > 0;
  const selectedRequirement =
    visibleRows.find((row) => row.requirement.requirementKey === selectedRowKey)
      ?.requirement ?? null;

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
        const nextKey = reviewQueue[0]?.requirementKey ?? null;
        setSelectedKey(nextKey);
        setSelectedRowKey(nextKey);
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
      setSelectedRowKey(next?.requirementKey ?? null);
    },
    [reviewQueue],
  );

  const selectPrevious = useCallback(
    (requirement: ReviewRequirement | null) => {
      if (reviewQueue.length === 0) {
        setSelectedKey(null);
        setSelectedRowKey(null);
        return;
      }
      if (!requirement) {
        const nextKey = reviewQueue[0]?.requirementKey ?? null;
        setSelectedKey(nextKey);
        setSelectedRowKey(nextKey);
        return;
      }
      const index = reviewQueue.findIndex(
        (row) => row.requirementKey === requirement.requirementKey,
      );
      const previousKey =
        index <= 0
          ? (reviewQueue[0]?.requirementKey ?? null)
          : (reviewQueue[index - 1]?.requirementKey ?? null);
      setSelectedKey(previousKey);
      setSelectedRowKey(previousKey);
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

  const handleFilterChange = useCallback((nextFilter: ExplorerFilter) => {
    setExplorerFilter(nextFilter);
    setCheckedRowKeys(new Set());
  }, []);

  const handleProcessFilterChange = useCallback((nextFilter: ProcessFilter) => {
    setProcessFilter(nextFilter);
    setCheckedRowKeys(new Set());
  }, []);

  const handleQueryChange = useCallback((nextQuery: string) => {
    setExplorerQuery(nextQuery);
    setCheckedRowKeys(new Set());
  }, []);

  const handleClearFilters = useCallback(() => {
    setExplorerFilter("all");
    setProcessFilter("all");
    setExplorerQuery("");
    setCheckedRowKeys(new Set());
  }, []);

  const handleToggleRequirementChecked = useCallback(
    (requirement: ReviewRequirement, checked: boolean) => {
      setCheckedRowKeys((previous) => {
        const next = new Set(previous);
        if (checked) {
          next.add(requirement.requirementKey);
        } else {
          next.delete(requirement.requirementKey);
        }
        return next;
      });
    },
    [],
  );

  const handleToggleVisibleRows = useCallback(
    (checked: boolean) => {
      setCheckedRowKeys((previous) => {
        const next = new Set(previous);
        visibleRows.forEach((row) => {
          if (checked) {
            next.add(row.requirement.requirementKey);
          } else {
            next.delete(row.requirement.requirementKey);
          }
        });
        return next;
      });
    },
    [visibleRows],
  );

  const clearCheckedRows = useCallback(() => {
    setCheckedRowKeys(new Set());
  }, []);

  const clearActedCheckedRows = useCallback(
    (requirements: ReviewRequirement[]) => {
      if (requirements.length === 0) return;
      const actedKeys = new Set(
        requirements.map((requirement) => requirement.requirementKey),
      );
      setCheckedRowKeys((previous) => {
        const next = new Set(previous);
        actedKeys.forEach((key) => next.delete(key));
        return next;
      });
    },
    [],
  );

  const handleBulkReviewAction = useCallback(
    (actionType: BulkReviewActionType) => {
      if (!canEditPhase1 || checkedRequirements.length === 0) return;

      const actionableRequirements =
        actionType === "approve"
          ? checkedRequirements.filter(isRequirementReadyForBulkApproval)
          : checkedRequirements;

      actionableRequirements.forEach((requirement) =>
        onReviewAction(requirement, { type: actionType }),
      );
      clearActedCheckedRows(actionableRequirements);
    },
    [
      canEditPhase1,
      checkedRequirements,
      clearActedCheckedRows,
      onReviewAction,
    ],
  );

  const handleSelectedReviewAction = useCallback(
    (requirement: ReviewRequirement, action: RequirementReviewAction) => {
      if (!canEditPhase1) return;
      onReviewAction(requirement, action);
      if (
        currentRequirement?.requirementKey === requirement.requirementKey &&
        (action.type === "approve" ||
          action.type === "flag" ||
          action.type === "skip")
      ) {
        selectNext(requirement);
      }
    },
    [canEditPhase1, currentRequirement, onReviewAction, selectNext],
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
    clearActedCheckedRows(readyBulkRequirements);
    setSelectedKey(next?.requirementKey ?? null);
    setSelectedRowKey(next?.requirementKey ?? null);
  }, [
    canEditPhase1,
    clearActedCheckedRows,
    onReviewAction,
    readyBulkRequirements,
    reviewQueue,
  ]);

  const handleSkipRemainingRows = useCallback(() => {
    if (!canEditPhase1 || reviewQueue.length === 0) return;
    reviewQueue.forEach((requirement) =>
      onReviewAction(requirement, { type: "skip" }),
    );
    clearActedCheckedRows(reviewQueue);
    setSelectedKey(null);
    setSelectedRowKey(null);
  }, [canEditPhase1, clearActedCheckedRows, onReviewAction, reviewQueue]);

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
  const hasNoFilterResults = tableRows.length > 0 && visibleRows.length === 0;

  if (!reviewWorkspaceReady) {
    return (
      <ReviewEmptyState
        approvedCount={approvedCount}
        generatedCount={generatedCount}
        onGenerateDemoRows={onGenerateDemoRows}
        onGoToGenerate={onGoToGenerate}
        onOpenScript={onOpenScript}
      />
    );
  }

  return (
    <div className="fv-review-workspace">
      <header className="fv-review-page-header">
        <div>
          <p className="fv-overline">Phase 1 / Review</p>
          <h1 className="fv-page-title">Requirements Review</h1>
          <p className="fv-page-subtitle">
            Approve, flag, or skip generated rows before shaping the demo
            script.
          </p>
        </div>
      </header>

      {!canEditPhase1 ? (
        <FvCallout tone="status" title="Read-only review">
          Review decisions are disabled for your role. You can still inspect
          generated requirements and review notes.
        </FvCallout>
      ) : null}

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
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Search requirements..."
              type="search"
              value={explorerQuery}
            />
            <select
              className="fv-select fv-review-filter"
              onChange={(event) =>
                handleFilterChange(event.currentTarget.value as ExplorerFilter)
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
              onChange={(event) =>
                handleProcessFilterChange(event.currentTarget.value)
              }
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

      <ReviewBulkActionBar
        canEdit={canEditPhase1}
        onBulkAction={handleBulkReviewAction}
        onClearSelection={clearCheckedRows}
        selectedCount={checkedRequirements.length}
      />

      <div className="fv-review-table-detail-grid">
        {hasNoFilterResults ? (
          <ReviewNoResultsState onClearFilters={handleClearFilters} />
        ) : (
          <>
            <ReviewRequirementsTable
              allVisibleRowsChecked={allVisibleRowsChecked}
              checkedRowKeys={effectiveCheckedRowKeys}
              currentRequirement={currentRequirement}
              onSelectRequirement={(requirement) =>
                setSelectedRowKey(requirement.requirementKey)
              }
              onToggleRequirementChecked={handleToggleRequirementChecked}
              onToggleVisibleRows={handleToggleVisibleRows}
              rows={visibleRows}
              selectedRequirement={selectedRequirement}
              someVisibleRowsChecked={someVisibleRowsChecked}
            />
            {selectedRequirement ? (
              <ReviewSelectedInspector
                canEdit={canEditPhase1}
                onReviewAction={handleSelectedReviewAction}
                requirement={selectedRequirement}
              />
            ) : (
              <ReviewInspectorEmptyState />
            )}
          </>
        )}
      </div>

      {!hasNoFilterResults ? (
        <>
          <div className="fv-review-queue-strip">
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
          </div>

          <div className="fv-mobile-action-bar">
            <button
              className="fv-btn-primary"
              disabled={!canEditPhase1}
              onClick={() =>
                handleReviewAction(currentRequirement, { type: "approve" })
              }
              type="button"
            >
              Approve
            </button>
            <button
              className="fv-btn-secondary"
              disabled={!canEditPhase1}
              onClick={() =>
                handleReviewAction(currentRequirement, { type: "flag" })
              }
              type="button"
            >
              Flag
            </button>
            <button
              className="fv-btn-secondary"
              disabled={!canEditPhase1}
              onClick={() =>
                handleReviewAction(currentRequirement, { type: "skip" })
              }
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
        </>
      ) : null}
    </div>
  );
}
