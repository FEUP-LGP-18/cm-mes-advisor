"use client";

import { DemoScriptExportPanel } from "@/app/demo-script-panel";
import type { DemoScriptAssembly } from "@/lib/requirements/demo-script";
import type { ReviewProjectMetadata } from "@/lib/requirements/review";

interface ExportStudioProps {
  approvedCount: number;
  assembly: DemoScriptAssembly;
  downloadedAt?: string | null;
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
  downloadedAt,
  exportReady,
  onGoToReview,
  onGoToScript,
  onOpenMasterData,
  pendingReviewCount,
  projectMetadata,
}: ExportStudioProps) {
  const canContinueToMasterData = exportReady && approvedCount > 0;

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <DemoScriptExportPanel
        assembly={assembly}
        downloadedAt={downloadedAt}
        exportReady={exportReady}
        onSwitchToReview={onGoToReview}
        onSwitchToScript={onGoToScript}
        pendingReviewCount={pendingReviewCount}
        projectMetadata={projectMetadata}
      />

      {canContinueToMasterData ? (
        <section
          className="fv-card"
          style={{ borderLeft: "3px solid var(--brand-primary)" }}
        >
          <div
            style={{
              alignItems: "flex-start",
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  color: "var(--muted-fg)",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  marginBottom: "0.25rem",
                  textTransform: "uppercase",
                }}
              >
                Optional Phase 2 continuation
              </div>
              <h3
                style={{
                  color: "var(--foreground)",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  margin: "0 0 0.375rem",
                }}
              >
                Generate Master Data draft
              </h3>
              <p
                style={{
                  color: "var(--muted-fg)",
                  fontSize: "0.8rem",
                  lineHeight: 1.6,
                  margin: 0,
                  maxWidth: "520px",
                }}
              >
                Phase 1 is complete once the Markdown handoff is exported.
                Continue only if you want the optional Master Data package for
                Phase 2.
              </p>
            </div>
            <button
              className="fv-btn-primary"
              onClick={onOpenMasterData}
              type="button"
            >
              Generate Master Data draft
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
