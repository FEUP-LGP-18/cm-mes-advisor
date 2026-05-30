"use client";

import { useEffect, useState } from "react";
import type {
  DemoScriptAssembly,
  DemoScriptDraft,
  DemoScriptDraftAction,
  DemoScriptSection,
  DemoScriptStep,
} from "../lib/requirements/demo-script";
import {
  createDemoScriptExportFilename,
  serializeDemoScriptToMarkdown,
} from "../lib/requirements/demo-script-export";
import type { ReviewProjectMetadata } from "../lib/requirements/review";
import {
  FvBadge,
  FvCallout,
  FvEmptyState,
  FvPageHeader,
  FvStatCard,
} from "@/components/ui/fv";

interface DemoScriptEditingPanelProps {
  assembly: DemoScriptAssembly;
  draft: DemoScriptDraft;
  onDraftAction: (action: DemoScriptDraftAction) => void;
  onSwitchToExport?: () => void;
  onSwitchToReview: () => void;
  exportReady?: boolean;
  pendingReviewCount?: number;
  projectMetadata: ReviewProjectMetadata;
}

interface DemoScriptExportPanelProps {
  assembly: DemoScriptAssembly;
  exportReady?: boolean;
  pendingReviewCount?: number;
  onSwitchToReview: () => void;
  onSwitchToScript: () => void;
  projectMetadata: ReviewProjectMetadata;
}

interface DemoScriptExportOverview {
  includedRequirementIds: string[];
  sectionSummaries: Array<{
    key: string;
    title: string;
    stepCount: number;
    requirementCount: number;
  }>;
  hasAssumptions: boolean;
  hasWarnings: boolean;
  hasTraceability: boolean;
}

