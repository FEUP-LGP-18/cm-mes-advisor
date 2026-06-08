"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  MASTER_DATA_APPROVAL_REQUIRED_FEEDBACK,
  masterDataObjectTypeLabels,
  masterDataObjectTypes,
  type MasterDataApplicableRequirement,
  type MasterDataGenerationMode,
  type MasterDataObjectType,
} from "@/lib/master-data/types";
import { ArrowRight, Check } from "@/components/icons";

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
  onSelectRequirements,
  onDeselectRequirements,
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
  onSelectRequirements: (keys: string[]) => void;
  onDeselectRequirements: (keys: string[]) => void;
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [objectTypeFilter, setObjectTypeFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  async function handleAnalyze() {
    setAnalyzing(true);
    await onAnalyze();
    setAnalyzing(false);
  }

  const canProceed = selectedRequirementKeys.length > 0 && !isPhase2Locked;
  const filteredReqs = applicableRequirements.filter((r) => {
    const q = query.trim().toLowerCase();
    if (q && !r.requirementDescription.toLowerCase().includes(q) && !r.requirementId.toLowerCase().includes(q)) {
      return false;
    }
    if (objectTypeFilter !== "all" && !r.suggestedObjectTypes.includes(objectTypeFilter as MasterDataObjectType)) {
      return false;
    }
    if (confidenceFilter !== "all" && r.confidence.level !== confidenceFilter) {
      return false;
    }
    if (statusFilter !== "all") {
      const isSelected = selectedRequirementKeys.includes(r.requirementKey);
      if (statusFilter === "approved" && !r.preselected) return false;
      if (statusFilter === "selected" && (r.preselected || !isSelected)) return false;
      if (statusFilter === "pending" && isSelected) return false;
    }
    return true;
  });

  // Screen 1: Upload & Configure (no analysis yet)
  if (!hasAnalysis) {
    return <UploadConfigureScreen
      approvedCount={approvedCount}
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
    const toAdd = filteredReqs
      .filter((r) => !selectedRequirementKeys.includes(r.requirementKey))
      .map((r) => r.requirementKey);
    if (toAdd.length > 0) onSelectRequirements(toAdd);
  }

  function handleDeselectAll() {
    const toRemove = filteredReqs
      .filter((r) => selectedRequirementKeys.includes(r.requirementKey))
      .map((r) => r.requirementKey);
    if (toRemove.length > 0) onDeselectRequirements(toRemove);
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
          <FilterDropdown
            label="Object Type"
            value={objectTypeFilter}
            onChange={setObjectTypeFilter}
            options={[
              { value: "all", label: "Object Type" },
              ...masterDataObjectTypes.map((t) => ({ value: t, label: masterDataObjectTypeLabels[t] })),
            ]}
          />
          <FilterDropdown
            label="Confidence"
            value={confidenceFilter}
            onChange={setConfidenceFilter}
            options={[
              { value: "all", label: "Confidence" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
          />
          <FilterDropdown
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "Status" },
              { value: "approved", label: "Approved" },
              { value: "selected", label: "AI Selected" },
              { value: "pending", label: "Pending" },
            ]}
          />
          <div className="fv-table-toolbar-right">
            <button
              type="button"
              onClick={handleSelectAll}
              style={{ fontSize: "0.78rem", color: "var(--brand-primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: 0 }}
            >
              <Check />Select All
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
          <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-fg)" }}>
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
          Generate Master Data <ArrowRight />
        </button>
      </div>
    </div>
  );
}

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isActive = value !== "all";

  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelStyle({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((prev) => !prev);
  }

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? label;

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        className="fv-filter-btn"
        onClick={handleToggle}
        style={isActive ? { color: "var(--brand-primary)", borderColor: "var(--brand-primary)", background: "#eff6ff" } : undefined}
      >
        {selectedLabel}
        <span aria-hidden="true" style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRight: "1.5px solid currentColor",
          borderBottom: "1.5px solid currentColor",
          transform: "rotate(45deg)",
          marginTop: "-3px",
          flexShrink: 0,
        }} />
      </button>
      {open ? (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: panelStyle.top,
            left: panelStyle.left,
            zIndex: 1000,
            background: "var(--surface)",
            border: "1px solid var(--surface-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-card)",
            minWidth: "160px",
            overflow: "hidden",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "0.45rem 0.875rem", fontSize: "0.8rem",
                background: opt.value === value ? "#eff6ff" : "transparent",
                color: opt.value === value ? "var(--brand-primary)" : "var(--foreground)",
                border: "none", cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function UploadConfigureScreen({
  approvedCount,
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
  isPhase2Locked: boolean;
  hasGeneratedPhase1Drafts: boolean;
  mode: MasterDataGenerationMode;
  onModeChange: (m: MasterDataGenerationMode) => void;
  selectedObjectTypes: MasterDataObjectType[];
  onToggleObjectType: (t: MasterDataObjectType) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  analyzing: boolean;
  onAnalyze: () => void | Promise<void>;
  visibleFeedback: string | null;
  onOpenPhase1Generate: () => void;
  onOpenPhase1Review: () => void;
}) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const canAcceptUpload = !isPhase2Locked && !analyzing;

  async function handleUploadedFile(file?: File | null) {
    if (!file || !canAcceptUpload) {
      return;
    }

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setUploadError("Use an Excel .xlsx or .xls workbook.");
      return;
    }

    setUploadError(null);
    setSelectedFilename(file.name);
    await onAnalyze();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.item(0) ?? null;
    void handleUploadedFile(file);
    event.currentTarget.value = "";
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (!canAcceptUpload) {
      return;
    }

    setDragActive(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (!canAcceptUpload) {
      return;
    }

    event.dataTransfer.dropEffect = "copy";
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;

    if (
      !(nextTarget instanceof Node) ||
      !event.currentTarget.contains(nextTarget)
    ) {
      setDragActive(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (!canAcceptUpload) {
      return;
    }

    setDragActive(false);
    void handleUploadedFile(event.dataTransfer.files.item(0));
  }

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 className="fv-page-title">Upload Requirements File</h1>
        <p className="fv-page-subtitle">
          Upload the customer&apos;s Excel requirements to begin AI-driven Master Data generation.
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
              {hasGeneratedPhase1Drafts ? <>Open Phase 1 review <ArrowRight /></> : <>Generate Phase 1 drafts <ArrowRight /></>}
            </button>
          </div>
        </div>
      ) : null}

      <div className="fv-two-col-wide">
        {/* Left: dropzone + config */}
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {/* Dropzone */}
          <div
            aria-disabled={!canAcceptUpload}
            className={`fv-dropzone${dragActive ? " fv-dropzone-active" : ""}${uploadError ? " fv-dropzone-error" : ""}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <svg className="fv-dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div className="fv-dropzone-title">Drag & drop your .xlsx file here</div>
            <div className="fv-dropzone-sub">Supports Excel workbooks from MES requirements templates</div>
            <label htmlFor={fileInputId} className="fv-sr-only">
              Phase 2 requirements workbook
            </label>
            <input
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="fv-sr-only"
              disabled={!canAcceptUpload}
              id={fileInputId}
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
            <button
              className="fv-btn-secondary fv-file-input-trigger"
              disabled={!canAcceptUpload}
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: "0.8rem" }}
              type="button"
            >
              Browse files
            </button>
            {selectedFilename ? (
              <div className="fv-dropzone-meta">
                Selected {selectedFilename}; starting analysis…
              </div>
            ) : null}
            {uploadError ? (
              <div className="fv-dropzone-meta" role="alert">
                {uploadError}
              </div>
            ) : null}
          </div>

          {/* File ready bar — same width as dropzone, matches Screen 7 mockup */}
          {approvedCount > 0 ? (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.5rem 0.875rem",
              borderRadius: "var(--radius-md)",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "var(--status-approved)",
            }}>
              <span>Phase 1 requirements loaded · {approvedCount} approved rows</span>
              <span style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><Check />Ready</span>
            </div>
          ) : null}

          {/* Config fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
            <div>
              <label className="fv-field-label">Industry Template</label>
              <select className="fv-select">
                <option>Electronics / Semiconductors</option>
                <option>Automotive</option>
                <option>Medical Devices</option>
                <option>Food &amp; Beverage</option>
                <option>Aerospace &amp; Defence</option>
                <option>Generic / Custom</option>
              </select>
            </div>
            <div>
              <label className="fv-field-label">MES Version</label>
              <input className="fv-input" value="10.3.2" readOnly style={{ background: "var(--surface-muted)", color: "var(--muted-fg)" }} />
            </div>
          </div>

          {/* Generation mode (formerly advanced) */}
          <div style={{ border: "1px solid var(--surface-border)", borderRadius: "8px", overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "0.75rem 1rem", background: "var(--surface-muted)",
                border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
                color: "var(--foreground)",
              }}
            >
              Advanced Settings
              <span aria-hidden="true" style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRight: "1.5px solid var(--muted-fg)",
                borderBottom: "1.5px solid var(--muted-fg)",
                transform: showAdvanced ? "rotate(225deg)" : "rotate(45deg)",
                transition: "transform 160ms ease",
                marginTop: showAdvanced ? "3px" : "-3px",
              }} />
            </button>
            {showAdvanced ? (
              <div style={{ padding: "0.75rem 1rem", display: "grid", gap: "0.25rem" }}>
                <div className="fv-toggle-row">
                  <span className="fv-toggle-label">Include data collection points</span>
                  <label className="fv-toggle">
                    <input type="checkbox" defaultChecked onChange={() => onToggleObjectType("area")} />
                    <div className="fv-toggle-track" />
                  </label>
                </div>
                <div className="fv-toggle-row">
                  <span className="fv-toggle-label">Generate alert rules</span>
                  <label className="fv-toggle">
                    <input type="checkbox" />
                    <div className="fv-toggle-track" />
                  </label>
                </div>
                <div className="fv-toggle-row">
                  <span className="fv-toggle-label">Include routing logic</span>
                  <label className="fv-toggle">
                    <input type="checkbox" defaultChecked />
                    <div className="fv-toggle-track" />
                  </label>
                </div>
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--surface-border)" }}>
                  <div className="fv-field-label" style={{ marginBottom: "0.625rem" }}>Generation Mode</div>
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {(["real", "mock"] as MasterDataGenerationMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => onModeChange(m)}
                        style={{
                          padding: "0.625rem 0.875rem", borderRadius: "6px", textAlign: "left",
                          border: `1px solid ${mode === m ? "var(--brand-primary)" : "var(--surface-border)"}`,
                          background: mode === m ? "#eff6ff" : "#fff",
                          cursor: "pointer", fontSize: "0.8rem",
                        }}
                      >
                        <strong style={{ display: "block", color: "var(--foreground)" }}>
                          {m === "real" ? "Grounded real generation" : "Prototype drafts"}
                        </strong>
                        <span style={{ color: "var(--muted-fg)", fontSize: "0.72rem" }}>
                          {m === "real"
                            ? "Uses MCP + Bedrock grounded in MES documentation"
                            : "Deterministic defaults — works offline"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--surface-border)" }}>
                  <div className="fv-field-label" style={{ marginBottom: "0.625rem" }}>Object Scope</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {masterDataObjectTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onToggleObjectType(t)}
                        style={{
                          padding: "0.25rem 0.625rem", borderRadius: "9999px", fontSize: "0.72rem", fontWeight: 600,
                          border: `1px solid ${selectedObjectTypes.includes(t) ? "var(--brand-primary)" : "var(--surface-border)"}`,
                          background: selectedObjectTypes.includes(t) ? "#eff6ff" : "#fff",
                          color: selectedObjectTypes.includes(t) ? "var(--brand-primary)" : "var(--muted-fg)",
                          cursor: "pointer",
                        }}
                      >
                        {masterDataObjectTypeLabels[t]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {visibleFeedback ? (
            <div className="fv-callout fv-callout-warning">{visibleFeedback}</div>
          ) : null}
        </div>

        {/* Right: template coverage + file preview + analyze button */}
        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          {/* Template Coverage */}
          <div className="fv-card">
            <div className="fv-card-title">Template Coverage</div>
            {[
              { label: "Materials", included: true },
              { label: "Resources", included: true },
              { label: "Operations", included: true },
              { label: "Data Coll.", included: true },
              { label: "Routing", included: false },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 0", borderBottom: "1px solid var(--surface-border)", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--foreground)" }}>{item.label}</span>
                {item.included ? (
                  <span style={{ color: "var(--status-approved)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><Check />included</span>
                ) : (
                  <span style={{ color: "var(--muted-fg)" }}>optional</span>
                )}
              </div>
            ))}
          </div>

          {/* File Preview */}
          <div className="fv-card">
            <div className="fv-card-title">File Preview</div>
            {[
              { label: "Total rows", value: approvedCount > 0 ? String(approvedCount) : "—" },
              { label: "Mapped columns", value: approvedCount > 0 ? "8 / 12" : "—" },
              { label: "Est. objects", value: approvedCount > 0 ? `~${Math.round(approvedCount * 0.65)}` : "—" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 0", borderBottom: "1px solid var(--surface-border)", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--muted-fg)" }}>{row.label}</span>
                <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{row.value}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onAnalyze}
            disabled={isPhase2Locked || analyzing}
            className="fv-btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "0.75rem 1rem" }}
          >
            {analyzing ? "Analyzing…" : <>Analyze Requirements <ArrowRight /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
