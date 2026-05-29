"use client";

import { DemoScriptExportPanel } from "@/app/demo-script-panel";
import type { DemoScriptAssembly } from "@/lib/requirements/demo-script";
import type { ReviewProjectMetadata } from "@/lib/requirements/review";

interface ExportStudioProps {
  approvedCount: number;
  assembly: DemoScriptAssembly;
  exportReady: boolean;
  onGoToReview: () => void;
  onGoToScript: () => void;
  onOpenMasterData: () => void;
  pendingReviewCount: number;
  projectMetadata: ReviewProjectMetadata;
}

export default function ExportStudio({
  approvedCount,
  assembly,
  exportReady,
  onGoToReview,
  onGoToScript,
  onOpenMasterData,
  pendingReviewCount,
  projectMetadata,
}: ExportStudioProps) {
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <DemoScriptExportPanel
        assembly={assembly}
        exportReady={exportReady}
        onSwitchToReview={onGoToReview}
        onSwitchToScript={onGoToScript}
        pendingReviewCount={pendingReviewCount}
        projectMetadata={projectMetadata}
      />

      <div className="fv-card" style={{ borderLeft: "3px solid var(--brand-primary)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.25rem" }}>
              Required Pilot Demo
            </div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--foreground)", margin: "0 0 0.375rem" }}>
              Start Phase 2 from approved Phase 1 rows
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", margin: 0, lineHeight: 1.6, maxWidth: "520px" }}>
              The pilot demo requires the Master Data path after the Phase 1 handoff: approved rows, setup, generation, review, export, and traceability.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenMasterData}
            disabled={!exportReady || approvedCount === 0}
            className="fv-btn-primary"
            style={{
              opacity: exportReady && approvedCount > 0 ? 1 : 0.5,
              cursor: exportReady && approvedCount > 0 ? "pointer" : "not-allowed",
            }}
          >
            Start Phase 2 →
          </button>
        </div>
      </div>
    </div>
  );
}