export default function DemoScriptEditingPanel({
  assembly,
  draft,
  onDraftAction,
  onSwitchToExport,
  onSwitchToReview,
  exportReady = !assembly.emptyState,
  pendingReviewCount = 0,
  projectMetadata,
}: DemoScriptEditingPanelProps) {
  const overview = buildDemoScriptExportOverview(assembly);
  const blockerCopy = assembly.emptyState
    ? getDemoScriptEmptyStateCopy(assembly.emptyState)
    : null;
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(
    assembly.sections[0]?.key ?? null,
  );
  const [selectedStepKey, setSelectedStepKey] = useState<string | null>(
    assembly.sections[0]?.steps[0]?.key ?? null,
  );

  useEffect(() => {
    if (
      selectedSectionKey &&
      assembly.sections.some((section) => section.key === selectedSectionKey)
    ) {
      return;
    }

    setSelectedSectionKey(assembly.sections[0]?.key ?? null);
  }, [assembly.sections, selectedSectionKey]);

  const selectedSection =
    assembly.sections.find((section) => section.key === selectedSectionKey) ??
    assembly.sections[0] ??
    null;

  useEffect(() => {
    if (
      selectedStepKey &&
      selectedSection?.steps.some((step) => step.key === selectedStepKey)
    ) {
      return;
    }

    setSelectedStepKey(selectedSection?.steps[0]?.key ?? null);
  }, [selectedSection, selectedStepKey]);

  const selectedStep =
    selectedSection?.steps.find((step) => step.key === selectedStepKey) ??
    selectedSection?.steps[0] ??
    null;
  const scriptDescription = assembly.emptyState
    ? "Approve generated demo rows before shaping the Phase 1 handoff."
    : exportReady
      ? "AI generated | all approved requirements addressed | traceability maintained."
      : "AI generated script with remaining review work before export.";
  const traceabilityLabel = overview.hasTraceability ? "Full" : "Needs check";
  const traceabilityHelper = overview.hasTraceability
    ? "Requirement and source row references present"
    : "No traceability references yet";

  return (
    <section className="fv-page fv-script-output-page">
      <FvPageHeader
        actions={
          <>
            {onSwitchToExport ? (
              <button
                className="fv-btn-primary"
                disabled={!exportReady}
                onClick={onSwitchToExport}
                type="button"
              >
                Continue to export
              </button>
            ) : null}
            <button
              className="fv-btn-secondary"
              onClick={onSwitchToReview}
              type="button"
            >
              Back to review
            </button>
          </>
        }
        description={scriptDescription}
        eyebrow="Phase 1 / Script Output"
        title="Demo Script"
      />

      <div className="fv-stats-row fv-script-stats-row">
        <FvStatCard
          helper={`${assembly.approvedRequirementCount} approved row${
            assembly.approvedRequirementCount === 1 ? "" : "s"
          } included`}
          label="Requirements addressed"
          tone={assembly.approvedRequirementCount > 0 ? "success" : "warning"}
          value={assembly.approvedRequirementCount}
        />
        <FvStatCard
          helper={`${assembly.sections.length} section${
            assembly.sections.length === 1 ? "" : "s"
          } assembled`}
          label="Demo steps generated"
          tone={assembly.approvedStepCount > 0 ? "info" : "warning"}
          value={assembly.approvedStepCount}
        />
        <FvStatCard
          helper={traceabilityHelper}
          label="Traceability"
          tone={overview.hasTraceability ? "success" : "warning"}
          value={traceabilityLabel}
        />
      </div>

      {blockerCopy ? (
        <FvCallout
          className="fv-script-status-callout"
          role="alert"
          title={blockerCopy.title}
          tone="error"
        >
          {blockerCopy.body}
        </FvCallout>
      ) : null}

      {pendingReviewCount > 0 ? (
        <FvCallout
          className="fv-script-status-callout"
          title="Keep shaping the handoff"
          tone="warning"
        >
          {pendingReviewCount} generated row
          {pendingReviewCount === 1 ? "" : "s"} still need consultant review
          before the handoff is fully exportable.
        </FvCallout>
      ) : null}

      {assembly.emptyState ? (
        <section className="fv-card">
          <EmptyDemoScriptState
            actionLabel="Return to review"
            emptyState={assembly.emptyState}
            onAction={onSwitchToReview}
            titleEyebrow="Script blocked"
          />
        </section>
      ) : selectedSection ? (
        <div className="fv-script-workspace">
          <aside className="fv-card fv-script-section-card">
            <ScriptOutlineContent
              assembly={assembly}
              draft={draft}
              onDraftAction={onDraftAction}
              onSelectSection={(sectionKey) => {
                const nextSection = assembly.sections.find(
                  (section) => section.key === sectionKey,
                );

                setSelectedSectionKey(sectionKey);
                setSelectedStepKey(nextSection?.steps[0]?.key ?? null);
              }}
              selectedSectionKey={selectedSection?.key ?? null}
            />
          </aside>

          <main className="fv-card fv-script-main-card">
            <div className="fv-script-document-header">
              <div className="fv-script-title-stack">
                <label className="fv-script-title-label">
                  <span className="fv-overline">Script title</span>
                  <input
                    className="fv-input fv-script-title-input"
                    onChange={(event) =>
                      onDraftAction({
                        type: "renameTitle",
                        title: event.currentTarget.value,
                      })
                    }
                    value={draft.title}
                  />
                </label>
                <p className="fv-body-muted">
                  Refine the structure, wording, and notes while keeping the
                  approved story easy to scan and defend.
                </p>
              </div>
              <div className="fv-script-source-card">
                <span className="fv-overline">Source workbook</span>
                <strong>{projectMetadata.sourceFilename}</strong>
                <span>
                  {projectMetadata.customerName} | {projectMetadata.sourceRowCount}{" "}
                  source rows
                </span>
              </div>
            </div>

            <article className="fv-script-section-detail">
              <div className="fv-card-header">
                <div className="fv-script-section-title-stack">
                  <span className="fv-overline">
                    {selectedSection.sourceLabel}
                  </span>
                  <label className="fv-script-section-title-label">
                    <span className="sr-only">Section title</span>
                    <input
                      className="fv-input fv-script-section-title-input"
                      onChange={(event) =>
                        onDraftAction({
                          type: "editSectionTitle",
                          sectionKey: selectedSection.key,
                          title: event.currentTarget.value,
                        })
                      }
                      value={resolveSectionTitle(draft, selectedSection)}
                    />
                  </label>
                  <p className="fv-body-muted">{selectedSection.subtitle}</p>
                </div>
                <FvBadge tone="info">
                  {selectedSection.stepCount} steps
                </FvBadge>
              </div>

              <div className="fv-script-step-tabs" role="list">
                {selectedSection.steps.map((step, index) => {
                  const isActive = step.key === selectedStep?.key;

                  return (
                    <button
                      aria-pressed={isActive}
                      className={`fv-script-step-tab ${
                        isActive ? "fv-script-step-tab-active" : ""
                      }`}
                      key={step.key}
                      onClick={() => setSelectedStepKey(step.key)}
                      type="button"
                    >
                      <span className="fv-overline">Step {index + 1}</span>
                      <strong>{resolveStepTitle(draft, step)}</strong>
                      <span>{step.traceability.requirementId}</span>
                    </button>
                  );
                })}
              </div>

              {selectedStep ? (
                <ScriptStepWorkbench
                  draft={draft}
                  onDraftAction={onDraftAction}
                  step={selectedStep}
                />
              ) : (
                <FvEmptyState
                  body="Select a section step to inspect notes, instructions, and traceability."
                  title="No step selected"
                />
              )}
            </article>
          </main>

          <aside className="fv-card fv-script-coverage-card">
            <ScriptCoverageContent overview={overview} />
          </aside>
        </div>
      ) : null}
    </section>
  );
}

