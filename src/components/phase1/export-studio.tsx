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
    <section className="grid gap-6">
      <section className="phase-section-card">
        <div className="phase-section-copy">
          <p className="phase-overline">Export</p>
          <h2 className="phase-section-title">Download the Phase 1 handoff</h2>
          <p className="phase-section-body">
            Confirm the included coverage, keep the final download action close
            to the readiness summary, and export the reviewed Markdown handoff
            when it is ready.
          </p>
        </div>
      </section>

      <DemoScriptExportPanel
        assembly={assembly}
        exportReady={exportReady}
        onSwitchToReview={onGoToReview}
        onSwitchToScript={onGoToScript}
        pendingReviewCount={pendingReviewCount}
        projectMetadata={projectMetadata}
      />

      <section className="phase-section-card">
        <div className="phase-toolbar">
          <div className="phase-toolbar-copy">
            <p className="phase-overline">Required pilot demo</p>
            <h3 className="phase-section-title">
              Start Phase 2 from approved Phase 1 rows.
            </h3>
            <p className="phase-section-body">
              The pilot demo requires the Master Data path after the Phase 1
              handoff: approved rows, setup, generation, review, export, and
              traceability. The app still does not claim MES import validation.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenMasterData}
            disabled={!exportReady || approvedCount === 0}
            className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Phase 2 demo
          </button>
        </div>
      </section>
    </section>
  );
}
