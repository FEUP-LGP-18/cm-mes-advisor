"use client";

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
  const objectCounts = Object.fromEntries(
    Object.entries(phase2.generatedObjects).map(([objectType, objects]) => [
      objectType,
      objects.length,
    ]),
  );
  const approvedCount = Object.values(phase2.generatedObjects)
    .flat()
    .filter((objectDraft) => objectDraft.reviewStatus === "approved").length;
  const needsReviewCount = Object.values(phase2.generatedObjects)
    .flat()
    .filter((objectDraft) => objectDraft.reviewStatus !== "approved").length;
  const warnings = Array.from(
    new Set(
      Object.values(phase2.generatedObjects).flatMap((objects) =>
        objects.flatMap((objectDraft) => objectDraft.warnings),
      ),
    ),
  );

  return (
    <section className="grid gap-6">
      <section className="phase-section-card">
        <div className="phase-section-copy">
          <p className="phase-overline">Phase 2 export</p>
          <h2 className="phase-section-title">
            Download the Master Data package once the review gate is clear.
          </h2>
          <p className="phase-section-body">
            Export stays review-gated, keeps direct MES import outside the app,
            and packages the generated workbook together with a manifest so the
            team can validate it safely.
          </p>
        </div>

        <div className="phase-inline-metrics">
          <span>
            <strong>{approvedCount}</strong> approved objects
          </span>
          <span>
            <strong>{needsReviewCount}</strong> still need approval
          </span>
          <span>
            <strong>{phase2.traceability.length}</strong> traceability links
          </span>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="phase-section-card">
          <div className="phase-toolbar">
            <div className="phase-toolbar-copy">
              <p className="phase-overline">Package contents</p>
              <h3 className="phase-section-title">Included object types</h3>
              <p className="phase-section-body">
                The export package is centered on the workbook structure from
                the provided Master Data sample and keeps a manifest next to it
                for traceability.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(objectCounts).map(([objectType, count]) => (
              <div
                key={objectType}
                className="theme-shell-card rounded-2xl px-4 py-4"
              >
                <strong className="block text-base">
                  {masterDataObjectTypeLabels[objectType as keyof typeof masterDataObjectTypeLabels]}
                </strong>
                <span className="mt-2 block text-sm text-[color:var(--shell-muted)]">
                  {count} object{count === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>

          {warnings.length > 0 ? (
            <div className="mt-6 grid gap-3">
              {warnings.map((warning) => (
                <div
                  key={warning}
                  className="rounded-2xl border px-4 py-3 text-sm tone-warning"
                >
                  {warning}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="phase-rail">
          <section className="phase-rail-card grid gap-4">
            <div>
              <p className="phase-overline">Final handoff</p>
              <h3 className="phase-rail-title">Download the package</h3>
            </div>

            <div className="rounded-2xl border px-4 py-3 text-sm tone-neutral">
              The export includes the generated workbook plus a manifest file.
              The app does not auto-import anything into MES.
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => void onDownload()}
                disabled={needsReviewCount > 0}
                className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download Master Data package
              </button>
              <button
                type="button"
                onClick={onOpenTraceability}
                className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                Open traceability
              </button>
              <button
                type="button"
                onClick={onReturnToReview}
                className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                Back to review
              </button>
            </div>
          </section>
        </aside>
      </section>
    </section>
  );
}
