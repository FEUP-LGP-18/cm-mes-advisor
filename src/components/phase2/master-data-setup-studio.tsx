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
  hasAnalysisRun,
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
    feedback === MASTER_DATA_APPROVAL_REQUIRED_FEEDBACK ? null : feedback;

  const [analyzing, setAnalyzing] = useState(false);
  const [query, setQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      await onAnalyze();
    } finally {
      setAnalyzing(false);
    }
  }

  const canProceed = selectedRequirementKeys.length > 0 && !isPhase2Locked;
  const filteredReqs = applicableRequirements.filter((r) =>
    !query.trim() ||
    r.requirementDescription.toLowerCase().includes(query.toLowerCase()) ||
    r.requirementId.toLowerCase().includes(query.toLowerCase()),
  );

  // Screen 1: configure approved Phase 1 scope before analysis.
  if (!hasAnalysis) {
    return <UploadConfigureScreen
      approvedCount={approvedCount}
      hasAnalysisRun={hasAnalysisRun}
      isPhase2Locked={isPhase2Locked}
      hasGeneratedPhase1Drafts={hasGeneratedPhase1Drafts}
      mode={mode}
      onModeChange={onModeChange}
      selectedObjectTypes={selectedObjectTypes}
      onToggleObjectType={onToggleObjectType}
      showAdvanced={showAdvanced}
      setShowAdvanced={setShowAdvanced}
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
          AI mapped {applicableCount} of {approvedCount} requirements to MES objects.
          Review and confirm the selection before generation.
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

        <div
          aria-label="Requirements to MES object mapping table"
          className="fv-table-wrap-scroll"
          role="region"
          tabIndex={0}
        >
          <div style={{ minWidth: "760px" }}>
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
        </div>
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

function UploadConfigureScreen({
  approvedCount,
  hasAnalysisRun,
  isPhase2Locked,
  hasGeneratedPhase1Drafts,
  mode,
  onModeChange,
  selectedObjectTypes,
  onToggleObjectType,
  showAdvanced,
  setShowAdvanced,
  analyzing,
  onAnalyze,
  visibleFeedback,
  onOpenPhase1Generate,
  onOpenPhase1Review,
}: {
  approvedCount: number;
  hasAnalysisRun: boolean;
  isPhase2Locked: boolean;
  hasGeneratedPhase1Drafts: boolean;
  mode: MasterDataGenerationMode;
  onModeChange: (m: MasterDataGenerationMode) => void;
  selectedObjectTypes: MasterDataObjectType[];
  onToggleObjectType: (t: MasterDataObjectType) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  analyzing: boolean;
  onAnalyze: () => void;
  visibleFeedback: string | null;
  onOpenPhase1Generate: () => void;
  onOpenPhase1Review: () => void;
}) {
  const selectedObjectTypeLabels = selectedObjectTypes.map(
    (type) => masterDataObjectTypeLabels[type],
  );

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 className="fv-page-title">Configure Master Data Scope</h1>
        <p className="fv-page-subtitle">
          Use the approved Phase 1 rows as the source for optional Master Data analysis.
          No second requirements upload is needed.
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
        {/* Left: source basis + analysis settings */}
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <section
            aria-labelledby="phase2-source-basis-title"
            className={`fv-card ${isPhase2Locked ? "fv-card-left-warning" : "fv-card-left-success"}`}
          >
            <p className="fv-field-label">Source basis</p>
            <h2 className="fv-card-title" id="phase2-source-basis-title">
              {isPhase2Locked ? "Phase 1 review required" : "Phase 1 approved slice"}
            </h2>
            <p style={{ color: "var(--muted-fg)", fontSize: "0.82rem", lineHeight: 1.5, marginTop: "0.45rem" }}>
              {isPhase2Locked
                ? "Approve at least one generated Phase 1 row before configuring optional Master Data."
                : "Master Data setup will analyze only the requirements that consultants approved in Phase 1."}
            </p>

            <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.875rem" }}>
              {[
                {
                  label: "Approved rows",
                  value: approvedCount > 0 ? `${approvedCount}` : "None yet",
                },
                {
                  label: "Source",
                  value: "Phase 1 review decisions",
                },
                {
                  label: "Analysis state",
                  value: isPhase2Locked
                    ? "Waiting for approval"
                    : hasAnalysisRun
                      ? "No candidates found"
                      : "Not analyzed",
                },
              ].map((row) => (
                <div key={row.label} style={{ borderBottom: "1px solid var(--surface-border)", display: "flex", gap: "1rem", justifyContent: "space-between", paddingBottom: "0.55rem" }}>
                  <span style={{ color: "var(--muted-fg)", fontSize: "0.78rem" }}>{row.label}</span>
                  <strong style={{ color: "var(--foreground)", fontSize: "0.8rem", textAlign: "right" }}>{row.value}</strong>
                </div>
              ))}
            </div>
          </section>

          {!isPhase2Locked ? (
            <section className="fv-card" aria-labelledby="phase2-settings-title">
              <button
                aria-expanded={showAdvanced}
                aria-controls="phase2-analysis-settings"
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  alignItems: "center",
                  background: "transparent",
                  border: "none",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  display: "flex",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  justifyContent: "space-between",
                  padding: 0,
                  width: "100%",
                }}
              >
                <span id="phase2-settings-title">Analysis settings</span>
                <span aria-hidden="true" style={{ color: "var(--muted-fg)", transform: showAdvanced ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }}>
                  ˅
                </span>
              </button>

              {showAdvanced ? (
                <div id="phase2-analysis-settings" style={{ display: "grid", gap: "1rem", marginTop: "0.875rem" }}>
                  <div>
                    <div className="fv-field-label" style={{ marginBottom: "0.625rem" }}>Generation mode</div>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {(["real", "mock"] as MasterDataGenerationMode[]).map((candidateMode) => (
                        <button
                          aria-pressed={mode === candidateMode}
                          key={candidateMode}
                          type="button"
                          onClick={() => onModeChange(candidateMode)}
                          style={{
                            background: mode === candidateMode ? "#eff6ff" : "#fff",
                            border: `1px solid ${mode === candidateMode ? "var(--brand-primary)" : "var(--surface-border)"}`,
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            padding: "0.625rem 0.875rem",
                            textAlign: "left",
                          }}
                        >
                          <strong style={{ color: "var(--foreground)", display: "block" }}>
                            {candidateMode === "real" ? "Grounded real generation" : "Prototype drafts"}
                          </strong>
                          <span style={{ color: "var(--muted-fg)", fontSize: "0.72rem" }}>
                            {candidateMode === "real"
                              ? "Uses configured provider grounding where available."
                              : "Uses deterministic fixture drafts for offline review."}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="fv-field-label" style={{ marginBottom: "0.625rem" }}>Object scope</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {masterDataObjectTypes.map((type) => (
                        <button
                          aria-pressed={selectedObjectTypes.includes(type)}
                          key={type}
                          type="button"
                          onClick={() => onToggleObjectType(type)}
                          style={{
                            background: selectedObjectTypes.includes(type) ? "#eff6ff" : "#fff",
                            border: `1px solid ${selectedObjectTypes.includes(type) ? "var(--brand-primary)" : "var(--surface-border)"}`,
                            borderRadius: "9999px",
                            color: selectedObjectTypes.includes(type) ? "var(--brand-primary)" : "var(--muted-fg)",
                            cursor: "pointer",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            padding: "0.25rem 0.625rem",
                          }}
                        >
                          {masterDataObjectTypeLabels[type]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {visibleFeedback ? (
            <div className="fv-callout fv-callout-warning">{visibleFeedback}</div>
          ) : null}
        </div>

        {/* Right: analysis plan + blocker state */}
        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <section className="fv-card" aria-labelledby="phase2-analysis-plan-title">
            <p className="fv-field-label">What happens when I click Analyze?</p>
            <h2 className="fv-card-title" id="phase2-analysis-plan-title">Analysis plan</h2>
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
              <div key={row.label} style={{ borderBottom: "1px solid var(--surface-border)", display: "flex", gap: "1rem", justifyContent: "space-between", paddingBottom: "0.55rem", paddingTop: "0.55rem" }}>
                <span style={{ color: "var(--muted-fg)", fontSize: "0.78rem" }}>{row.label}</span>
                <strong style={{ color: "var(--foreground)", fontSize: "0.8rem", textAlign: "right" }}>{row.value}</strong>
              </div>
            ))}
          </section>

          <section className="fv-card" aria-labelledby="phase2-readiness-title">
            <p className="fv-field-label">What blocks me?</p>
            <h2 className="fv-card-title" id="phase2-readiness-title">
              {isPhase2Locked ? "Phase 1 review required" : "Ready for analysis"}
            </h2>
            <p style={{ color: "var(--muted-fg)", fontSize: "0.82rem", lineHeight: 1.5, marginTop: "0.45rem" }}>
              {isPhase2Locked
                ? "Approve at least one Phase 1 requirement before running Master Data analysis."
                : "You can analyze the approved Phase 1 slice now. Requirement selection happens on the next screen."}
            </p>

            <button
              type="button"
              onClick={onAnalyze}
              disabled={isPhase2Locked || analyzing}
              className="fv-btn-primary"
              style={{ justifyContent: "center", marginTop: "1rem", padding: "0.75rem 1rem", width: "100%" }}
            >
              {analyzing ? "Analyzing…" : "Analyze Requirements →"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
