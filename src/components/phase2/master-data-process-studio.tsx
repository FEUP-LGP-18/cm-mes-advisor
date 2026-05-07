"use client";

import { useEffect, useRef } from "react";
import type {
  MasterDataGenerationStatus,
  MasterDataPhase2State,
} from "@/lib/master-data/types";

export function shouldAutoStartMasterDataGeneration(
  status: MasterDataGenerationStatus,
) {
  return status === "idle";
}

export default function MasterDataProcessStudio({
  onGenerate,
  onOpenReview,
  onReturnToSetup,
  onUsePrototypeDrafts,
  phase2,
}: {
  onGenerate: () => Promise<boolean>;
  onOpenReview: () => void;
  onReturnToSetup: () => void;
  onUsePrototypeDrafts: () => void;
  phase2: MasterDataPhase2State;
}) {
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (
      hasTriggeredRef.current ||
      !shouldAutoStartMasterDataGeneration(phase2.generationStatus)
    ) {
      return;
    }

    hasTriggeredRef.current = true;
    void onGenerate();
  }, [onGenerate, phase2.generationStatus]);

  return (
    <section className="grid gap-6">
      <section className="phase-section-card">
        <div className="phase-section-copy">
          <p className="phase-overline">Processing</p>
          <h2 className="phase-section-title">
            Build the package before we ask for object-by-object approval.
          </h2>
          <p className="phase-section-body">
            This pass maps the reviewed requirement slice into the selected
            object schema, applies import-safe defaults, resolves references,
            and prepares the review package.
          </p>
        </div>

        <div className="phase-inline-metrics">
          <span>
            <strong>{phase2.selectedRequirementKeys.length}</strong> selected rows
          </span>
          <span>
            <strong>{phase2.selectedObjectTypes.length}</strong> object types
          </span>
          <span>
            <strong>{phase2.mode === "real" ? "Real" : "Draft"}</strong> mode
          </span>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <section className="phase-section-card">
          <div className="phase-toolbar">
            <div className="phase-toolbar-copy">
              <p className="phase-overline">Generation log</p>
              <h3 className="phase-section-title">Live process view</h3>
              <p className="phase-section-body">
                The process log keeps the current mapping/defaulting/validation
                steps visible so the handoff into review feels explainable.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {phase2.generationLogs.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  entry.status === "warning"
                    ? "tone-warning"
                    : entry.status === "complete"
                      ? "tone-positive"
                      : "tone-neutral"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="capitalize">{entry.stage}</strong>
                  <span className="mono-label text-[11px]">{entry.status}</span>
                </div>
                <p className="mt-2">{entry.message}</p>
              </div>
            ))}

            {phase2.generationLogs.length === 0 ? (
              <div className="rounded-2xl border px-4 py-3 text-sm tone-neutral">
                The process log will appear here once generation starts.
              </div>
            ) : null}
          </div>
        </section>

        <aside className="phase-rail">
          <section className="phase-rail-card grid gap-4">
            <div>
              <p className="phase-overline">Status</p>
              <h3 className="phase-rail-title">
                {phase2.generationStatus === "ready"
                  ? "Review package ready"
                  : phase2.generationStatus === "error"
                    ? "Generation needs attention"
                    : "Generating drafts"}
              </h3>
            </div>

            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                phase2.generationStatus === "error"
                  ? "tone-danger"
                  : phase2.generationStatus === "ready"
                    ? "tone-positive"
                    : "tone-neutral"
              }`}
            >
              {phase2.generationFeedback ??
                "The processing step is preparing the Master Data package."}
            </div>

            <div className="grid gap-3">
              {phase2.generationStatus === "error" &&
              phase2.mode === "real" ? (
                <button
                  type="button"
                  onClick={onUsePrototypeDrafts}
                  className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-semibold transition"
                >
                  Switch to prototype drafts
                </button>
              ) : null}
              {phase2.generationStatus === "error" ? (
                <button
                  type="button"
                  onClick={() => void onGenerate()}
                  className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
                >
                  Retry generation
                </button>
              ) : null}
              <button
                type="button"
                onClick={onOpenReview}
                disabled={phase2.generationStatus !== "ready"}
                className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Open review
              </button>
              <button
                type="button"
                onClick={onReturnToSetup}
                className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                Back to setup
              </button>
            </div>
          </section>
        </aside>
      </section>
    </section>
  );
}
