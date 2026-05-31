"use client";

import { useState, type ChangeEvent } from "react";
import type { ReviewRequirement } from "@/lib/requirements/review";
import type { RequirementsSourceMetadata } from "@/lib/requirements/source";
import { getIndustryTemplateDefinition } from "@/lib/settings";

interface SourceStudioProps {
  canContinue?: boolean;
  canUploadWorkbook?: boolean;
  currentSourceMetadata: RequirementsSourceMetadata;
  demoCount: number;
  mvpCount: number;
  onContinue: () => void;
  onRestoreFixtureSource: () => void;
  onUploadWorkbook: (file: File) => Promise<boolean>;
  requirements: ReviewRequirement[];
  sourceFeedback: {
    tone: "neutral" | "success" | "error";
    message: string;
  } | null;
  sourceRowCount: number;
}

export default function SourceStudio({
  canContinue = true,
  canUploadWorkbook = true,
  currentSourceMetadata,
  demoCount,
  mvpCount,
  onContinue,
  onRestoreFixtureSource,
  onUploadWorkbook,
  requirements,
  sourceFeedback,
  sourceRowCount,
}: SourceStudioProps) {
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(
    currentSourceMetadata.sourceKind !== "fixture",
  );

  const isFixture = currentSourceMetadata.sourceKind === "fixture";
  const previewRows = requirements.slice(0, 8);
  const industryTemplate = getIndustryTemplateDefinition(
    currentSourceMetadata.industryTemplateId,
  );

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!file) return;
    const uploaded = await onUploadWorkbook(file);
    if (uploaded) {
      setPreviewExpanded(true);
      setDetailsExpanded(true);
    }
  }

  return (
    <div className="fv-two-col-wide">
      {/* Left: upload card + preview */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {/* Upload card */}
        <div className={`fv-card ${isFixture ? "fv-card-left-warning" : "fv-card-left-success"}`}>
          <div className="fv-card-header">
            <div>
              <p className="fv-overline">
                {isFixture ? "Sample workbook active" : "Uploaded workbook active"}
              </p>
              <h2 className="fv-card-header-title">{currentSourceMetadata.sourceLabel}</h2>
            </div>
            <span className={`fv-source-badge ${isFixture ? "fv-source-badge-fixture" : "fv-source-badge-uploaded"}`}>
              {isFixture ? "Sample" : "Uploaded"}
            </span>
          </div>

          <p className="fv-body-muted">
            {isFixture
              ? "The sample workbook is active. Upload the project workbook when ready."
              : "The uploaded workbook is active and ready for generation."}
          </p>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
            <label
              className="fv-btn-primary"
              aria-disabled={!canUploadWorkbook ? "true" : undefined}
            >
              Upload .xlsx workbook
              <input
                accept=".xlsx"
                type="file"
                disabled={!canUploadWorkbook}
                onChange={handleUpload}
                className="fv-sr-only"
              />
            </label>

            {!isFixture ? (
              <button
                type="button"
                onClick={onRestoreFixtureSource}
                disabled={!canUploadWorkbook}
                className="fv-btn-secondary"
              >
                Restore sample
              </button>
            ) : null}
          </div>

          {!canUploadWorkbook ? (
            <div className="fv-callout" style={{ marginTop: "0.75rem" }}>
              Viewer access — cannot upload or replace files.
            </div>
          ) : null}

          {sourceFeedback ? (
            <div
              className={`fv-callout ${sourceFeedback.tone === "success" ? "fv-callout-success" : sourceFeedback.tone === "error" ? "fv-callout-error" : ""}`}
              role="status"
              aria-live="polite"
              style={{ marginTop: "0.75rem" }}
            >
              {sourceFeedback.message}
            </div>
          ) : null}
        </div>

        {/* Preview */}
        <div className="fv-card">
          <div className="fv-card-header">
            <div className="fv-card-title">Parsed Preview</div>
            <button
              type="button"
              onClick={() => setPreviewExpanded((c) => !c)}
              className="fv-btn-secondary fv-btn-sm"
              aria-expanded={previewExpanded}
            >
              {previewExpanded ? "Hide" : "Show"}
            </button>
          </div>
          <p className="fv-body-muted">
            First {previewRows.length} of {sourceRowCount} rows — check the file, counts, and row mix before continuing.
          </p>

          {previewExpanded && previewRows.length > 0 ? (
            <div className="fv-table-wrap" style={{ marginTop: "0.75rem", overflowX: "auto" }}>
              <table className="fv-table" style={{ minWidth: "560px" }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Row</th>
                    <th>Requirement</th>
                    <th>L2 Process</th>
                    <th>Demo</th>
                    <th>MVP</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((req) => (
                    <tr key={req.requirementKey}>
                      <td className="fv-mono-id">{req.requirementId || "—"}</td>
                      <td className="fv-mono-row">{req.sourceRowNumber}</td>
                      <td>{req.requirementDescription || "—"}</td>
                      <td className="fv-table-muted">{req.l2Process || "—"}</td>
                      <td>
                        {req.demo
                          ? <span className="fv-flag-yes">Yes</span>
                          : <span className="fv-flag-no">—</span>}
                      </td>
                      <td>
                        {req.mvp
                          ? <span className="fv-flag-yes">Yes</span>
                          : <span className="fv-flag-no">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : previewExpanded ? (
            <div className="fv-empty" style={{ padding: "1.5rem" }}>
              <div className="fv-empty-title">No rows to preview</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Right: stats + details + continue */}
      <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
        {/* Stats */}
        <div className="fv-card">
          <div className="fv-card-title">Source Summary</div>
          <dl style={{ margin: 0 }}>
            {[
              { label: "Total rows", value: sourceRowCount.toLocaleString() },
              { label: "Demo rows", value: demoCount.toLocaleString() },
              { label: "MVP rows", value: mvpCount.toLocaleString() },
              { label: "Template", value: industryTemplate?.label ?? "None" },
            ].map((row) => (
              <div key={row.label} className="fv-detail-kv">
                <dt className="fv-detail-kv-label">{row.label}</dt>
                <dd className="fv-detail-kv-value">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Workbook details */}
        <div className="fv-card">
          <button
            type="button"
            onClick={() => setDetailsExpanded((c) => !c)}
            className="fv-disclosure-btn"
            aria-expanded={detailsExpanded}
            style={{ marginBottom: detailsExpanded ? "0.75rem" : 0 }}
          >
            <span className="fv-card-title" style={{ margin: 0 }}>Workbook Details</span>
            <span className="fv-disclosure-label">{detailsExpanded ? "Hide" : "Show"}</span>
          </button>
          {detailsExpanded ? (
            <dl style={{ margin: 0 }}>
              {[
                { label: "Project", value: currentSourceMetadata.projectName },
                { label: "Customer", value: currentSourceMetadata.customerName },
                { label: "Industry template", value: industryTemplate?.label ?? "No template selected" },
                { label: "Source label", value: currentSourceMetadata.sourceLabel },
                { label: "Filename", value: currentSourceMetadata.sourceFilename },
              ].map((row) => (
                <div key={row.label} className="fv-detail-kv">
                  <dt className="fv-detail-kv-label">{row.label}</dt>
                  <dd className="fv-detail-kv-value" style={{ wordBreak: "break-all" }}>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {/* Checklist */}
        <div className="fv-card">
          <div className="fv-card-title">Before you continue</div>
          <ul className="fv-checklist">
            <li className="fv-checklist-item">Project and customer names match the expected workbook.</li>
            <li className="fv-checklist-item">Row counts feel plausible for the selected source.</li>
            <li className="fv-checklist-item">Demo and MVP flags match the slice you plan to generate.</li>
          </ul>
        </div>

        {/* Continue */}
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="fv-btn-primary"
          style={{ justifyContent: "center" }}
        >
          Continue to Generate →
        </button>
        <p className="fv-help-text" style={{ textAlign: "center" }}>
          Once the workbook, counts, and preview look right, continue to Generate.
        </p>
      </div>
    </div>
  );
}
