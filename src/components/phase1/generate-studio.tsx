"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FvProgressPanel,
  type FvProgressStep,
  type FvProgressStepStatus,
} from "@/components/ui/fv";
import type {
  RequirementGenerationAvailabilityBody,
  RequirementGenerationModeCapability,
  RequirementGenerationRouteMode,
  RequirementGenerationUnavailableReason,
} from "@/lib/requirements/generation-api";
import { mockGenerationStageLabels } from "@/lib/requirements/generation";
import {
  filterReviewRequirements,
  requirementReviewFilters,
  summarizeReviewRequirements,
  type RequirementReviewFilter,
  type ReviewRequirement,
} from "@/lib/requirements/review";

// ── Filter metadata ────────────────────────────────────────────

const FILTER_LABELS: Record<RequirementReviewFilter, string> = {
  all: "All rows",
  demo: "Demo rows",
  mvp: "MVP rows",
  pending: "Pending",
  review: "Needs review",
  approved: "Approved",
  skipped: "Skipped",
};

const FILTER_DESCRIPTIONS: Record<RequirementReviewFilter, string> = {
  all: "Complete source inventory.",
  demo: "Rows marked for customer demo.",
  mvp: "Rows flagged for the MVP slice.",
  pending: "Not yet reviewed.",
  review: "Flagged for a second look.",
  approved: "Consultant-confirmed rows.",
  skipped: "Intentionally skipped.",
};

function getFilterCount(
  summary: ReturnType<typeof summarizeReviewRequirements>,
  filter: RequirementReviewFilter,
): number {
  switch (filter) {
    case "all": return summary.allCount;
    case "demo": return summary.demoCount;
    case "mvp": return summary.mvpCount;
    case "pending": return summary.pendingCount;
    case "review": return summary.reviewCount;
    case "approved": return summary.approvedCount;
    case "skipped": return summary.skippedCount;
  }
}

