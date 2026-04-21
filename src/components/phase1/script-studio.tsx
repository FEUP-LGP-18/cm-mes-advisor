"use client";

import DemoScriptEditingPanel from "@/app/demo-script-panel";
import type {
  DemoScriptAssembly,
  DemoScriptDraft,
  DemoScriptDraftAction,
} from "@/lib/requirements/demo-script";
import type { ReviewProjectMetadata } from "@/lib/requirements/review";

interface ScriptStudioProps {
  assembly: DemoScriptAssembly;
  draft: DemoScriptDraft;
  exportReady: boolean;
  onDraftAction: (action: DemoScriptDraftAction) => void;
  onGoToReview: () => void;
  onOpenExport: () => void;
  pendingReviewCount: number;
  projectMetadata: ReviewProjectMetadata;
}

export default function ScriptStudio({
  assembly,
  draft,
  exportReady,
  onDraftAction,
  onGoToReview,
  onOpenExport,
  pendingReviewCount,
  projectMetadata,
}: ScriptStudioProps) {
  return (
    <section className="grid gap-6">
      <section className="phase-section-card">
        <div className="phase-section-copy">
          <p className="phase-overline">Script</p>
          <h2 className="phase-section-title">Shape the Phase 1 handoff</h2>
          <p className="phase-section-body">
            Edit the approved narrative directly, keep the section outline and
            readiness close by, and move to export once the handoff reads the
            way you want.
          </p>
        </div>
      </section>

      <DemoScriptEditingPanel
        assembly={assembly}
        draft={draft}
        exportReady={exportReady}
        onDraftAction={onDraftAction}
        onSwitchToExport={onOpenExport}
        onSwitchToReview={onGoToReview}
        pendingReviewCount={pendingReviewCount}
        projectMetadata={projectMetadata}
      />
    </section>
  );
}
