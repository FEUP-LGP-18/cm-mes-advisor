"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  RequirementReviewAction,
  ReviewRequirement,
} from "@/lib/requirements/review";
import { assessRequirementSupport } from "@/lib/requirements/generation";
import { evaluateRequirementValidation } from "@/lib/requirements/validation";

// ── Types ──────────────────────────────────────────────────────

type ExplorerFilter = "all" | "pending" | "review" | "approved" | "skipped";

interface ReviewStudioProps {
  approvedCount: number;
  canEditPhase1?: boolean;
  generatedCount: number;
  generatedReviewableRequirements: ReviewRequirement[];
  onGenerateDemoRows: () => Promise<boolean>;
  onGoToGenerate: () => void;
  onOpenScript: () => void;
  onReviewAction: (requirement: ReviewRequirement, action: RequirementReviewAction) => void;
  projectId: string;
  reviewRequirements: ReviewRequirement[];
}

// ── Status helpers ─────────────────────────────────────────────

const STATUS_LABEL: Record<ReviewRequirement["reviewStatus"], string> = {
  pending: "Pending",
  review: "Needs review",
  approved: "Approved",
  skipped: "Skipped",
};

const STATUS_COLOR: Record<ReviewRequirement["reviewStatus"], string> = {
  pending: "var(--muted-fg)",
  review: "var(--status-flagged)",
  approved: "var(--status-approved)",
  skipped: "var(--surface-border)",
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

// ── ReviewNavPanel ─────────────────────────────────────────────

function ReviewNavPanel({
  activeQueueIndex,
  approvedCount,
  canEdit,
  currentRequirement,
  explorerFilter,
  explorerQuery,
  explorerRows,
  onApproveReadyRows,
  onExplorerFilterChange,
  onExplorerQueryChange,
  onOpenRequirement,
  onOpenScript,
  onSelectNext,
  onSelectPrevious,
  onSkipRemainingRows,
  queuedRequirementKeys,
  readyBulkCount,
  reviewQueue,
}: {
  activeQueueIndex: number;
  approvedCount: number;
  canEdit: boolean;
  currentRequirement: ReviewRequirement | null;
  explorerFilter: ExplorerFilter;
  explorerQuery: string;
  explorerRows: ReviewRequirement[];
  onApproveReadyRows: () => void;
  onExplorerFilterChange: (f: ExplorerFilter) => void;
  onExplorerQueryChange: (q: string) => void;
  onOpenRequirement: (req: ReviewRequirement) => void;
  onOpenScript: () => void;
  onSelectNext: (req: ReviewRequirement | null) => void;
  onSelectPrevious: (req: ReviewRequirement | null) => void;
  onSkipRemainingRows: () => void;
  queuedRequirementKeys: Set<string>;
  readyBulkCount: number;
  reviewQueue: ReviewRequirement[];
}) {
  return (
    <aside className="fv-review-nav">
      {/* Nav header */}
      <div className="fv-card" style={{ padding: "1rem" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.25rem" }}>
          Review queue
        </div>
        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.875rem" }}>
          Pending requirements
        </div>

        {/* Previous / Next */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <button
            type="button"
            onClick={() => onSelectPrevious(currentRequirement)}
            disabled={reviewQueue.length === 0 || activeQueueIndex <= 0}
            className="fv-btn-secondary"
            style={{ justifyContent: "center", padding: "0.5rem" }}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onSelectNext(currentRequirement)}
            disabled={reviewQueue.length === 0 || activeQueueIndex >= reviewQueue.length - 1}
            className="fv-btn-secondary"
            style={{ justifyContent: "center", padding: "0.5rem", fontWeight: 700, background: "var(--foreground)", color: "#fff", borderColor: "var(--foreground)" }}
          >
            Next
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
          {[
            { label: "PENDING", value: reviewQueue.length },
            { label: "APPROVED", value: approvedCount },
            { label: "POSITION", value: activeQueueIndex >= 0 ? `${activeQueueIndex + 1}/${reviewQueue.length}` : "—" },
          ].map(({ label, value }) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.2rem 0.6rem", border: "1px solid var(--surface-border)", borderRadius: "999px", fontSize: "0.7rem" }}>
              <span style={{ fontWeight: 600, color: "var(--muted-fg)", letterSpacing: "0.06em" }}>{label}</span>
              <span style={{ fontWeight: 800, color: "var(--foreground)" }}>{value}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Bulk decisions */}
      {canEdit && reviewQueue.length > 0 && (
        <div className="fv-card" style={{ padding: "1rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.5rem" }}>
            Bulk decisions
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--muted-fg)", marginBottom: "0.75rem", lineHeight: 1.4 }}>
            Use this only for demo-speed review. Row-level decisions stay available in the main card.
          </p>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={onApproveReadyRows}
              disabled={readyBulkCount === 0}
              className="fv-btn-secondary"
              style={{ justifyContent: "center" }}
            >
              Approve ready rows
            </button>
            <button
              type="button"
              onClick={onSkipRemainingRows}
              className="fv-btn-secondary"
              style={{ justifyContent: "center" }}
            >
              Skip remaining rows
            </button>
          </div>
          {readyBulkCount > 0 && (
            <p style={{ fontSize: "0.72rem", color: "var(--muted-fg)", marginTop: "0.5rem" }}>
              {readyBulkCount} pending {readyBulkCount === 1 ? "row has" : "rows have"} no validation flags.
            </p>
          )}
        </div>
      )}

      {/* Inventory list */}
      <div className="fv-card" style={{ padding: "1rem", flex: 1 }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.5rem" }}>
          Inventory
        </div>
        <p style={{ fontSize: "0.72rem", color: "var(--muted-fg)", marginBottom: "0.625rem" }}>
          Open a pending row directly from the list.
        </p>

        {/* Filter strip */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "0.5rem" }}>
          {(["all", "pending", "review", "approved", "skipped"] as ExplorerFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onExplorerFilterChange(f)}
              style={{
                padding: "0.15rem 0.5rem",
                fontSize: "0.65rem",
                fontWeight: explorerFilter === f ? 700 : 500,
                border: "1px solid",
                borderColor: explorerFilter === f ? "var(--brand-primary)" : "var(--surface-border)",
                borderRadius: "999px",
                background: explorerFilter === f ? "color-mix(in srgb, var(--brand-primary) 10%, #fff)" : "#fff",
                color: explorerFilter === f ? "var(--brand-primary)" : "var(--muted-fg)",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Search ID, process, or draft…"
          value={explorerQuery}
          onChange={(e) => onExplorerQueryChange(e.target.value)}
          className="fv-input"
          style={{ marginBottom: "0.5rem", fontSize: "0.78rem" }}
        />

        {explorerRows.length === 0 ? (
          <p style={{ fontSize: "0.78rem", color: "var(--muted-fg)", padding: "0.5rem 0" }}>No rows match the filter.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.25rem" }}>
            {explorerRows.slice(0, 50).map((req) => {
              const isQueued = queuedRequirementKeys.has(req.requirementKey);
              const isCurrent = currentRequirement?.requirementKey === req.requirementKey;
              return (
                <div
                  key={req.requirementKey}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    padding: "0.375rem 0.5rem",
                    borderRadius: "6px",
                    background: isCurrent ? "color-mix(in srgb, var(--brand-primary) 8%, #fff)" : "transparent",
                    border: `1px solid ${isCurrent ? "var(--brand-primary)" : "transparent"}`,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--foreground)" }}>
                      {req.requirementId || `Row ${req.sourceRowNumber}`}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted-fg)", display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                      <span style={{ color: STATUS_COLOR[req.reviewStatus] }}>{STATUS_LABEL[req.reviewStatus]}</span>
                      {" · "}
                      <span>Row {req.sourceRowNumber}</span>
                    </div>
                  </div>
                  {isQueued && (
                    <button
                      type="button"
                      onClick={() => onOpenRequirement(req)}
                      className="fv-btn-secondary"
                      style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", flexShrink: 0 }}
                    >
                      Open
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Open script */}
      <button type="button" onClick={onOpenScript} className="fv-btn-secondary" style={{ justifyContent: "center" }}>
        Open script
      </button>
    </aside>
  );
}

// ── ReviewMainContent ──────────────────────────────────────────

function ReviewMainContent({ requirement }: { requirement: ReviewRequirement }) {
  const assessment = assessRequirementSupport(requirement);
  const validation = evaluateRequirementValidation(requirement, assessment);
  const draft = requirement.generatedOutput.state === "mock-generated-draft"
    ? requirement.generatedOutput.draft
    : null;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Row header */}
      <div className="fv-card">
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem" }}>
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)" }}>
              Row {requirement.sourceRowNumber}
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--foreground)", lineHeight: 1.1, marginTop: "0.125rem" }}>
              {requirement.requirementId || "No ID"}
            </div>
          </div>
          <span style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 700,
            border: "1px solid",
            borderColor: STATUS_COLOR[requirement.reviewStatus],
            color: STATUS_COLOR[requirement.reviewStatus],
            whiteSpace: "nowrap",
          }}>
            {STATUS_LABEL[requirement.reviewStatus]}
          </span>
        </div>

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.75rem" }}>
          {[
            { label: "L2", value: requirement.l2Process },
            { label: "L3", value: requirement.l3Process || requirement.operation },
            { label: "Demo", value: requirement.demo ? "Yes" : "No" },
            { label: "MVP", value: requirement.mvp ? "Yes" : "No" },
          ].map(({ label, value }) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.2rem 0.625rem", border: "1px solid var(--surface-border)", borderRadius: "999px", fontSize: "0.72rem" }}>
              <span style={{ fontWeight: 700, color: "var(--brand-primary)" }}>{label}</span>
              <span style={{ color: "var(--foreground)" }}>{value || "—"}</span>
            </span>
          ))}
        </div>

        {requirement.requirementDescription && (
          <p style={{ fontSize: "0.9rem", color: "var(--foreground)", lineHeight: 1.6, margin: 0 }}>
            {requirement.requirementDescription}
          </p>
        )}
      </div>

      {/* Validation */}
      <div style={{
        padding: "0.875rem 1rem",
        border: `1px solid ${SEVERITY_BORDER[validation.severity]}`,
        borderLeft: `3px solid ${SEVERITY_BORDER[validation.severity]}`,
        borderRadius: "8px",
        background: SEVERITY_BG[validation.severity],
      }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.375rem" }}>
          Validation
        </div>
        <div style={{ fontWeight: 700, color: "var(--foreground)", marginBottom: "0.375rem" }}>
          {validation.headline}
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--foreground)", margin: "0 0 0.375rem", lineHeight: 1.5 }}>
          {validation.guidance}
        </p>
        {validation.signals.length > 0 && (
          <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-fg)", margin: 0 }}>
            {validation.signals.join(" · ")}
          </p>
        )}
        {validation.isSafeToApprove && (
          <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-fg)", margin: 0 }}>
            No validation flags from the draft heuristic.
          </p>
        )}
      </div>

      {draft ? (
        <>
          {/* Draft comment */}
          <div style={{
            padding: "1rem",
            border: "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)",
            borderRadius: "8px",
            background: "color-mix(in srgb, var(--brand-primary) 5%, #f8faff)",
          }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.5rem" }}>
              Draft comment
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--foreground)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
              {draft.generatedComment}
            </p>
          </div>

          {/* Demo steps */}
          {draft.demoSteps.length > 0 && (
            <div className="fv-card">
              <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.75rem" }}>
                Demo steps
              </div>
              <ol style={{ display: "grid", gap: "0.75rem", listStyle: "none", padding: 0, margin: 0 }}>
                {draft.demoSteps.map((step, i) => (
                  <li key={step.id} style={{ padding: "0.75rem", background: "var(--surface-muted)", borderRadius: "6px" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", marginBottom: "0.25rem" }}>
                      {i + 1}. {step.title}
                    </div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--brand-primary)", marginBottom: "0.5rem" }}>
                      {step.mesModuleOrScreen}
                    </div>
                    <ol style={{ paddingLeft: "1.25rem", margin: 0, display: "grid", gap: "0.25rem" }}>
                      {step.instructions.map((instr) => (
                        <li key={instr} style={{ fontSize: "0.8rem", color: "var(--muted-fg)", lineHeight: 1.5 }}>
                          {instr}
                        </li>
                      ))}
                    </ol>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      ) : (
        <div className="fv-card" style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ fontWeight: 700, color: "var(--foreground)", marginBottom: "0.25rem" }}>No generated draft</p>
          <p style={{ fontSize: "0.85rem", color: "var(--muted-fg)", margin: 0 }}>
            This requirement does not have a draft yet. Go to the Generate step first.
          </p>
        </div>
      )}
    </div>
  );
}

// ── ReviewDecisionPanel ────────────────────────────────────────

function ReviewDecisionPanel({
  canEdit,
  onReviewAction,
  requirement,
}: {
  canEdit: boolean;
  onReviewAction: (req: ReviewRequirement, action: RequirementReviewAction) => void;
  requirement: ReviewRequirement;
}) {
  const ACTIONS: { label: string; action: RequirementReviewAction; style?: React.CSSProperties }[] = [
    { label: "Approve and next", action: { type: "approve" }, style: { background: "var(--brand-primary)", color: "#fff", borderColor: "var(--brand-primary)", fontWeight: 700 } },
    { label: "Needs review", action: { type: "flag" }, style: { background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" } },
    { label: "Skip row", action: { type: "skip" } },
    { label: "Reset draft", action: { type: "resetToDraft" } },
  ];

  return (
    <aside className="fv-review-decisions">
      <div className="fv-card" style={{ padding: "1rem" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.375rem" }}>
          Consultant decision
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          {canEdit
            ? "Approve, flag, or skip this row, then refine the comment and note while the draft is still in view."
            : "Viewer access can inspect the saved decision but cannot change review state."}
        </p>

        <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {ACTIONS.map(({ label, action, style }) => (
            <button
              key={label}
              type="button"
              disabled={!canEdit}
              onClick={() => onReviewAction(requirement, action)}
              style={{
                padding: "0.625rem 1rem",
                border: "1px solid var(--surface-border)",
                borderRadius: "8px",
                background: "#fff",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--foreground)",
                cursor: "pointer",
                transition: "opacity 0.15s",
                ...style,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: "0.875rem" }}>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)" }}>
              Consultant comment
            </span>
            <textarea
              value={requirement.consultantComment}
              disabled={!canEdit}
              onChange={(e) => onReviewAction(requirement, { type: "edit", consultantComment: e.currentTarget.value })}
              placeholder="Edit the customer-facing wording before approval."
              className="fv-input"
              rows={5}
              style={{ resize: "vertical" }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)" }}>
              Review note
            </span>
            <textarea
              value={requirement.reviewNote}
              disabled={!canEdit}
              onChange={(e) => onReviewAction(requirement, { type: "edit", reviewNote: e.currentTarget.value })}
              placeholder="Why approve, flag, or skip this row?"
              className="fv-input"
              rows={3}
              style={{ resize: "vertical" }}
            />
          </label>
        </div>
      </div>
    </aside>
  );
}

// ── ReviewEmptyState ───────────────────────────────────────────

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
    <div className="fv-card" style={{ maxWidth: "520px", margin: "0 auto", textAlign: "center", padding: "2.5rem 2rem" }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.75rem" }}>
        Requirements
      </div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--foreground)", margin: "0 0 0.75rem" }}>
        {generatedCount > 0 ? "All rows reviewed" : "No requirements generated yet"}
      </h2>
      <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
        {generatedCount > 0
          ? "All generated requirements have been reviewed. Go back to generate more or proceed to the script step."
          : "Upload a source workbook and run generation to get requirements ready for review."}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
        {generatedCount === 0 ? (
          <button type="button" onClick={handleGenerate} disabled={generating} className="fv-btn-primary">
            {generating ? "Generating…" : "Generate demo rows"}
          </button>
        ) : null}
        <button type="button" onClick={onGoToGenerate} className="fv-btn-secondary">
          Back to generation
        </button>
      </div>
    </div>
  );
}

// ── ReviewStudio (main) ────────────────────────────────────────

function isExplorerFilter(val: string | null): val is ExplorerFilter {
  return val === "all" || val === "pending" || val === "review" || val === "approved" || val === "skipped";
}

function filterExplorerRequirements(requirements: ReviewRequirement[], filter: ExplorerFilter): ReviewRequirement[] {
  if (filter === "all") return requirements;
  return requirements.filter((r) => r.reviewStatus === filter);
}

function searchExplorerRequirements(requirements: ReviewRequirement[], query: string): ReviewRequirement[] {
  const q = query.trim().toLowerCase();
  if (!q) return requirements;
  return requirements.filter(
    (r) =>
      r.requirementId.toLowerCase().includes(q) ||
      r.l2Process.toLowerCase().includes(q) ||
      r.l3Process.toLowerCase().includes(q) ||
      (r.generatedOutput.state === "mock-generated-draft" &&
        r.generatedOutput.generatedCommentDraft?.toLowerCase().includes(q)),
  );
}

function isRequirementReadyForBulkApproval(req: ReviewRequirement) {
  const assessment = assessRequirementSupport(req);
  const validation = evaluateRequirementValidation(req, assessment);
  return validation.isSafeToApprove;
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
  const readyBulkRequirements = useMemo(
    () => reviewQueue.filter(isRequirementReadyForBulkApproval),
    [reviewQueue],
  );
  const generatedInventory = useMemo(
    () => reviewRequirements.filter((r) => r.generatedOutput.state === "mock-generated-draft"),
    [reviewRequirements],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(
    generatedReviewableRequirements[0]?.requirementKey ?? null,
  );
  const [explorerFilter, setExplorerFilter] = useState<ExplorerFilter>("pending");
  const [explorerQuery, setExplorerQuery] = useState("");

  // Restore persisted state
  useEffect(() => {
    let frame = 0;
    try {
      const s = window.localStorage.getItem(selectionKey);
      const f = window.localStorage.getItem(filterKey);
      const q = window.localStorage.getItem(queryKey);
      frame = window.requestAnimationFrame(() => {
        if (s) setSelectedKey(s);
        if (isExplorerFilter(f)) setExplorerFilter(f);
        if (q) setExplorerQuery(q);
      });
    } catch { /* ignore */ }
    return () => { if (frame) window.cancelAnimationFrame(frame); };
  }, [filterKey, queryKey, selectionKey]);

  const activeKey =
    selectedKey && reviewQueue.some((r) => r.requirementKey === selectedKey)
      ? selectedKey
      : (reviewQueue[0]?.requirementKey ?? null);

  const currentRequirement = reviewQueue.find((r) => r.requirementKey === activeKey) ?? reviewQueue[0] ?? null;
  const activeQueueIndex = currentRequirement
    ? reviewQueue.findIndex((r) => r.requirementKey === currentRequirement.requirementKey)
    : -1;

  const explorerRows = useMemo(
    () => searchExplorerRequirements(filterExplorerRequirements(generatedInventory, explorerFilter), explorerQuery),
    [explorerFilter, explorerQuery, generatedInventory],
  );

  const queuedRequirementKeys = useMemo(
    () => new Set(reviewQueue.map((r) => r.requirementKey)),
    [reviewQueue],
  );

  const selectNext = useCallback(
    (req: ReviewRequirement | null) => {
      if (!req) { setSelectedKey(reviewQueue[0]?.requirementKey ?? null); return; }
      const remaining = reviewQueue.filter((r) => r.requirementKey !== req.requirementKey);
      const next = remaining.find((r) => r.sourceRowNumber > req.sourceRowNumber) ?? remaining[0] ?? null;
      setSelectedKey(next?.requirementKey ?? null);
    },
    [reviewQueue],
  );

  const selectPrevious = useCallback(
    (req: ReviewRequirement | null) => {
      if (reviewQueue.length === 0) { setSelectedKey(null); return; }
      if (!req) { setSelectedKey(reviewQueue[0]?.requirementKey ?? null); return; }
      const idx = reviewQueue.findIndex((r) => r.requirementKey === req.requirementKey);
      setSelectedKey(idx <= 0 ? (reviewQueue[0]?.requirementKey ?? null) : (reviewQueue[idx - 1]?.requirementKey ?? null));
    },
    [reviewQueue],
  );

  const handleReviewAction = useCallback(
    (req: ReviewRequirement, action: RequirementReviewAction) => {
      if (!canEditPhase1) return;
      onReviewAction(req, action);
      if (action.type === "approve" || action.type === "flag" || action.type === "skip") {
        selectNext(req);
      }
    },
    [canEditPhase1, onReviewAction, selectNext],
  );

  const handleApproveReadyRows = useCallback(() => {
    if (!canEditPhase1 || readyBulkRequirements.length === 0) return;
    const approvedKeys = new Set(readyBulkRequirements.map((r) => r.requirementKey));
    readyBulkRequirements.forEach((r) => onReviewAction(r, { type: "approve" }));
    const next = reviewQueue.find((r) => !approvedKeys.has(r.requirementKey)) ?? null;
    setSelectedKey(next?.requirementKey ?? null);
  }, [canEditPhase1, onReviewAction, readyBulkRequirements, reviewQueue]);

  const handleSkipRemainingRows = useCallback(() => {
    if (!canEditPhase1 || reviewQueue.length === 0) return;
    reviewQueue.forEach((r) => onReviewAction(r, { type: "skip" }));
    setSelectedKey(null);
  }, [canEditPhase1, onReviewAction, reviewQueue]);

  // Persist selection and filter
  useEffect(() => {
    if (!activeKey) return;
    try { window.localStorage.setItem(selectionKey, activeKey); } catch { /* ignore */ }
  }, [activeKey, selectionKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(filterKey, explorerFilter);
      window.localStorage.setItem(queryKey, explorerQuery);
    } catch { /* ignore */ }
  }, [explorerFilter, filterKey, explorerQuery, queryKey]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.getAttribute("contenteditable") === "true";
      if (typing || !currentRequirement) return;
      if (e.key === "[") { e.preventDefault(); selectPrevious(currentRequirement); }
      if (e.key === "]") { e.preventDefault(); selectNext(currentRequirement); }
      if (!canEditPhase1) return;
      if (e.key.toLowerCase() === "a") { e.preventDefault(); handleReviewAction(currentRequirement, { type: "approve" }); }
      if (e.key.toLowerCase() === "f") { e.preventDefault(); handleReviewAction(currentRequirement, { type: "flag" }); }
      if (e.key.toLowerCase() === "s") { e.preventDefault(); handleReviewAction(currentRequirement, { type: "skip" }); }
      if (e.key.toLowerCase() === "r") { e.preventDefault(); handleReviewAction(currentRequirement, { type: "resetToDraft" }); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canEditPhase1, currentRequirement, handleReviewAction, selectNext, selectPrevious]);

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
    <>
      <div className="fv-review-grid">
        <ReviewNavPanel
          activeQueueIndex={activeQueueIndex}
          approvedCount={approvedCount}
          canEdit={canEditPhase1}
          currentRequirement={currentRequirement}
          explorerFilter={explorerFilter}
          explorerQuery={explorerQuery}
          explorerRows={explorerRows}
          onApproveReadyRows={handleApproveReadyRows}
          onExplorerFilterChange={setExplorerFilter}
          onExplorerQueryChange={setExplorerQuery}
          onOpenRequirement={(req) => setSelectedKey(req.requirementKey)}
          onOpenScript={onOpenScript}
          onSelectNext={selectNext}
          onSelectPrevious={selectPrevious}
          onSkipRemainingRows={handleSkipRemainingRows}
          queuedRequirementKeys={queuedRequirementKeys}
          readyBulkCount={readyBulkRequirements.length}
          reviewQueue={reviewQueue}
        />

        <ReviewMainContent requirement={currentRequirement} />

        <ReviewDecisionPanel
          canEdit={canEditPhase1}
          onReviewAction={handleReviewAction}
          requirement={currentRequirement}
        />
      </div>

      {/* Mobile action bar */}
      <div className="fv-mobile-action-bar">
        <button type="button" disabled={!canEditPhase1} onClick={() => handleReviewAction(currentRequirement, { type: "approve" })} className="fv-btn-primary" style={{ justifyContent: "center" }}>
          Approve
        </button>
        <button type="button" disabled={!canEditPhase1} onClick={() => handleReviewAction(currentRequirement, { type: "flag" })} className="fv-btn-secondary" style={{ justifyContent: "center" }}>
          Flag
        </button>
        <button type="button" disabled={!canEditPhase1} onClick={() => handleReviewAction(currentRequirement, { type: "skip" })} className="fv-btn-secondary" style={{ justifyContent: "center" }}>
          Skip
        </button>
        <button type="button" onClick={() => selectNext(currentRequirement)} className="fv-btn-secondary" style={{ justifyContent: "center" }}>
          Next
        </button>
      </div>
    </>
  );
}
