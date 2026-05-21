"use client";

import {
  MASTER_DATA_APPROVAL_REQUIRED_FEEDBACK,
  masterDataObjectTypeLabels,
  masterDataObjectTypes,
  type MasterDataApplicableRequirement,
  type MasterDataGenerationMode,
  type MasterDataObjectType,
} from "@/lib/master-data/types";

export default function MasterDataSetupStudio({
  applicableRequirements,
  approvedCount,
  feedback,
  hasAnalysisRun,
  hasGeneratedPhase1Drafts,
  mode,
  onAnalyze,
  onContinueToProcess,
  onModeChange,
  onOpenPhase1Generate,
  onOpenPhase1Review,
  onToggleObjectType,
  onToggleRequirement,
  selectedObjectTypes,
  selectedRequirementKeys,
}: {
  applicableRequirements: MasterDataApplicableRequirement[];
  approvedCount: number;
  feedback: string | null;
  hasAnalysisRun: boolean;
  hasGeneratedPhase1Drafts: boolean;
  mode: MasterDataGenerationMode;
  onAnalyze: () => Promise<boolean>;
  onContinueToProcess: () => void;
  onModeChange: (mode: MasterDataGenerationMode) => void;
  onOpenPhase1Generate: () => void;
  onOpenPhase1Review: () => void;
  onToggleObjectType: (objectType: MasterDataObjectType) => void;
  onToggleRequirement: (requirementKey: string) => void;
  selectedObjectTypes: MasterDataObjectType[];
  selectedRequirementKeys: string[];
}) {
  const hasAnalysis = applicableRequirements.length > 0;
  const isPhase2Locked = approvedCount === 0;
  const visibleFeedback =
    !isPhase2Locked && feedback === MASTER_DATA_APPROVAL_REQUIRED_FEEDBACK
      ? null
      : feedback;
  const primaryUnlockLabel = hasGeneratedPhase1Drafts
    ? "Open Phase 1 review"
    : "Generate Phase 1 drafts";

  return (
    <section className="grid gap-6">
      <section className="phase-section-card">
        <div className="phase-section-copy">
          <p className="phase-overline">Phase 2 setup</p>
          <h2 className="phase-section-title">
            {isPhase2Locked
              ? "Approve Phase 1 rows before you continue into Master Data."
              : "Confirm which approved requirements should become Master Data."}
          </h2>
          <p className="phase-section-body">
            {isPhase2Locked
              ? "Phase 2 only opens once at least one requirement has already been reviewed and approved in Phase 1."
              : "Start from the approved Phase 1 slice, keep the supported object types tight, and only move to processing once the scope looks useful for a review package."}
          </p>
        </div>

        <div className="phase-inline-metrics">
          <span>
            <strong>{approvedCount}</strong> approved rows
          </span>
          <span>
            {hasAnalysisRun || hasAnalysis ? (
              <>
                <strong>{applicableRequirements.length}</strong> applicable rows
              </>
            ) : (
              "Not analyzed yet"
            )}
          </span>
          <span>
            <strong>{selectedRequirementKeys.length}</strong> selected
          </span>
          <span>
            <strong>{selectedObjectTypes.length}</strong> object types
          </span>
        </div>
      </section>

      <section
        className={`grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)] ${
          isPhase2Locked ? "phase-setup-grid-locked" : "phase-setup-grid-ready"
        }`}
      >
        <section className="phase-section-card phase-setup-input">
          <div className="phase-toolbar">
            <div className="phase-toolbar-copy">
              <p className="phase-overline">Applicable requirements</p>
              <h3 className="phase-section-title">Phase 2 input slice</h3>
              <p className="phase-section-body">
                {isPhase2Locked
                  ? "Start in Phase 1, generate the initial drafts, and approve the rows you want to carry into the package."
                  : "Rows come preselected when they already passed consultant review in Phase 1, but you can still narrow the slice before generation."}
              </p>
            </div>
            {!isPhase2Locked ? (
              <button
                type="button"
                onClick={() => void onAnalyze()}
                className="focus-premium theme-shell-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
              >
                {hasAnalysis ? "Refresh analysis" : "Analyze approved rows"}
              </button>
            ) : null}
          </div>

          {hasAnalysis ? (
            <div className="overflow-hidden rounded-[1.25rem] border border-[color:var(--shell-border)]">
              <table className="theme-shell-table w-full text-left text-sm">
                <thead className="theme-shell-table-head">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Use</th>
                    <th className="px-4 py-3 font-semibold">Row</th>
                    <th className="px-4 py-3 font-semibold">Requirement</th>
                    <th className="px-4 py-3 font-semibold">Suggested objects</th>
                  </tr>
                </thead>
                <tbody>
                  {applicableRequirements.map((requirement) => {
                    const isSelected = selectedRequirementKeys.includes(
                      requirement.requirementKey,
                    );

                    return (
                      <tr
                        key={requirement.requirementKey}
                        className={`theme-shell-table-row ${
                          isSelected ? "theme-shell-table-row-active" : ""
                        }`}
                      >
                        <td className="px-4 py-3 align-top">
                          <input
                            checked={isSelected}
                            onChange={() =>
                              onToggleRequirement(requirement.requirementKey)
                            }
                            type="checkbox"
                          />
                        </td>
                        <td className="px-4 py-3 align-top font-medium text-[color:var(--shell-subtle)]">
                          {requirement.sourceRowNumber}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="grid gap-1">
                            <strong className="text-sm">
                              {requirement.requirementId || "No ID"}
                            </strong>
                            <span>{requirement.requirementDescription}</span>
                            <span className="text-xs text-[color:var(--shell-subtle)]">
                              {requirement.reason}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            {requirement.suggestedObjectTypes.map((objectType) => (
                              <span
                                key={`${requirement.requirementKey}:${objectType}`}
                                className="shell-chip shell-chip-neutral"
                              >
                                {masterDataObjectTypeLabels[objectType]}
                              </span>
                            ))}
                            {requirement.preselected ? (
                              <span className="shell-chip shell-chip-neutral">
                                Approved in Phase 1
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : isPhase2Locked ? (
            <div className="phase-empty-state">
              <p className="phase-overline">Phase 1 approval required</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                Nothing can enter Phase 2 until at least one row is approved.
              </h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
                Keep the Master Data scope grounded by approving the Phase 1
                rows that should drive the package first.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={
                    hasGeneratedPhase1Drafts
                      ? onOpenPhase1Review
                      : onOpenPhase1Generate
                  }
                  className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-semibold transition"
                >
                  {primaryUnlockLabel}
                </button>
              </div>
            </div>
          ) : hasAnalysisRun ? (
            <div className="phase-empty-state">
              <p className="phase-overline">No Phase 2 matches yet</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                The approved slice did not surface any clear Master Data rows.
              </h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
                Review the approved rows, widen the Phase 1 approvals if
                needed, or keep the setup narrow and re-run the applicability
                pass after the slice changes.
              </p>
            </div>
          ) : (
            <div className="phase-empty-state">
              <p className="phase-overline">Not analyzed yet</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                Run the first applicability pass
              </h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
                The setup step starts from the approved Phase 1 slice and
                suggests which reviewed rows actually make sense for Master Data
                generation.
              </p>
            </div>
          )}
        </section>

        <aside className="phase-rail phase-setup-action-rail">
          {isPhase2Locked ? (
            <section className="phase-rail-card grid gap-4">
              <div>
                <p className="phase-overline">Locked</p>
                <h3 className="phase-rail-title">Finish Phase 1 review first.</h3>
              </div>
              <p className="text-sm leading-6 text-[color:var(--shell-muted)]">
                Master Data stays locked until approved Phase 1 rows exist.
                Use the recovery action in the setup panel to return to the
                right Phase 1 step before running the required pilot demo path.
              </p>
            </section>
          ) : (
          <section className="phase-rail-card grid gap-5">
            <div className="phase-rail-header">
              <div>
                <p className="phase-overline">Generation mode</p>
                <h3 className="phase-rail-title">Choose the safest draft mode.</h3>
              </div>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => onModeChange("real")}
                aria-pressed={mode === "real"}
                className={`theme-shell-card rounded-[1.15rem] px-4 py-4 text-left transition ${
                  mode === "real" ? "theme-shell-card-active" : ""
                }`}
              >
                <strong className="block text-base">Grounded real generation</strong>
                <span className="mt-2 block text-sm text-[color:var(--shell-muted)]">
                  Uses MCP plus Bedrock to shape the Phase 2 package around MES
                  documentation and the reviewed requirement slice.
                </span>
              </button>
              <button
                type="button"
                onClick={() => onModeChange("mock")}
                aria-pressed={mode === "mock"}
                className={`theme-shell-card rounded-[1.15rem] px-4 py-4 text-left transition ${
                  mode === "mock" ? "theme-shell-card-active" : ""
                }`}
              >
                <strong className="block text-base">Prototype drafts</strong>
                <span className="mt-2 block text-sm text-[color:var(--shell-muted)]">
                  Keeps the UI and export flow usable with deterministic,
                  template-first defaults when teammates are working offline.
                </span>
              </button>
            </div>

            <div className="grid gap-3">
              <div>
                <p className="phase-overline">Object scope</p>
                <h3 className="phase-rail-title">Choose the package surface.</h3>
              </div>
              <div className="grid gap-2">
                {masterDataObjectTypes.map((objectType) => {
                  const isSelected = selectedObjectTypes.includes(objectType);

                  return (
                    <button
                      key={objectType}
                      type="button"
                      onClick={() => onToggleObjectType(objectType)}
                      aria-pressed={isSelected}
                      className={`theme-shell-card rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                        isSelected ? "theme-shell-card-active" : ""
                      }`}
                    >
                      {masterDataObjectTypeLabels[objectType]}
                    </button>
                  );
                })}
              </div>
            </div>

            {visibleFeedback ? (
              <div className="rounded-2xl border px-4 py-3 text-sm tone-neutral">
                {visibleFeedback}
              </div>
            ) : null}

            <button
              type="button"
              onClick={onContinueToProcess}
              disabled={
                !hasAnalysis ||
                selectedRequirementKeys.length === 0 ||
                isPhase2Locked
              }
              className="focus-premium theme-button-primary phase-setup-generate-button rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue to processing
            </button>
          </section>
          )}
        </aside>
      </section>
    </section>
  );
}