// ── Row explorer ───────────────────────────────────────────────

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
  onFilterChange: (f: RequirementReviewFilter) => void;
  onSearchChange: (q: string) => void;
  onSelectRequirement: (req: ReviewRequirement) => void;
  onToggleAllFilteredRequirements: () => void;
  onToggleRequirementSelection: (key: string) => void;
  searchQuery: string;
  selectedRequirementKeys: Set<string>;
  selectedRowNumber: number | null;
  visibleRequirements: ReviewRequirement[];
}) {
  const [open, setOpen] = useState(true);
  const summary = summarizeReviewRequirements(allRequirements);

  return (
    <div className="fv-explorer">
      <button
        type="button"
        className={`fv-explorer-header${open ? " fv-explorer-header-open" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((c) => !c)}
      >
        <span className="fv-explorer-title">Row explorer — search, filter, and select</span>
        <span className="fv-disclosure-label">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <div className="fv-explorer-body">
          {/* Filter cards */}
          <div className="fv-filter-grid">
            {requirementReviewFilters.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => onFilterChange(f)}
                className={`fv-filter-card${filter === f ? " fv-filter-card-active" : ""}`}
              >
                <span className="fv-filter-card-label">{FILTER_LABELS[f]}</span>
                <span className="fv-filter-card-count">{getFilterCount(summary, f)}</span>
                <span className="fv-filter-card-desc">{FILTER_DESCRIPTIONS[f]}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <label>
            <span className="fv-sr-only">Search requirements</span>
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.currentTarget.value)}
              placeholder="Search ID, process, text, or status…"
              className="fv-search-input"
              style={{ width: "100%" }}
            />
          </label>

          {/* Table */}
          {visibleRequirements.length === 0 ? (
            <div className="fv-empty" style={{ padding: "1.5rem" }}>
              <div className="fv-empty-title">
                {searchQuery.trim()
                  ? "No rows match this search"
                  : `No ${FILTER_LABELS[filter].toLowerCase()} yet`}
              </div>
            </div>
          ) : (
            <div className="fv-table-wrap" style={{ overflowX: "auto" }}>
              <table className="fv-table" style={{ minWidth: "800px" }}>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={allFilteredRequirementsSelected}
                        onChange={onToggleAllFilteredRequirements}
                        aria-label={allFilteredRequirementsSelected ? "Clear visible selection" : "Select all visible rows"}
                      />
                    </th>
                    <th>ID</th>
                    <th>Row</th>
                    <th>Requirement</th>
                    <th>L2 Process</th>
                    <th>L3 / Op</th>
                    <th>Demo</th>
                    <th>MVP</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRequirements.map((req) => {
                    const isSelected = req.sourceRowNumber === selectedRowNumber;
                    const isChecked = selectedRequirementKeys.has(req.requirementKey);
                    return (
                      <tr
                        key={req.requirementKey}
                        className={isSelected ? "fv-table-row-stripe" : undefined}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleRequirementSelection(req.requirementKey)}
                            aria-label={`Select ${req.requirementId || req.sourceRowNumber}`}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => onSelectRequirement(req)}
                            className="fv-mono-id"
                            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}
                          >
                            {req.requirementId || "No ID"}
                          </button>
                        </td>
                        <td className="fv-mono-row">{req.sourceRowNumber}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => onSelectRequirement(req)}
                            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontSize: "0.8rem", maxWidth: "320px" }}
                          >
                            {req.requirementDescription || "—"}
                          </button>
                        </td>
                        <td className="fv-table-muted">{req.l2Process || "—"}</td>
                        <td className="fv-table-muted">{req.l3Process || req.operation || "—"}</td>
                        <td>{req.demo ? <span className="fv-flag-yes">Yes</span> : <span className="fv-flag-no">—</span>}</td>
                        <td>{req.mvp ? <span className="fv-flag-yes">Yes</span> : <span className="fv-flag-no">—</span>}</td>
                        <td><span className={`fv-badge fv-badge-${req.reviewStatus === "approved" ? "approved" : req.reviewStatus === "review" ? "flagged" : req.reviewStatus === "skipped" ? "gray" : "pending"}`}>{req.reviewStatus}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

const defaultGenerateFilter: RequirementReviewFilter = "demo";

interface GenerateStudioProps {
  canGenerateRows?: boolean;
  demoRequirements: ReviewRequirement[];
  generatedCount: number;
  generationFeedback: {
    tone: "neutral" | "success" | "error";
    message: string;
    code?: string;
    missingConfig?: string[];
    reason?: RequirementGenerationUnavailableReason;
  } | null;
  initialGenerationAvailability?: RequirementGenerationAvailabilityBody | null;
  isGenerating: boolean;
  lastGenerationMode: RequirementGenerationRouteMode | null;
  mockGenerationRun: {
    selectedCount: number;
    generatedCount: number;
    stages: Array<{
      label: (typeof mockGenerationStageLabels)[number];
      status: "waiting" | "running" | "complete";
    }>;
  };
  onGenerateRows: (
    targetRequirements: ReviewRequirement[],
    targetLabel: string,
    mode?: RequirementGenerationRouteMode,
  ) => Promise<boolean>;
  onOpenReview: () => void;
  requirements: ReviewRequirement[];
}

type GenerationFeedback = GenerateStudioProps["generationFeedback"];
type GenerationRun = GenerateStudioProps["mockGenerationRun"];
type GenerationLifecycle = "ready" | "running" | "complete" | "failed";

interface GenerationProcessingSummary {
  description: string;
  logEntries: Array<{
    message: string;
    tone: "info" | "ok" | "run" | "warn";
  }>;
  progress: number;
  reviewReady: boolean;
  status: GenerationLifecycle;
  targetCount: number;
  steps: FvProgressStep[];
  title: string;
}

export default function GenerateStudio({
  canGenerateRows = true,
  demoRequirements,
  generatedCount,
  generationFeedback,
  initialGenerationAvailability = null,
  isGenerating,
  lastGenerationMode,
  mockGenerationRun,
  onGenerateRows,
  onOpenReview,
  requirements,
}: GenerateStudioProps) {
  const [generationMode, setGenerationMode] =
    useState<RequirementGenerationRouteMode>("mock");
  const [generationAvailability, setGenerationAvailability] =
    useState<RequirementGenerationAvailabilityBody | null>(
      initialGenerationAvailability,
    );
  const [isRefreshingAvailability, setIsRefreshingAvailability] = useState(false);
  const [activeFilter, setActiveFilter] = useState<RequirementReviewFilter>(defaultGenerateFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(null);
  const [selectedRequirementKeys, setSelectedRequirementKeys] = useState<Set<string>>(() => new Set());

  const filteredRequirements = useMemo(
    () => filterReviewRequirements(requirements, activeFilter),
    [activeFilter, requirements],
  );
  const visibleRequirements = useMemo(
    () => searchRequirements(filteredRequirements, searchQuery),
    [filteredRequirements, searchQuery],
  );
  const selectedRequirements = useMemo(
    () => requirements.filter((r) => selectedRequirementKeys.has(r.requirementKey)),
    [requirements, selectedRequirementKeys],
  );
  const mvpRequirements = useMemo(
    () => filterReviewRequirements(requirements, "mvp"),
    [requirements],
  );
  const allFilteredRequirementsSelected =
    visibleRequirements.length > 0 &&
    visibleRequirements.every((r) => selectedRequirementKeys.has(r.requirementKey));
  const realGenerationCapability =
    generationAvailability?.modes.real ?? createFallbackRealCapability();
  const processingSummary = useMemo(
    () =>
      createGenerationProcessingSummary({
        canGenerateRows,
        demoCount: demoRequirements.length,
        feedback: generationFeedback,
        generatedCount,
        isGenerating,
        mode: generationMode,
        mvpCount: mvpRequirements.length,
        run: mockGenerationRun,
        selectedCount: selectedRequirements.length,
      }),
    [
      canGenerateRows,
      demoRequirements.length,
      generationFeedback,
      generatedCount,
      generationMode,
      isGenerating,
      mockGenerationRun,
      mvpRequirements.length,
      selectedRequirements.length,
    ],
  );

  useEffect(() => {
    setGenerationAvailability(initialGenerationAvailability);
  }, [initialGenerationAvailability]);

  useEffect(() => {
    if (generationMode === "real" && !realGenerationCapability.available) {
      setGenerationMode("mock");
    }
  }, [generationMode, realGenerationCapability.available]);

  useEffect(() => {
    const feedbackReason = generationFeedback?.reason;
    if (generationFeedback?.code !== "real-generation-unavailable" || !feedbackReason) return;
    setGenerationAvailability((cur) => ({
      ok: true,
      checkedAt: new Date().toISOString(),
      modes: {
        mock: cur?.modes.mock ?? { available: true, message: "Draft mode is available.", mode: "mock", status: "available" },
        real: { available: false, message: generationFeedback.message, missingConfig: generationFeedback.missingConfig, mode: "real", status: feedbackReason },
      },
    }));
  }, [generationFeedback]);

  function handleToggleRequirementSelection(key: string) {
    setSelectedRequirementKeys((cur) => {
      const next = new Set(cur);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  }

  function handleToggleAllFilteredRequirements() {
    setSelectedRequirementKeys((cur) => {
      const next = new Set(cur);
      const allSelected = visibleRequirements.every((r) => next.has(r.requirementKey));
      visibleRequirements.forEach((r) => {
        if (allSelected) { next.delete(r.requirementKey); } else { next.add(r.requirementKey); }
      });
      return next;
    });
  }

  async function handleGenerateAndAdvance(targetRequirements: ReviewRequirement[], targetLabel: string) {
    const generated = await onGenerateRows(targetRequirements, targetLabel, generationMode);
    if (generated) onOpenReview();
  }

  async function handleRefreshGenerationAvailability() {
    setIsRefreshingAvailability(true);
    try {
      const response = await fetch("/api/requirements/generation-availability?refresh=1", { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as RequirementGenerationAvailabilityBody | null;
      if (response.ok && body?.ok) { setGenerationAvailability(body); return; }
      setGenerationAvailability((cur) => ({
        ok: true,
        checkedAt: new Date().toISOString(),
        modes: {
          mock: cur?.modes.mock ?? { available: true, message: "Draft mode is available.", mode: "mock", status: "available" },
          real: createUnavailableRealCapability("check-failed", "Grounded generation could not be confirmed right now."),
        },
      }));
    } finally {
      setIsRefreshingAvailability(false);
    }
  }

  return (
    <div className="fv-two-col">
      {/* Left: row explorer */}
      <RequirementsExplorer
        allFilteredRequirementsSelected={allFilteredRequirementsSelected}
        allRequirements={requirements}
        filter={activeFilter}
        onFilterChange={(f) => { setActiveFilter(f); setSelectedRowNumber(null); }}
        onSearchChange={setSearchQuery}
        onSelectRequirement={(req) => setSelectedRowNumber(req.sourceRowNumber)}
        onToggleAllFilteredRequirements={handleToggleAllFilteredRequirements}
        onToggleRequirementSelection={handleToggleRequirementSelection}
        searchQuery={searchQuery}
        selectedRequirementKeys={selectedRequirementKeys}
        selectedRowNumber={selectedRowNumber}
        visibleRequirements={visibleRequirements}
      />

      {/* Right: generation rail */}
      <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
        {/* Stats */}
        <div className="fv-card">
          <div className="fv-card-title">Slice Summary</div>
          <dl style={{ margin: 0 }}>
            {[
              { label: "Demo rows", value: demoRequirements.length },
              { label: "MVP rows", value: mvpRequirements.length },
              { label: "Selected", value: selectedRequirements.length },
              { label: "Generated", value: generatedCount },
            ].map((row) => (
              <div key={row.label} className="fv-detail-kv">
                <dt className="fv-detail-kv-label">{row.label}</dt>
                <dd className="fv-detail-kv-value">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Mode selector */}
        <GenerationModeSelector
          availability={realGenerationCapability}
          feedbackTone={generationFeedback?.tone ?? null}
          isRefreshingAvailability={isRefreshingAvailability}
          mode={generationMode}
          onModeChange={setGenerationMode}
          onRefreshAvailability={handleRefreshGenerationAvailability}
        />

        {/* Actions */}
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => handleGenerateAndAdvance(demoRequirements, "demo rows")}
            disabled={!canGenerateRows || demoRequirements.length === 0 || isGenerating}
            className="fv-btn-primary"
            style={{ justifyContent: "center" }}
          >
            {isGenerating ? "Generating…" : "Generate Recommended Draft →"}
          </button>
          <button
            type="button"
            onClick={() => handleGenerateAndAdvance(mvpRequirements, "MVP rows")}
            disabled={!canGenerateRows || mvpRequirements.length === 0 || isGenerating}
            className="fv-btn-secondary"
            style={{ justifyContent: "center" }}
          >
            Generate MVP rows
          </button>
          {selectedRequirements.length > 0 ? (
            <button
              type="button"
              onClick={() => handleGenerateAndAdvance(selectedRequirements, "selected rows")}
              disabled={!canGenerateRows || isGenerating}
              className="fv-btn-secondary"
              style={{ justifyContent: "center" }}
            >
              Generate selected ({selectedRequirements.length})
            </button>
          ) : null}
          {processingSummary.reviewReady ? (
            <button
              type="button"
              onClick={onOpenReview}
              className="fv-btn-secondary"
              style={{ justifyContent: "center" }}
            >
              Open review queue →
            </button>
          ) : null}
        </div>

        {/* Feedback */}
        {generationFeedback ? (
          <div
            className={`fv-callout ${generationFeedback.tone === "error" ? "fv-callout-error" : generationFeedback.tone === "success" ? "fv-callout-success" : "fv-callout-info"}`}
            role="status"
            aria-live="polite"
          >
            {generationFeedback.message}
          </div>
        ) : null}

        <FvProgressPanel
          className={`fv-generation-panel fv-generation-panel-${processingSummary.status}`}
          description={processingSummary.description}
          log={<GenerationActivityLog entries={processingSummary.logEntries} />}
          progress={processingSummary.progress}
          progressLabel="AI processing progress"
          stats={
            <GenerationProcessingStats
              generatedCount={generatedCount}
              selectedCount={selectedRequirements.length}
              targetCount={processingSummary.targetCount}
            />
          }
          steps={processingSummary.steps}
          title={processingSummary.title}
        />

        {lastGenerationMode === "real" && generationMode === "mock" ? (
          <p className="fv-help-text">Last run used grounded generation. Rail is back to draft mode.</p>
        ) : null}
      </div>
    </div>
  );
}

function GenerationActivityLog({
  entries,
}: {
  entries: GenerationProcessingSummary["logEntries"];
}) {
  return (
    <div className="fv-terminal" aria-label="Generation activity log">
      <div className="fv-terminal-info">Activity log</div>
      {entries.map((entry, index) => (
        <div className={`fv-terminal-${entry.tone}`} key={`${index}-${entry.message}`}>
          {entry.message}
        </div>
      ))}
    </div>
  );
}

function GenerationProcessingStats({
  generatedCount,
  selectedCount,
  targetCount,
}: {
  generatedCount: number;
  selectedCount: number;
  targetCount: number;
}) {
  return (
    <dl className="fv-generation-stats" aria-label="Generation metrics">
      <div>
        <dt>Target slice</dt>
        <dd>{targetCount}</dd>
      </div>
      <div>
        <dt>Selected rows</dt>
        <dd>{selectedCount}</dd>
      </div>
      <div>
        <dt>Generated drafts</dt>
        <dd>{generatedCount}</dd>
      </div>
    </dl>
  );
}

// ── Generation mode selector ───────────────────────────────────

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
    <div className="fv-card">
      <div className="fv-card-title">Generation Mode</div>

      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.5rem" }}>
        <button
          type="button"
          onClick={() => onModeChange("mock")}
          aria-pressed={mode === "mock"}
          className={mode === "mock" ? "fv-btn-primary" : "fv-btn-secondary"}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Draft
        </button>
        <button
          type="button"
          onClick={() => onModeChange("real")}
          disabled={realModeDisabled}
          aria-pressed={mode === "real"}
          className={mode === "real" ? "fv-btn-primary" : "fv-btn-secondary"}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Grounded
        </button>
      </div>

      <p className="fv-body-muted">
        <strong style={{ color: "var(--foreground)" }}>{mode === "mock" ? "Draft mode" : "Grounded generation"}</strong>
        {feedbackTone === "error" && mode === "real" ? " — failed safely, draft mode available." : "."}
        {!availability.available ? ` ${availability.message}` : ""}
      </p>

      {!availability.available ? (
        <button
          type="button"
          onClick={() => void onRefreshAvailability()}
          disabled={isRefreshingAvailability}
          className="fv-btn-secondary fv-btn-sm"
          style={{ marginTop: "0.5rem" }}
        >
          {isRefreshingAvailability ? "Rechecking…" : "Recheck access"}
        </button>
      ) : (
        <p className="fv-flag-yes" style={{ marginTop: "0.375rem" }}>✓ Grounded mode available</p>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function createFallbackRealCapability(): RequirementGenerationModeCapability {
  return createUnavailableRealCapability(
    "check-failed",
    "Grounded generation could not be confirmed right now. You can continue in draft mode and recheck later.",
  );
}

function createUnavailableRealCapability(
  reason: RequirementGenerationUnavailableReason,
  message: string,
  missingConfig?: string[],
): RequirementGenerationModeCapability {
  return { available: false, message, missingConfig, mode: "real", status: reason };
}

function createGenerationProcessingSummary({
  canGenerateRows,
  demoCount,
  feedback,
  generatedCount,
  isGenerating,
  mode,
  mvpCount,
  run,
  selectedCount,
}: {
  canGenerateRows: boolean;
  demoCount: number;
  feedback: GenerationFeedback;
  generatedCount: number;
  isGenerating: boolean;
  mode: RequirementGenerationRouteMode;
  mvpCount: number;
  run: GenerationRun;
  selectedCount: number;
}): GenerationProcessingSummary {
  const hasFailed = feedback?.tone === "error";
  const hasActiveStage = run.stages.some((stage) => stage.status === "running");
  const allStagesComplete = run.stages.every((stage) => stage.status === "complete");
  const hasCompleted =
    feedback?.tone === "success" || allStagesComplete || generatedCount > 0;
  const status: GenerationLifecycle = hasFailed
    ? "failed"
    : isGenerating || hasActiveStage
      ? "running"
      : hasCompleted
        ? "complete"
        : "ready";
  const completedStageCount = run.stages.filter(
    (stage) => stage.status === "complete",
  ).length;
  const firstIncompleteIndex = run.stages.findIndex(
    (stage) => stage.status !== "complete",
  );
  const progress =
    status === "complete"
      ? 100
      : status === "ready"
        ? 0
        : Math.max(
            status === "failed" ? 5 : 10,
            Math.round((completedStageCount / run.stages.length) * 100),
          );
  const targetCount =
    run.selectedCount || selectedCount || demoCount || mvpCount || 0;
  const steps = run.stages.map((stage, index): FvProgressStep => ({
    description: getGenerationStageDescription(stage.label),
    label: stage.label,
    meta: getGenerationStageMeta(stage.status, status),
    status: getGenerationStepStatus({
      firstIncompleteIndex,
      index,
      lifecycle: status,
      stageStatus: stage.status,
    }),
  }));
  const logEntries: GenerationProcessingSummary["logEntries"] = [
    {
      message:
        mode === "real"
          ? "mode > Grounded generation selected."
          : "mode > Draft generation selected.",
      tone: "info",
    },
    {
      message: `ready > ${demoCount} demo rows and ${mvpCount} MVP rows are available.`,
      tone: "info",
    },
  ];

  if (!canGenerateRows) {
    logEntries.push({
      message: "warn > Viewer access can inspect generation state but cannot start a run.",
      tone: "warn",
    });
  }

  if (status === "ready") {
    logEntries.push({
      message: `ready > Choose a slice to generate. ${targetCount} rows are currently queued by the primary action.`,
      tone: "info",
    });
  }

  if (status === "running") {
    logEntries.push({
      message: `run > Processing ${targetCount} row${targetCount === 1 ? "" : "s"}.`,
      tone: "run",
    });
  }

  if (feedback?.message) {
    logEntries.push({
      message: `${feedback.tone === "error" ? "error" : feedback.tone === "success" ? "ok" : "info"} > ${feedback.message}`,
      tone:
        feedback.tone === "error"
          ? "warn"
          : feedback.tone === "success"
            ? "ok"
            : "info",
    });
  }

  if (status === "complete") {
    logEntries.push({
      message: `ok > ${generatedCount} generated draft${generatedCount === 1 ? "" : "s"} ready for review.`,
      tone: "ok",
    });
  }

  if (status === "failed") {
    logEntries.push({
      message: "warn > No review handoff is unlocked from this failed run. Fix access/configuration or use draft mode.",
      tone: "warn",
    });
  }

  return {
    description: getGenerationLifecycleDescription(status, mode),
    logEntries,
    progress,
    reviewReady: status === "complete" && generatedCount > 0 && !isGenerating,
    status,
    targetCount,
    steps,
    title: getGenerationLifecycleTitle(status),
  };
}

function getGenerationStepStatus({
  firstIncompleteIndex,
  index,
  lifecycle,
  stageStatus,
}: {
  firstIncompleteIndex: number;
  index: number;
  lifecycle: GenerationLifecycle;
  stageStatus: GenerationRun["stages"][number]["status"];
}): FvProgressStepStatus {
  if (
    lifecycle === "failed" &&
    (stageStatus === "running" || index === firstIncompleteIndex)
  ) {
    return "error";
  }
  if (stageStatus === "complete") return "complete";
  if (stageStatus === "running") return "active";
  return "pending";
}

function getGenerationStageDescription(
  label: (typeof mockGenerationStageLabels)[number],
): string {
  switch (label) {
    case "Excel parsing":
      return "Confirm workbook rows, flags, and requirement identity.";
    case "MES knowledge lookup":
      return "Check grounded MES context before drafting.";
    case "Comment generation":
      return "Create consultant-facing requirement comments.";
    case "Demo script generation":
      return "Prepare demo steps and traceability for review.";
  }
}

function getGenerationStageMeta(
  stageStatus: GenerationRun["stages"][number]["status"],
  lifecycle: GenerationLifecycle,
): string {
  if (lifecycle === "failed" && stageStatus !== "complete") {
    return "failed";
  }
  if (stageStatus === "complete") return "complete";
  if (stageStatus === "running") return "running";
  return "waiting";
}

function getGenerationLifecycleTitle(status: GenerationLifecycle): string {
  switch (status) {
    case "ready":
      return "Ready to generate";
    case "running":
      return "Generation running";
    case "complete":
      return "Generation complete";
    case "failed":
      return "Generation failed";
  }
}

function getGenerationLifecycleDescription(
  status: GenerationLifecycle,
  mode: RequirementGenerationRouteMode,
): string {
  const modeLabel = mode === "real" ? "grounded" : "draft";

  switch (status) {
    case "ready":
      return `Choose a row slice and start ${modeLabel} generation when the source workbook looks correct.`;
    case "running":
      return `The ${modeLabel} generator is processing rows. Review stays locked until the run finishes.`;
    case "complete":
      return "Generated drafts are available. Continue to review before script/export.";
    case "failed":
      return `The ${modeLabel} generation attempt failed safely. Review remains locked for this run.`;
  }
}

function searchRequirements(requirements: ReviewRequirement[], searchQuery: string): ReviewRequirement[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return requirements;
  return requirements.filter((r) =>
    [r.requirementId, r.requirementDescription, r.l2Process, r.l3Process, r.operation, r.reviewStatus, r.sourceComment]
      .join(" ").toLowerCase().includes(q),
  );
}
