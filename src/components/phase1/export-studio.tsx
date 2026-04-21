"use client";

import { DemoScriptExportPanel } from "@/app/demo-script-panel";
import type { DemoScriptAssembly } from "@/lib/requirements/demo-script";
import type { ReviewProjectMetadata } from "@/lib/requirements/review";

interface ExportStudioProps {
  assembly: DemoScriptAssembly;
  exportReady: boolean;
  onGoToReview: () => void;
  onGoToScript: () => void;
  pendingReviewCount: number;
  projectMetadata: ReviewProjectMetadata;
}

export default function ExportStudio({
  assembly,
  exportReady,
  onGoToReview,
  onGoToScript,
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
    </section>
  );
}
