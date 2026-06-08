"use client";

import { useState } from "react";
import {
  masterDataObjectTypeLabels,
  masterDataObjectTypes,
  type MasterDataObjectType,
  type MasterDataPhase2State,
} from "@/lib/master-data/types";
import { ArrowDown, ArrowLeft, ArrowRight } from "@/components/icons";

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
    new Set(
      allObjects
        .flatMap((o) => o.warnings)
        .filter((w) => !w.includes("aggregates")),
    ),
  );

  const typeBreakdown = masterDataObjectTypes
    .filter((type) => phase2.generatedObjects[type].length > 0)
    .map((type) => {
      const arr = phase2.generatedObjects[type];
      return {
        type: type as MasterDataObjectType,
        count: arr.length,
        approved: arr.filter((o) => o.reviewStatus === "approved").length,
        needsReview: arr.filter((o) => o.reviewStatus === "review").length,
        pending: arr.filter((o) => o.reviewStatus === "pending").length,
      };
    });

  const canExport = pendingCount === 0 && modifiedCount === 0 && totalCount > 0;
  const approvedPct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

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
    const workbookName = phase2.exportSummary?.workbookFileName ?? "master-data.xlsx";
    const packageName = phase2.exportSummary?.packageFileName ?? "master-data-package.zip";

    return (
      <div>
        <div style={{ marginBottom: "1.25rem" }}>
          <h1 className="fv-page-title">Export Complete</h1>
          <p className="fv-page-subtitle">Master Data package downloaded successfully.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2.5rem 1rem", gap: "1rem" }}>
          <div className="fv-success-circle">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="7 18 15 26 29 11" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--foreground)", margin: 0, textAlign: "center" }}>
            Master Data package ready
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)", margin: 0, textAlign: "center", maxWidth: "420px", lineHeight: 1.6 }}>
            {approvedCount} objects exported across {typeBreakdown.length} object{typeBreakdown.length !== 1 ? " types" : " type"}. The workbook and manifest have been downloaded.
          </p>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.25rem" }}>
            <span className="fv-file-chip">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="3" y="1" width="10" height="14" rx="1.5" /><line x1="6" y1="5" x2="10" y2="5" /><line x1="6" y1="8" x2="10" y2="8" /><line x1="6" y1="11" x2="8" y2="11" />
              </svg>
              {workbookName}
            </span>
            <span className="fv-file-chip">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M3 2h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" /><polyline points="10 2 10 5 13 5" />
              </svg>
              {packageName}
            </span>
          </div>

          <div className="fv-callout fv-callout-info" style={{ maxWidth: "480px", marginTop: "0.75rem" }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }} aria-hidden="true">
              <circle cx="8" cy="8" r="6" /><line x1="8" y1="7" x2="8" y2="11" /><circle cx="8" cy="5" r="0.75" fill="currentColor" stroke="none" />
            </svg>
            Open Traceability to audit the full requirement-to-object link map before closing the session.
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
            <button type="button" onClick={onOpenTraceability} className="fv-btn-primary">
              View Traceability <ArrowRight />
            </button>
            <button type="button" onClick={() => void handleDownload()} className="fv-btn-secondary" disabled={downloading}>
              {downloading ? "Preparing…" : <><ArrowDown />Download Again</>}
            </button>
            <button type="button" onClick={onReturnToReview} className="fv-btn-secondary">
              <ArrowLeft />Back to Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 className="fv-page-title">Export Master Data</h1>
        <p className="fv-page-subtitle">
          {canExport
            ? `${approvedCount} objects approved and ready to download as a Master Data package.`
            : totalCount === 0
              ? "No objects generated yet. Return to the process step."
              : `${pendingCount + modifiedCount} object${pendingCount + modifiedCount !== 1 ? "s" : ""} still need review before export is available.`}
        </p>
      </div>

      {/* Stat cards */}
      <div className="fv-stats-row">
        <div className="fv-stat-card">
          <div className="fv-stat-label">Approved</div>
          <div className={`fv-stat-value ${approvedCount > 0 ? "fv-stat-value-green" : ""}`}>{approvedCount}</div>
          <div className="fv-stat-sub">{approvedPct}% of total</div>
          <div className="fv-stat-bar">
            <div className="fv-stat-bar-fill fv-stat-bar-fill-success" style={{ width: `${approvedPct}%` }} />
          </div>
        </div>
        <div className="fv-stat-card">
          <div className="fv-stat-label">Needs Review</div>
          <div className={`fv-stat-value ${modifiedCount > 0 ? "fv-stat-value-orange" : ""}`}>{modifiedCount}</div>
          <div className="fv-stat-sub">flagged objects</div>
        </div>
        <div className="fv-stat-card">
          <div className="fv-stat-label">Pending</div>
          <div className="fv-stat-value">{pendingCount}</div>
          <div className="fv-stat-sub">not yet reviewed</div>
        </div>
        <div className="fv-stat-card">
          <div className="fv-stat-label">Total</div>
          <div className="fv-stat-value fv-stat-value-blue">{totalCount}</div>
          <div className="fv-stat-sub">across {typeBreakdown.length} type{typeBreakdown.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Warnings — grouped */}
      {warnings.length > 0 ? (
        <div className="fv-callout fv-callout-warning" style={{ marginBottom: "1rem", display: "block", padding: "0.625rem 0.875rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }} aria-hidden="true">
              <circle cx="8" cy="8" r="6" /><line x1="8" y1="5" x2="8" y2="9" /><circle cx="8" cy="11.5" r="0.75" fill="currentColor" stroke="none" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>
              {warnings.length} issue{warnings.length !== 1 ? "s" : ""} to review before export
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.5rem", display: "grid", gap: "0.25rem" }}>
            {warnings.map((w) => (
              <li key={w} style={{ fontSize: "0.78rem", color: "var(--foreground)", lineHeight: 1.5 }}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="fv-two-col">
        {/* Left: Objects by Type table */}
        <div className="fv-card">
          <div className="fv-card-title">Objects by Type</div>
          {typeBreakdown.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", margin: 0 }}>No objects generated yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
                  <th style={{ textAlign: "left", padding: "0.375rem 0.5rem 0.375rem 0", color: "var(--muted-fg)", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Type
                  </th>
                  <th style={{ textAlign: "right", padding: "0.375rem 0.5rem", color: "var(--status-approved)", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Approved
                  </th>
                  <th style={{ textAlign: "right", padding: "0.375rem 0.5rem", color: "var(--status-flagged)", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Review
                  </th>
                  <th style={{ textAlign: "right", padding: "0.375rem 0.5rem", color: "var(--muted-fg)", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Pending
                  </th>
                  <th style={{ textAlign: "right", padding: "0.375rem 0 0.375rem 0.5rem", color: "var(--foreground)", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {typeBreakdown.map(({ type, count, approved, needsReview, pending }) => (
                  <tr key={type} style={{ borderBottom: "1px solid var(--surface-border)" }}>
                    <td style={{ padding: "0.4rem 0.5rem 0.4rem 0", color: "var(--foreground)", fontWeight: 500 }}>
                      {masterDataObjectTypeLabels[type]}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.4rem 0.5rem", color: approved > 0 ? "var(--status-approved)" : "var(--muted-fg)", fontWeight: 700 }}>
                      {approved}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.4rem 0.5rem", color: needsReview > 0 ? "var(--status-flagged)" : "var(--muted-fg)", fontWeight: 700 }}>
                      {needsReview}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.4rem 0.5rem", color: "var(--muted-fg)", fontWeight: 700 }}>
                      {pending}
                    </td>
                    <td style={{ textAlign: "right", padding: "0.4rem 0 0.4rem 0.5rem", color: "var(--foreground)", fontWeight: 700 }}>
                      {count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Package contents summary */}
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--surface-border)", display: "grid", gap: "0.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
              <span style={{ color: "var(--muted-fg)" }}>Traceability links</span>
              <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{phase2.traceability.length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
              <span style={{ color: "var(--muted-fg)" }}>Source requirements</span>
              <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{phase2.selectedRequirementKeys.length}</span>
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--muted-fg)", marginTop: "0.5rem", lineHeight: 1.5 }}>
              Export includes the generated workbook and a manifest file. The app does not auto-import into MES.
            </p>
          </div>
        </div>

        {/* Right: Export configuration + actions */}
        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          {!canExport ? (
            <div className="fv-callout fv-callout-warning">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }} aria-hidden="true">
                <circle cx="8" cy="8" r="6" /><line x1="8" y1="5" x2="8" y2="9" /><circle cx="8" cy="11.5" r="0.75" fill="currentColor" stroke="none" />
              </svg>
              <span>
                {totalCount === 0
                  ? "No objects to export. Return to the process step."
                  : `${pendingCount + modifiedCount} object${pendingCount + modifiedCount !== 1 ? "s" : ""} must be approved before export is available.`}
              </span>
            </div>
          ) : null}

          <div className="fv-card">
            <div className="fv-card-title">Export Configuration</div>
            <div style={{ display: "grid", gap: "0.375rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", padding: "0.3rem 0", borderBottom: "1px solid var(--surface-border)" }}>
                <span style={{ color: "var(--muted-fg)" }}>Format</span>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>Excel + JSON manifest</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", padding: "0.3rem 0", borderBottom: "1px solid var(--surface-border)" }}>
                <span style={{ color: "var(--muted-fg)" }}>Objects included</span>
                <span style={{ fontWeight: 700, color: canExport ? "var(--status-approved)" : "var(--muted-fg)" }}>
                  {approvedCount} approved
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", padding: "0.3rem 0" }}>
                <span style={{ color: "var(--muted-fg)" }}>Status</span>
                <span style={{ fontWeight: 600, color: canExport ? "var(--status-approved)" : "var(--status-flagged)" }}>
                  {canExport ? "Ready" : "Blocked"}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={!canExport || downloading}
                className="fv-btn-primary"
                style={{ justifyContent: "center" }}
              >
                {downloading ? "Preparing…" : <><ArrowDown />Download Master Data Package</>}
              </button>
              <p style={{ margin: 0, color: "var(--muted-fg)", fontSize: "0.75rem", lineHeight: 1.5, textAlign: "center" }}>
                Traceability unlocks after the package download completes.
              </p>
              <button
                type="button"
                onClick={onReturnToReview}
                className="fv-btn-secondary"
                style={{ justifyContent: "center" }}
              >
                <ArrowLeft />Back to Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
