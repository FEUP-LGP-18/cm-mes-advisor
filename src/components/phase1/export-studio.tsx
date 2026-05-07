"use client";

import { DemoScriptExportPanel } from "@/app/demo-script-panel";
import type { DemoScriptAssembly } from "@/lib/requirements/demo-script";
import type { ReviewProjectMetadata } from "@/lib/requirements/review";

interface ExportStudioProps {
  assembly: DemoScriptAssembly;
  exportReady: boolean;
  onGoToReview: () => void;
  onGoToScript: () => void;
  onOpenMasterData: () => void;
  pendingReviewCount: number;
  projectMetadata: ReviewProjectMetadata;
}

export default function ExportStudio({
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
            <p className="phase-overline">Optional continuation</p>
            <h3 className="phase-section-title">
              Continue into Master Data generation when Phase 1 is complete.
            </h3>
            <p className="phase-section-body">
              Phase 1 remains a valid finish line on its own. Move into Phase 2
              only when the team wants a reviewable MES Master Data package for
              the selected demo scope.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenMasterData}
            className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
          >
            Generate Master Data
          </button>
        </div>
      </section>
    </section>
  );
}