export function DemoScriptExportPanel({
  assembly,
  exportReady = !assembly.emptyState,
  pendingReviewCount = 0,
  onSwitchToReview,
  onSwitchToScript,
  projectMetadata,
}: DemoScriptExportPanelProps) {
  const overview = buildDemoScriptExportOverview(assembly);
  const blockerCopy = assembly.emptyState
    ? getDemoScriptEmptyStateCopy(assembly.emptyState)
    : null;
  const [downloadedAt, setDownloadedAt] = useState<string | null>(null);

  if (assembly.emptyState) {
    return (
      <section className="phase-document-workspace">
        <aside className="phase-document-sidebar">
          <section className="phase-sidebar-panel">
            <div className="phase-sidebar-copy">
              <p className="phase-overline">Export</p>
              <h3 className="phase-rail-title">Export is still blocked</h3>
            </div>

            <div className="phase-feedback phase-feedback-error">
              <strong>{blockerCopy?.title}</strong> {blockerCopy?.body}
            </div>

            <div className="phase-rail-stack">
              <button
                type="button"
                onClick={onSwitchToScript}
                className="focus-premium theme-shell-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
              >
                Back to script
              </button>
              <button
                type="button"
                onClick={onSwitchToReview}
                className="focus-premium theme-shell-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
              >
                Back to review
              </button>
            </div>
          </section>
        </aside>

        <section className="document-panel min-w-0 rounded-[1.75rem] p-5 sm:p-6">
          <EmptyDemoScriptState
            actionLabel="Back to review"
            emptyState={assembly.emptyState}
            onAction={onSwitchToReview}
            secondaryActionLabel="Back to script"
            onSecondaryAction={onSwitchToScript}
            titleEyebrow="Export blocked"
          />
        </section>
      </section>
    );
  }

  return (
    <section className="phase-document-workspace">
      <aside className="phase-document-sidebar">
        <div className="phase-document-sidebar-scroll">
          <div className="grid gap-4">
            <section className="phase-sidebar-panel">
              <div className="phase-rail-header">
                <div>
                  <p className="phase-overline">Export</p>
                  <h3 className="phase-rail-title">
                    {exportReady ? "Ready to download" : "Export is still blocked"}
                  </h3>
                </div>
                <span className="phase-count-pill">
                  {assembly.approvedRequirementCount} approved
                </span>
              </div>

              {pendingReviewCount > 0 ? (
                <div className="phase-feedback">
                  {pendingReviewCount} generated row
                  {pendingReviewCount === 1 ? "" : "s"} still need consultant
                  review before this handoff can be downloaded.
                </div>
              ) : null}

              <div className="theme-shell-card rounded-[1.25rem] p-4 text-sm leading-6 theme-shell-body">
                <p>
                  <span className="theme-shell-title font-bold">Format:</span>{" "}
                  Markdown
                </p>
                <p>
                  <span className="theme-shell-title font-bold">Filename:</span>{" "}
                  {createDemoScriptExportFilename(
                    assembly.title,
                    projectMetadata.projectName,
                  )}
                </p>
                <p>
                  <span className="theme-shell-title font-bold">Scope:</span>{" "}
                  Phase 1 handoff only.
                </p>
              </div>

              <div className="phase-status-list">
                <DocumentChecklistItem
                  label="Approved rows"
                  ready={assembly.approvedRequirementCount > 0}
                  value={`${assembly.approvedRequirementCount} confirmed`}
                />
                <DocumentChecklistItem
                  label="Warnings and assumptions"
                  ready
                  value={
                    overview.hasWarnings || overview.hasAssumptions
                      ? "Included when present"
                      : "None recorded"
                  }
                />
                <DocumentChecklistItem
                  label="Traceability"
                  ready={overview.hasTraceability}
                  value={
                    overview.hasTraceability
                      ? "Included"
                      : "Still missing references"
                  }
                />
                <DocumentChecklistItem
                  label="Export"
                  ready={exportReady}
                  value={exportReady ? "Ready to download" : "Blocked"}
                />
                <DocumentChecklistItem
                  label="Download status"
                  ready={downloadedAt !== null}
                  value={
                    downloadedAt ? `Downloaded at ${downloadedAt}` : "Not downloaded yet"
                  }
                />
              </div>

              <div className="phase-rail-stack">
                <button
                  type="button"
                  disabled={!exportReady}
                  onClick={() => {
                    downloadDemoScriptMarkdown({
                      assembly,
                      projectMetadata,
                    });
                    setDownloadedAt(formatExportDownloadTime(new Date()));
                  }}
                  className="focus-premium theme-button-primary rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Download Markdown
                </button>
                <div
                  role="status"
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    downloadedAt ? "tone-positive" : "tone-neutral"
                  }`}
                >
                  {downloadedAt
                    ? `Markdown downloaded at ${downloadedAt}.`
                    : "Not downloaded yet"}
                </div>
                <button
                  type="button"
                  onClick={onSwitchToScript}
                  className="focus-premium theme-shell-button-secondary rounded-2xl px-4 py-3 text-sm font-bold transition"
                >
                  Back to script
                </button>
                <button
                  type="button"
                  onClick={onSwitchToReview}
                  className="focus-premium theme-shell-button-secondary rounded-2xl px-4 py-3 text-sm font-bold transition"
                >
                  Back to review
                </button>
              </div>
            </section>

            <section className="phase-sidebar-panel phase-desktop-only">
              <ExportCoverageContent overview={overview} />
            </section>
          </div>
        </div>
      </aside>

      <section className="phase-document-main document-panel min-w-0 rounded-[1.75rem] p-5 sm:p-6">
        <div className="theme-doc-card rounded-[1.5rem] p-5">
          <p className="theme-doc-kicker mono-label text-[0.68rem]">
            Export handoff
          </p>
          <h3 className="theme-doc-title mt-3 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
            Finalize the Phase 1 deliverable
          </h3>
          <p className="theme-doc-body mt-3 max-w-3xl text-sm leading-7">
            Review what is going into the handoff, confirm the included
            requirement coverage, and download the final Markdown deliverable.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(260px,0.95fr)]">
            <div className="theme-doc-card-contrast rounded-[1.4rem] p-5">
              <p className="theme-shell-kicker mono-label text-[0.56rem]">
                Deliverable
              </p>
              <h4 className="mt-4 text-3xl font-bold tracking-[-0.045em] text-[color:var(--document-contrast-ink)]">
                {assembly.title || projectMetadata.projectName}
              </h4>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <ExportKeyValue
                  label="Project"
                  value={projectMetadata.projectName}
                />
                <ExportKeyValue
                  label="Customer"
                  value={projectMetadata.customerName}
                />
                <ExportKeyValue
                  breakWords
                  label="Source workbook"
                  value={projectMetadata.sourceFilename}
                />
                <ExportKeyValue label="Output" value="Markdown handoff" />
              </div>
            </div>

            <div className="theme-doc-card-muted rounded-[1.4rem] p-5">
              <p className="theme-doc-subtle mono-label text-[0.56rem]">
                Readiness
              </p>
              <div className="mt-4 grid gap-2">
                <ExportPresencePill label="Approved rows" present />
                <ExportPresencePill
                  label="Assumptions"
                  present={overview.hasAssumptions}
                />
                <ExportPresencePill
                  label="Warnings"
                  present={overview.hasWarnings}
                />
                <ExportPresencePill
                  label="Traceability"
                  present={overview.hasTraceability}
                />
                <ExportPresencePill label="Step groups" present />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="theme-doc-card rounded-[1.4rem] p-4">
              <p className="theme-doc-subtle mono-label text-[0.56rem]">
                Included requirements
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {overview.includedRequirementIds.slice(0, 12).map((id) => (
                  <span
                    key={id}
                    className="theme-doc-chip-muted rounded-full px-3 py-1.5 text-xs font-bold"
                  >
                    {id}
                  </span>
                ))}
                {overview.includedRequirementIds.length > 12 ? (
                  <span className="theme-doc-chip rounded-full px-3 py-1.5 text-xs font-bold theme-doc-subtle">
                    +{overview.includedRequirementIds.length - 12} more
                  </span>
                ) : null}
              </div>
            </section>

            <section className="theme-doc-card rounded-[1.4rem] p-4">
              <p className="theme-doc-subtle mono-label text-[0.56rem]">
                Section coverage
              </p>
              <div className="mt-3 grid gap-2">
                {overview.sectionSummaries.map((section) => (
                  <div
                    key={section.key}
                    className="theme-doc-card-muted rounded-2xl px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="theme-doc-title text-sm font-bold">
                        {section.title}
                      </p>
                      <span className="theme-doc-subtle text-xs font-bold">
                        {section.stepCount} steps
                      </span>
                    </div>
                    <p className="theme-doc-subtle mt-1 text-xs">
                      {section.requirementCount} approved requirement
                      {section.requirementCount === 1 ? "" : "s"} grouped here.
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      {overview.sectionSummaries.length > 0 ? (
        <details className="phase-sidebar-panel phase-mobile-only">
          <summary className="theme-shell-title cursor-pointer text-sm font-bold">
            Included sections
          </summary>
          <div className="mt-4">
            <ExportCoverageContent overview={overview} />
          </div>
        </details>
      ) : null}
    </section>
  );
}

function ScriptOutlineContent({
  assembly,
  draft,
  onDraftAction,
  onSelectSection,
  selectedSectionKey,
}: {
  assembly: DemoScriptAssembly;
  draft: DemoScriptDraft;
  onDraftAction: (action: DemoScriptDraftAction) => void;
  onSelectSection: (sectionKey: string) => void;
  selectedSectionKey: string | null;
}) {
  return (
    <>
      <div className="fv-script-panel-heading">
        <p className="fv-overline">Script sections</p>
        <h2 className="fv-card-title">Section order and focus</h2>
      </div>

      <div className="fv-script-section-list">
        {assembly.sections.map((section, index) => {
          const isActive = section.key === selectedSectionKey;

          return (
            <div
              key={section.key}
              className={`fv-script-section-item ${
                isActive ? "fv-script-section-item-active" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectSection(section.key)}
                className="fv-script-section-button"
              >
                <span>
                  {resolveSectionTitle(draft, section)}
                </span>
                <small>
                  {section.stepCount} steps
                </small>
              </button>

              <div className="fv-script-order-controls">
                <SectionOrderButton
                  direction="up"
                  disabled={index === 0}
                  onClick={() =>
                    onDraftAction({
                      type: "setSectionOrder",
                      sectionOrder: moveSection(
                        assembly.sections.map((item) => item.key),
                        section.key,
                        "up",
                      ),
                    })
                  }
                />
                <SectionOrderButton
                  direction="down"
                  disabled={index === assembly.sections.length - 1}
                  onClick={() =>
                    onDraftAction({
                      type: "setSectionOrder",
                      sectionOrder: moveSection(
                        assembly.sections.map((item) => item.key),
                        section.key,
                        "down",
                      ),
                    })
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ScriptCoverageContent({
  overview,
}: {
  overview: DemoScriptExportOverview;
}) {
  return (
    <>
      <div className="fv-script-panel-heading">
        <p className="fv-overline">Coverage</p>
        <h2 className="fv-card-title">What the handoff includes</h2>
      </div>

      <div className="fv-script-coverage-list">
        {overview.sectionSummaries.map((section) => (
          <div key={section.key} className="fv-script-coverage-item">
            <div>
              <p>{section.title}</p>
              <span>
                {section.requirementCount} approved requirement
                {section.requirementCount === 1 ? "" : "s"}
              </span>
            </div>
            <strong>{section.stepCount} steps</strong>
          </div>
        ))}
      </div>
    </>
  );
}

function ExportCoverageContent({
  overview,
}: {
  overview: DemoScriptExportOverview;
}) {
  return (
    <>
      <div className="phase-sidebar-copy">
        <p className="phase-overline">Coverage</p>
        <h3 className="phase-rail-title">Included sections</h3>
      </div>

      <div className="phase-coverage-list">
        {overview.sectionSummaries.map((section) => (
          <div key={section.key} className="phase-coverage-item">
            <div>
              <p className="phase-overlay-row-title">{section.title}</p>
              <p className="phase-overlay-row-body">
                {section.requirementCount} approved requirement
                {section.requirementCount === 1 ? "" : "s"}
              </p>
            </div>
            <span>{section.stepCount} steps</span>
          </div>
        ))}
      </div>
    </>
  );
}

function DocumentChecklistItem({
  label,
  ready,
  value,
}: {
  label: string;
  ready: boolean;
  value: string;
}) {
  return (
    <div className="phase-status-item">
      <span
        className={`phase-status-dot ${
          ready ? "phase-status-complete" : "phase-status-waiting"
        }`}
      />
      <div>
        <p className="phase-status-label">{label}</p>
        <p className="phase-status-meta">{value}</p>
      </div>
    </div>
  );
}

export function buildDemoScriptExportOverview(
  assembly: DemoScriptAssembly,
): DemoScriptExportOverview {
  const includedRequirementIds = Array.from(
    new Set(
      assembly.sections
        .flatMap((section) => section.steps)
        .map((step) => step.traceability.requirementId)
        .filter((value) => value.trim().length > 0),
    ),
  );

  return {
    includedRequirementIds,
    sectionSummaries: assembly.sections.map((section) => ({
      key: section.key,
      title: section.title,
      stepCount: section.stepCount,
      requirementCount: section.requirementCount,
    })),
    hasAssumptions: assembly.sections.some((section) =>
      section.steps.some((step) => step.assumptions.length > 0),
    ),
    hasWarnings: assembly.sections.some((section) =>
      section.steps.some((step) => step.warnings.length > 0),
    ),
    hasTraceability: assembly.sections.some((section) =>
      section.steps.some(
        (step) =>
          step.sourceReferences.length > 0 ||
          step.traceability.requirementId.trim().length > 0,
      ),
    ),
  };
}

export function getDemoScriptEmptyStateCopy(
  emptyState: DemoScriptAssembly["emptyState"],
): {
  title: string;
  body: string;
} {
  switch (emptyState) {
    case "no-generated-drafts":
      return {
        title: "Generate drafts before assembling the script",
        body: "No generated drafts are available yet. Use the Review step to generate drafts, then approve the rows you want to keep in the consultant-facing script.",
      };
    case "no-approved-drafts":
      return {
        title: "Approve at least one generated draft",
        body: "Generated drafts exist, but none are approved yet. Approve the rows you want to keep in the script, then return here to shape the final Phase 1 narrative.",
      };
    case "no-demo-steps":
      return {
        title: "Approved drafts exist, but no demo steps were produced",
        body: "The approved draft output does not include demo steps yet. Review the source row, adjust the draft, or regenerate it before the script can be exported.",
      };
    default:
      return {
        title: "Demo script unavailable",
        body: "The script assembly state could not be determined from the current review data.",
      };
  }
}

function formatExportDownloadTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function downloadDemoScriptMarkdown({
  assembly,
  projectMetadata,
}: {
  assembly: DemoScriptAssembly;
  projectMetadata: ReviewProjectMetadata;
}): void {
  const exportTimestamp = new Date().toISOString();
  const markdown = serializeDemoScriptToMarkdown({
    assembly,
    exportTimestamp,
    projectMetadata,
  });
  const filename = createDemoScriptExportFilename(
    assembly.title,
    projectMetadata.projectName,
  );
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

function EmptyDemoScriptState({
  actionLabel,
  emptyState,
  onAction,
  onSecondaryAction,
  secondaryActionLabel,
  titleEyebrow,
}: {
  actionLabel: string;
  emptyState: DemoScriptAssembly["emptyState"];
  onAction: () => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  titleEyebrow: string;
}) {
  const emptyCopy = getDemoScriptEmptyStateCopy(emptyState);

  return (
    <section className="theme-doc-card-brand mt-6 rounded-2xl border-dashed p-6">
      <p className="theme-doc-kicker mono-label text-[0.68rem]">
        {titleEyebrow}
      </p>
      <h3 className="theme-doc-title mt-3 text-3xl font-bold tracking-[-0.04em]">
        {emptyCopy.title}
      </h3>
      <p className="theme-doc-body mt-4 max-w-3xl leading-7">
        {emptyCopy.body}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAction}
          className="focus-premium theme-button-primary rounded-2xl px-4 py-3 text-sm font-bold transition"
        >
          {actionLabel}
        </button>
        {onSecondaryAction && secondaryActionLabel ? (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="focus-premium theme-doc-button-secondary rounded-2xl px-4 py-3 text-sm font-bold transition"
          >
            {secondaryActionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function SectionOrderButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "up" | "down";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="fv-btn-secondary fv-btn-sm"
    >
      {direction === "up" ? "Up" : "Down"}
    </button>
  );
}

function ScriptStepWorkbench({
  draft,
  onDraftAction,
  step,
}: {
  draft: DemoScriptDraft;
  onDraftAction: (action: DemoScriptDraftAction) => void;
  step: DemoScriptStep;
}) {
  return (
    <section className="fv-script-step-workbench">
      <div className="fv-script-step-header">
        <div>
          <p className="fv-overline">{step.groupLabel}</p>
          <label className="fv-script-step-title-label">
            <span className="sr-only">Step title</span>
            <textarea
              value={resolveStepTitle(draft, step)}
              onChange={(event) =>
                onDraftAction({
                  type: "editStep",
                  stepKey: step.key,
                  title: event.currentTarget.value,
                  note: resolveStepNote(draft, step),
                })
              }
              className="fv-input fv-script-step-title-input"
              rows={2}
            />
          </label>
          <p className="fv-body-muted">
            {step.traceability.requirementId} | Excel row{" "}
            {step.traceability.sourceRowNumber} |{" "}
            {step.sourceDemoStep.reviewStatus}
          </p>
        </div>
        <FvBadge tone={step.confidence.level === "high" ? "success" : "info"}>
          {step.confidence.level} confidence
        </FvBadge>
      </div>

      <div className="fv-script-step-body">
        <label className="fv-script-note-label">
          <span className="fv-overline">Step note</span>
          <textarea
            value={resolveStepNote(draft, step)}
            onChange={(event) =>
              onDraftAction({
                type: "editStep",
                stepKey: step.key,
                title: resolveStepTitle(draft, step),
                note: event.currentTarget.value,
              })
            }
            placeholder="Add the consultant note for this step."
            className="fv-input fv-script-note-input"
          />
        </label>

        <div className="fv-script-info-block">
          <p className="fv-overline">Demo instructions</p>
          <ol>
            {step.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </div>

        <details className="fv-script-info-block">
          <summary>Evidence and context</summary>
          <div className="fv-script-evidence-grid">
            <div>
              <p className="fv-overline">Current comment</p>
              <p className="fv-script-evidence-copy">
                {step.currentComment}
              </p>
            </div>
            <div>
              <p className="fv-overline">Generated source comment</p>
              <p className="fv-script-evidence-copy">
                {step.generatedComment}
              </p>
            </div>
            <ScriptDetailList label="Assumptions" items={step.assumptions} />
            <ScriptDetailList label="Warnings" items={step.warnings} />
            <div>
              <p className="fv-overline">Traceability</p>
              <div className="fv-script-trace-list">
                <TraceChip
                  label={`Requirement ${step.traceability.requirementId}`}
                />
                <TraceChip
                  label={`Excel row ${step.traceability.sourceRowNumber}`}
                />
                <TraceChip label={step.sourceDemoStep.mesModuleOrScreen} />
              </div>
            </div>
            {step.sourceReferences.length > 0 ? (
              <div>
                <p className="fv-overline">Source references</p>
                <ul className="fv-script-reference-list">
                  {step.sourceReferences.map((reference) => {
                    const safeSourceUrl = getSafeSourceReferenceUrl(
                      reference.url,
                    );

                    return (
                      <li key={reference.id}>
                        <strong>{reference.kind}</strong>:{" "}
                        {safeSourceUrl ? (
                          <a
                            href={safeSourceUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {reference.label}
                          </a>
                        ) : (
                          <span>{reference.label}</span>
                        )}
                        . {reference.note}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
      </div>
    </section>
  );
}

function ExportKeyValue({
  breakWords,
  label,
  value,
}: {
  breakWords?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="theme-doc-subtle text-xs font-bold uppercase tracking-[0.18em]">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold text-[color:var(--document-contrast-ink)] ${
          breakWords ? "break-all" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ExportPresencePill({
  label,
  present,
}: {
  label: string;
  present: boolean;
}) {
  return (
    <div
      className={`rounded-full border px-3 py-2 text-xs font-bold ${
        present ? "theme-doc-chip-brand" : "theme-doc-chip-muted"
      }`}
    >
      {label}: {present ? "Included" : "None"}
    </div>
  );
}

function resolveSectionTitle(
  draft: DemoScriptDraft,
  section: DemoScriptSection,
): string {
  return draft.sectionEdits[section.key]?.title || section.title;
}

function resolveStepTitle(
  draft: DemoScriptDraft,
  step: DemoScriptStep,
): string {
  return draft.stepEdits[step.key]?.title || step.title;
}

function resolveStepNote(draft: DemoScriptDraft, step: DemoScriptStep): string {
  return draft.stepEdits[step.key]?.note || "";
}

function getSafeSourceReferenceUrl(url?: string): string | null {
  const trimmedUrl = url?.trim();

  if (!trimmedUrl) {
    return null;
  }

  if (trimmedUrl.startsWith("/") && !trimmedUrl.startsWith("//")) {
    return trimmedUrl;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);

    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
      ? trimmedUrl
      : null;
  } catch {
    return null;
  }
}

function moveSection(
  sectionOrder: string[],
  sectionKey: string,
  direction: "up" | "down",
): string[] {
  const nextOrder = [...sectionOrder];
  const currentIndex = nextOrder.indexOf(sectionKey);

  if (currentIndex === -1) {
    return nextOrder;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= nextOrder.length) {
    return nextOrder;
  }

  const [section] = nextOrder.splice(currentIndex, 1);
  nextOrder.splice(targetIndex, 0, section);
  return nextOrder;
}

function TraceChip({ label }: { label: string }) {
  return <FvBadge tone="info">{label}</FvBadge>;
}

function ScriptDetailList({
  items,
  label,
}: {
  items: string[];
  label: string;
}) {
  return (
    <div>
      <p className="fv-overline">{label}</p>
      {items.length > 0 ? (
        <ul className="fv-script-detail-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="fv-script-evidence-copy">
          No {label.toLowerCase()} recorded.
        </p>
      )}
    </div>
  );
}
