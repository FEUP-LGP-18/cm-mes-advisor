"use client";

import { useState } from "react";
import { masterDataObjectTypeLabels, type MasterDataPhase2State } from "@/lib/master-data/types";

export default function MasterDataExportStudio({
  onDownload,
  onOpenTraceability,
  onReturnToReview,
  phase2,
}: {
  onDownload: () => Promise<void>;
  onOpenTraceability: () => void;
  onReturnToReview: () => void;
  phase2: MasterDataPhase2State;
}) {
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const allObjects = Object.values(phase2.generatedObjects).flat();
  const approvedCount = allObjects.filter((o) => o.reviewStatus === "approved").length;
  const modifiedCount = allObjects.filter((o) => o.reviewStatus === "review").length;
  const pendingCount = allObjects.filter((o) => o.reviewStatus === "pending").length;
  const totalCount = allObjects.length;
  const warnings = Array.from(
    new Set(allObjects.flatMap((o) => o.warnings)),
  );

  const typeBreakdown = Object.entries(phase2.generatedObjects)
    .filter(([, arr]) => arr.length > 0)
    .map(([type, arr]) => ({ type, count: arr.length }));

  const canExport = pendingCount === 0 && modifiedCount === 0;

  async function handleDownload() {
    setDownloading(true);
    try {
      await onDownload();
      setDownloaded(true);
    } finally {
      setDownloading(false);
    }
  }

  if (downloaded) {
    return (
      <div>
        <div style={{ marginBottom: "1.25rem" }}>
          <h1 className="fv-page-title">Export Complete</h1>
          <p className="fv-page-subtitle">Master Data package downloaded successfully.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 1rem", gap: "1rem" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "var(--status-approved-bg)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--status-approved)" strokeWidth="2.5" aria-hidden="true">
              <polyline points="6 16 13 23 26 10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--foreground)", margin: 0, textAlign: "center" }}>
            Master Data package ready
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)", margin: 0, textAlign: "center", maxWidth: "400px", lineHeight: 1.6 }}>
            {approvedCount} objects exported across {typeBreakdown.length} object types. The workbook and manifest have been downloaded.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="button" onClick={onOpenTraceability} className="fv-btn-secondary">
              View Traceability
            </button>
            <button type="button" onClick={() => setDownloaded(false)} className="fv-btn-secondary">
              ← Back to Export
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 className="fv-page-title">Export Master Data</h1>
        <p className="fv-page-subtitle">
          {canExport
            ? `${approvedCount} objects approved and ready to download as a Master Data package.`
            : `${pendingCount + modifiedCount} objects still need review before export is available.`}
        </p>
      </div>

      {/* Blocked callout */}
      {!canExport ? (
        <div className="fv-callout fv-callout-warning" style={{ marginBottom: "1rem" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }} aria-hidden="true">
            <circle cx="8" cy="8" r="6" /><line x1="8" y1="5" x2="8" y2="9" /><circle cx="8" cy="11.5" r="0.75" fill="currentColor" stroke="none" />
          </svg>
          All objects must be approved before export. Return to review to approve pending items.
        </div>
      ) : null}

      {/* Warnings */}
      {warnings.length > 0 ? (
        <div style={{ marginBottom: "1rem", display: "grid", gap: "0.375rem" }}>
          {warnings.map((w) => (
            <div key={w} className="fv-callout fv-callout-warning" style={{ fontSize: "0.8rem" }}>
              ⚠ {w}
            </div>
          ))}
        </div>
      ) : null}

      <div className="fv-two-col">
        {/* Left: summary */}
        <div style={{ display: "grid", gap: "1rem" }}>
          {/* Review summary */}
          <div className="fv-card">
            <div className="fv-card-title">Review Summary</div>
            {[
              { label: "Approved", value: approvedCount, color: "var(--status-approved)" },
              { label: "Needs Review", value: modifiedCount, color: "var(--status-flagged)" },
              { label: "Pending", value: pendingCount, color: "var(--muted-fg)" },
              { label: "Total", value: totalCount, color: "var(--foreground)" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.3rem 0", borderBottom: "1px solid var(--surface-border)" }}>
                <span style={{ color: "var(--muted-fg)" }}>{row.label}</span>
                <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* By type */}
          {typeBreakdown.length > 0 ? (
            <div className="fv-card">
              <div className="fv-card-title">By Object Type</div>
              {typeBreakdown.map(({ type, count }) => (
                <div key={type} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.3rem 0", borderBottom: "1px solid var(--surface-border)" }}>
                  <span style={{ color: "var(--muted-fg)", textTransform: "capitalize" }}>
                    {masterDataObjectTypeLabels[type as keyof typeof masterDataObjectTypeLabels] ?? type}
                  </span>
                  <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{count}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Traceability */}
          <div className="fv-card">
            <div className="fv-card-title">Package Contents</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted-fg)", lineHeight: 1.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--surface-border)" }}>
                <span>Traceability links</span>
                <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{phase2.traceability.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span>Source requirements</span>
                <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{phase2.selectedRequirementKeys.length}</span>
              </div>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--muted-fg)", marginTop: "0.625rem", lineHeight: 1.5 }}>
              Export includes the generated workbook + a manifest file. The app does not auto-import into MES.
            </p>
          </div>
        </div>

        {/* Right: actions */}
        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <div className="fv-card">
            <div className="fv-card-title">Download Package</div>
            <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", marginBottom: "1rem", lineHeight: 1.6 }}>
              Downloads the Master Data workbook and a traceability manifest as a zip package.
            </p>

            <div style={{ display: "grid", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={!canExport || downloading}
                className="fv-btn-primary"
                style={{
                  justifyContent: "center",
                  opacity: canExport && !downloading ? 1 : 0.5,
                  cursor: canExport && !downloading ? "pointer" : "not-allowed",
                }}
              >
                {downloading ? "Preparing…" : "↓ Download Master Data Package"}
              </button>
              <button
                type="button"
                onClick={onOpenTraceability}
                className="fv-btn-secondary"
                style={{ justifyContent: "center" }}
              >
                View Traceability
              </button>
              <button
                type="button"
                onClick={onReturnToReview}
                className="fv-btn-secondary"
                style={{ justifyContent: "center" }}
              >
                ← Back to Review
              </button>
            </div>
          </div>

          {!canExport ? (
            <div className="fv-card" style={{ borderLeft: "3px solid var(--status-flagged)" }}>
              <div className="fv-card-title" style={{ color: "var(--status-flagged)" }}>Export Blocked</div>
              <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", lineHeight: 1.5, margin: 0 }}>
                {modifiedCount > 0 ? `${modifiedCount} object${modifiedCount > 1 ? "s" : ""} flagged for review. ` : ""}
                {pendingCount > 0 ? `${pendingCount} object${pendingCount > 1 ? "s" : ""} still pending. ` : ""}
                Approve all items in the review step to unlock export.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
