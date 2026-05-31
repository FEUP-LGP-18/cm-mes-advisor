"use client";

import { useState } from "react";
import {
  MASTER_DATA_APPROVAL_REQUIRED_FEEDBACK,
  masterDataObjectTypeLabels,
  masterDataObjectTypes,
  type MasterDataApplicableRequirement,
  type MasterDataGenerationMode,
  type MasterDataObjectType,
} from "@/lib/master-data/types";

export default function MasterDataSetupStudio({
  applicableRequirements,
  approvedCount,
  feedback,
  hasGeneratedPhase1Drafts,
  mode,
  onAnalyze,
  onContinueToProcess,
  onModeChange,
  onOpenPhase1Generate,
  onOpenPhase1Review,
  onToggleObjectType,
  onToggleRequirement,
  selectedObjectTypes,
  selectedRequirementKeys,
}: {
  applicableRequirements: MasterDataApplicableRequirement[];
  approvedCount: number;
  feedback: string | null;
  hasAnalysisRun: boolean;
  hasGeneratedPhase1Drafts: boolean;
  mode: MasterDataGenerationMode;
  onAnalyze: () => Promise<boolean>;
  onContinueToProcess: () => void;
  onModeChange: (mode: MasterDataGenerationMode) => void;
  onOpenPhase1Generate: () => void;
  onOpenPhase1Review: () => void;
  onToggleObjectType: (objectType: MasterDataObjectType) => void;
  onToggleRequirement: (requirementKey: string) => void;
  selectedObjectTypes: MasterDataObjectType[];
  selectedRequirementKeys: string[];
}) {
  const hasAnalysis = applicableRequirements.length > 0;
  const isPhase2Locked = approvedCount === 0;
  const visibleFeedback =
    !isPhase2Locked && feedback === MASTER_DATA_APPROVAL_REQUIRED_FEEDBACK
      ? null
      : feedback;

  const [analyzing, setAnalyzing] = useState(false);
  const [query, setQuery] = useState("");

  async function handleAnalyze() {
    setAnalyzing(true);
    await onAnalyze();
    setAnalyzing(false);
  }

  const canProceed = selectedRequirementKeys.length > 0 && !isPhase2Locked;
  const filteredReqs = applicableRequirements.filter((r) =>
    !query.trim() ||
    r.requirementDescription.toLowerCase().includes(query.toLowerCase()) ||
    r.requirementId.toLowerCase().includes(query.toLowerCase()),
  );

  // Screen 1: Scope setup (no analysis yet)
  if (!hasAnalysis) {
    return <ConfigureScopeScreen
      approvedCount={approvedCount}
      isPhase2Locked={isPhase2Locked}
      hasGeneratedPhase1Drafts={hasGeneratedPhase1Drafts}
      mode={mode}
      onModeChange={onModeChange}
      selectedObjectTypes={selectedObjectTypes}
      onToggleObjectType={onToggleObjectType}
      analyzing={analyzing}
      onAnalyze={handleAnalyze}
      visibleFeedback={visibleFeedback}
      onOpenPhase1Generate={onOpenPhase1Generate}
      onOpenPhase1Review={onOpenPhase1Review}
    />;
  }

  // Screen 2: Requirements Analysis table
  const applicableCount = applicableRequirements.length;
  const selectedCount = selectedRequirementKeys.length;
  const allSelected = filteredReqs.every((r) => selectedRequirementKeys.includes(r.requirementKey));

  function handleSelectAll() {
    filteredReqs.forEach((r) => {
      if (!selectedRequirementKeys.includes(r.requirementKey)) {
        onToggleRequirement(r.requirementKey);
      }
    });
  }

  function handleDeselectAll() {
    filteredReqs.forEach((r) => {
      if (selectedRequirementKeys.includes(r.requirementKey)) {
        onToggleRequirement(r.requirementKey);
      }
    });
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 className="fv-page-title">Requirements Analysis</h1>
        <p className="fv-page-subtitle">
          AI mapped {applicableCount} of {approvedCount} approved Phase 1
          requirements to MES objects. Review and confirm the selection before
          generation.
        </p>
      </div>

      {visibleFeedback ? (
        <div className="fv-callout fv-callout-warning" style={{ marginBottom: "1rem" }}>
          {visibleFeedback}
        </div>
      ) : null}

      {/* Table */}
      <div className="fv-table-wrap">
        {/* Toolbar */}
        <div className="fv-table-toolbar">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search requirement or object..."
            className="fv-search-input"
          />
          <button type="button" className="fv-filter-btn">Object Type ▾</button>
          <button type="button" className="fv-filter-btn">Confidence ▾</button>
          <button type="button" className="fv-filter-btn">Status ▾</button>
          <div className="fv-table-toolbar-right">
            <button
              type="button"
              onClick={handleSelectAll}
              style={{ fontSize: "0.78rem", color: "var(--brand-primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              ✓ Select All
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              style={{ fontSize: "0.78rem", color: "var(--muted-fg)", background: "none", border: "none", cursor: "pointer" }}
            >
              Deselect
            </button>
          </div>
        </div>

        {/* Table header label */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.625rem 0.875rem", borderBottom: "1px solid var(--surface-border)", background: "var(--surface-muted)" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)" }}>
            Requirements → MES Object Mapping
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--muted-fg)" }}>
            AI auto-selected {selectedCount} of {applicableCount} applicable rows · {approvedCount} total
          </span>
        </div>

        <table className="fv-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allSelected && filteredReqs.length > 0}
                  onChange={allSelected ? handleDeselectAll : handleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th>Req. ID</th>
              <th>Requirement Text</th>
              <th>MES Object</th>
              <th>Confidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredReqs.map((req) => {
              const isSelected = selectedRequirementKeys.includes(req.requirementKey);
              const conf = req.confidence.level;
              const primaryType = req.suggestedObjectTypes[0];
              const typeLabel = primaryType ? masterDataObjectTypeLabels[primaryType] : "—";

              return (
                <tr
                  key={req.requirementKey}
                  className={`fv-table-row-stripe ${isSelected ? "fv-table-row-stripe-ai" : "fv-table-row-stripe-pending"}`}
                  style={isSelected ? { background: "#f0f6ff" } : undefined}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleRequirement(req.requirementKey)}
                      aria-label={`Select ${req.requirementId}`}
                    />
                  </td>
                  <td>
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.78rem", color: "var(--muted-fg)" }}>
                      {req.requirementId || `R-${req.sourceRowNumber}`}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: isSelected ? 500 : 400, color: isSelected ? "var(--brand-primary)" : "var(--foreground)" }}>
                      {req.requirementDescription}
                    </span>
                  </td>
                  <td className="fv-table-muted">{typeLabel}</td>
                  <td>
                    {conf === "high" ? <span className="fv-conf-high">High</span>
                      : conf === "medium" ? <span className="fv-conf-medium">Medium</span>
                      : <span className="fv-conf-low">Low</span>}
                  </td>
                  <td>
                    {req.preselected ? (
                      <span className="fv-badge fv-badge-approved">
                        <span className="fv-badge-dot" />Approved
                      </span>
                    ) : isSelected ? (
                      <span className="fv-badge fv-badge-ai">
                        <span className="fv-badge-dot" />AI Generated
                      </span>
                    ) : (
                      <span className="fv-badge fv-badge-pending">
                        <span className="fv-badge-dot" />Pending
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

          {filteredReqs.length === 0 && (
          <div className="fv-empty">
            <div className="fv-empty-title">No requirements found</div>
            <div className="fv-empty-body">Try adjusting your search or filters.</div>
          </div>
        )}
      </div>

      {/* Generate CTA */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
        <button
          type="button"
          onClick={onContinueToProcess}
          disabled={!canProceed}
          className="fv-btn-primary"
        >
          Generate Master Data →
        </button>
      </div>
    </div>
  );
}

function ConfigureScopeScreen({
  approvedCount,
  isPhase2Locked,
  hasGeneratedPhase1Drafts,
  mode,
  onModeChange,
  selectedObjectTypes,
  onToggleObjectType,
  analyzing,
  onAnalyze,
  visibleFeedback,
  onOpenPhase1Generate,
  onOpenPhase1Review,
}: {
  approvedCount: number;
  isPhase2Locked: boolean;
  hasGeneratedPhase1Drafts: boolean;
  mode: MasterDataGenerationMode;
  onModeChange: (m: MasterDataGenerationMode) => void;
  selectedObjectTypes: MasterDataObjectType[];
  onToggleObjectType: (t: MasterDataObjectType) => void;
  analyzing: boolean;
  onAnalyze: () => void;
  visibleFeedback: string | null;
  onOpenPhase1Generate: () => void;
  onOpenPhase1Review: () => void;
}) {
  const sourceStatus = isPhase2Locked ? "Locked" : "Ready";
  const selectedObjectTypeLabels = selectedObjectTypes.map(
    (type) => masterDataObjectTypeLabels[type],
  );

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 className="fv-page-title">Configure Master Data Scope</h1>
        <p className="fv-page-subtitle">
          Use approved Phase 1 requirements to generate a draft Master Data
          package. No second requirements upload is needed for Phase 2.
        </p>
      </div>

      {isPhase2Locked ? (
        <div className="fv-callout fv-callout-warning" style={{ marginBottom: "1.5rem" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="8" r="6" /><line x1="8" y1="5" x2="8" y2="8" /><line x1="8" y1="11" x2="8" y2="11" strokeWidth="2.5" />
          </svg>
          <div>
            Phase 1 approval required — at least one requirement must be approved before running Phase 2 analysis.{" "}
            <button
              type="button"
              onClick={hasGeneratedPhase1Drafts ? onOpenPhase1Review : onOpenPhase1Generate}
              style={{ color: "var(--brand-primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              {hasGeneratedPhase1Drafts ? "Open Phase 1 review →" : "Generate Phase 1 drafts →"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="fv-two-col-wide">
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <section className="fv-card" aria-labelledby="phase2-source-title">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
              <div>
                <p className="fv-field-label">Source basis</p>
                <h2 className="fv-card-title" id="phase2-source-title">Phase 1 source</h2>
              </div>
              <span className={`fv-badge ${isPhase2Locked ? "fv-badge-pending" : "fv-badge-approved"}`}>
                <span className="fv-badge-dot" />
                {sourceStatus}
              </span>
            </div>
            <p style={{ color: "var(--muted-fg)", fontSize: "0.86rem", lineHeight: 1.55, marginTop: "0.5rem" }}>
              Phase 2 analyzes the requirements already approved in Phase 1.
              The original workbook stays the Phase 1 source of truth.
            </p>
            <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", marginTop: "1rem" }}>
              <div className="fv-card" style={{ boxShadow: "none", padding: "0.75rem" }}>
                <div className="fv-field-label">Approved rows</div>
                <strong style={{ color: isPhase2Locked ? "var(--muted-fg)" : "var(--status-approved)", fontSize: "1.35rem" }}>
                  {approvedCount}
                </strong>
              </div>
              <div className="fv-card" style={{ boxShadow: "none", padding: "0.75rem" }}>
                <div className="fv-field-label">Input type</div>
                <strong style={{ fontSize: "0.85rem" }}>Phase 1 approvals</strong>
              </div>
              <div className="fv-card" style={{ boxShadow: "none", padding: "0.75rem" }}>
                <div className="fv-field-label">Next step</div>
                <strong style={{ fontSize: "0.85rem" }}>Analyze scope</strong>
              </div>
            </div>
          </section>

          {!isPhase2Locked ? (
            <section className="fv-card" aria-labelledby="phase2-object-scope-title">
              <p className="fv-field-label">What should I select?</p>
              <h2 className="fv-card-title" id="phase2-object-scope-title">Object scope</h2>
              <p style={{ color: "var(--muted-fg)", fontSize: "0.82rem", lineHeight: 1.5, marginTop: "0.35rem" }}>
                Choose the Master Data object families that should be drafted
                from the approved Phase 1 rows.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.875rem" }}>
                {masterDataObjectTypes.map((type) => {
                  const selected = selectedObjectTypes.includes(type);

                  return (
                    <button
                      aria-pressed={selected}
                      className={selected ? "fv-btn-primary" : "fv-btn-secondary"}
                      key={type}
                      onClick={() => onToggleObjectType(type)}
                      style={{ padding: "0.45rem 0.7rem", fontSize: "0.78rem" }}
                      type="button"
                    >
                      {masterDataObjectTypeLabels[type]}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {!isPhase2Locked ? (
            <section className="fv-card" aria-labelledby="phase2-generation-mode-title">
              <p className="fv-field-label">Generation mode</p>
              <h2 className="fv-card-title" id="phase2-generation-mode-title">Drafting source</h2>
              <div style={{ display: "grid", gap: "0.625rem", marginTop: "0.875rem" }}>
                {(["real", "mock"] as MasterDataGenerationMode[]).map((candidateMode) => (
                  <button
                    aria-pressed={mode === candidateMode}
                    className={mode === candidateMode ? "fv-btn-primary" : "fv-btn-secondary"}
                    key={candidateMode}
                    onClick={() => onModeChange(candidateMode)}
                    style={{ justifyContent: "flex-start", padding: "0.75rem 0.875rem", textAlign: "left" }}
                    type="button"
                  >
                    <span>
                      <strong style={{ display: "block" }}>
                        {candidateMode === "real" ? "Grounded real generation" : "Prototype drafts"}
                      </strong>
                      <span style={{ display: "block", fontSize: "0.74rem", fontWeight: 500, opacity: 0.82 }}>
                        {candidateMode === "real"
                          ? "Uses configured provider grounding where available."
                          : "Uses deterministic fixture drafts for offline review."}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {visibleFeedback ? (
            <div className="fv-callout fv-callout-warning">{visibleFeedback}</div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <section className="fv-card" aria-labelledby="phase2-analysis-plan-title">
            <p className="fv-field-label">What happens when I click Analyze?</p>
            <h2 className="fv-card-title" id="phase2-analysis-plan-title">Analysis plan</h2>
            <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.875rem" }}>
              {[
                {
                  label: "Input",
                  value: `${approvedCount} approved Phase 1 ${approvedCount === 1 ? "row" : "rows"}`,
                },
                {
                  label: "Scope",
                  value: selectedObjectTypeLabels.length > 0
                    ? selectedObjectTypeLabels.join(", ")
                    : "Select at least one object family",
                },
                {
                  label: "Output",
                  value: "Requirements analysis table before generation",
                },
              ].map((row) => (
                <div key={row.label} style={{ borderBottom: "1px solid var(--surface-border)", display: "flex", gap: "1rem", justifyContent: "space-between", paddingBottom: "0.55rem" }}>
                  <span style={{ color: "var(--muted-fg)", fontSize: "0.78rem" }}>{row.label}</span>
                  <strong style={{ color: "var(--foreground)", fontSize: "0.8rem", textAlign: "right" }}>{row.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="fv-card" aria-labelledby="phase2-blockers-title">
            <p className="fv-field-label">What blocks me?</p>
            <h2 className="fv-card-title" id="phase2-blockers-title">
              {isPhase2Locked ? "Phase 1 review required" : "Ready for analysis"}
            </h2>
            <p style={{ color: "var(--muted-fg)", fontSize: "0.82rem", lineHeight: 1.5, marginTop: "0.45rem" }}>
              {isPhase2Locked
                ? "Approve at least one Phase 1 requirement before running Master Data analysis."
                : "You can analyze the approved Phase 1 slice now. Requirement selection happens on the next screen."}
            </p>
            <button
              className="fv-btn-primary"
              disabled={isPhase2Locked || analyzing}
              onClick={onAnalyze}
              style={{ justifyContent: "center", marginTop: "1rem", padding: "0.75rem 1rem", width: "100%" }}
              type="button"
            >
              {analyzing ? "Analyzing…" : "Analyze Requirements →"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
