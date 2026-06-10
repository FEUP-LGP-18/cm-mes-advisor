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
  exportReady?: boolean;
  onDraftAction: (action: DemoScriptDraftAction) => void;
  onGoToReview: () => void;
  onOpenExport?: () => void;
  pendingReviewCount: number;
  projectMetadata: ReviewProjectMetadata;
}

export default function ScriptStudio({
  assembly,
  draft,
  exportReady = false,
  onDraftAction,
  onGoToReview,
  onOpenExport,
  pendingReviewCount,
  projectMetadata,
}: ScriptStudioProps) {
  return (
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
  );
}
