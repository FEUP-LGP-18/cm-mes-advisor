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
  FvStatCard,
} from "@/components/ui/fv";
import {
  formatGeneralOutputMetadata,
  normalizeGeneralOutputPreferences,
  type GeneralOutputPreferences,
  type OutputMetadataEntry,
} from "@/lib/settings";

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
  downloadedAt?: string | null;
  exportReady?: boolean;
  initialDownloadedAt?: string | null;
  outputPreferences?: GeneralOutputPreferences | null;
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

const GENERAL_OUTPUT_PREFS_STORAGE_KEY = "mes-advisor-general-prefs";

export default function DemoScriptEditingPanel({
  assembly,
  draft,
  exportReady = false,
  onDraftAction,
  onSwitchToExport,
  onSwitchToReview,
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

  const selectedSection =
    assembly.sections.find((section) => section.key === selectedSectionKey) ??
    assembly.sections[0] ??
    null;

  const selectedStep =
    selectedSection?.steps.find((step) => step.key === selectedStepKey) ??
    selectedSection?.steps[0] ??
    null;
  const traceabilityLabel = overview.hasTraceability ? "Full" : "Needs check";
  const traceabilityHelper = overview.hasTraceability
    ? "Requirement and source row references present"
    : "No traceability references yet";

  return (
    <section className="fv-page fv-script-output-page">
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

          <section
            aria-label="Script editor"
            className="fv-card fv-script-main-card"
          >
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
          </section>

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
  initialDownloadedAt = null,
  outputPreferences: providedOutputPreferences,
  pendingReviewCount = 0,
  onSwitchToReview,
  onSwitchToScript,
  projectMetadata,
  downloadedAt: providedDownloadedAt,
}: DemoScriptExportPanelProps) {
  const overview = buildDemoScriptExportOverview(assembly);
  const blockerCopy = assembly.emptyState
    ? getDemoScriptEmptyStateCopy(assembly.emptyState)
    : null;
  const [downloadedAt, setDownloadedAt] = useState<string | null>(
    initialDownloadedAt,
  );
  const [storedOutputPreferences, setStoredOutputPreferences] =
    useState<GeneralOutputPreferences | null>(providedOutputPreferences ?? null);
  const activeOutputPreferences =
    providedOutputPreferences ?? storedOutputPreferences;
  const outputMetadataEntries = activeOutputPreferences
    ? formatGeneralOutputMetadata(activeOutputPreferences)
    : [];
  const exportFilename = createDemoScriptExportFilename(
    assembly.title,
    projectMetadata.projectName,
  );
  const hasReadyPayload =
    exportReady && !assembly.emptyState && assembly.approvedRequirementCount > 0;
  const readinessLabel = hasReadyPayload ? "Ready" : "Blocked";
  useEffect(() => {
    if (providedOutputPreferences !== undefined) {
      setStoredOutputPreferences(providedOutputPreferences);
      return;
    }

    setStoredOutputPreferences(readGeneralOutputPreferencesFromStorage());
  }, [providedOutputPreferences]);

  useEffect(() => {
    if (providedDownloadedAt !== undefined) {
      setDownloadedAt(providedDownloadedAt);
    }
  }, [providedDownloadedAt]);

  const handleDownloadMarkdown = () => {
    const outputPreferences =
      activeOutputPreferences ?? readGeneralOutputPreferencesFromStorage();

    downloadDemoScriptMarkdown({
      assembly,
      outputPreferences,
      projectMetadata,
    });
    setDownloadedAt(formatExportDownloadTime(new Date()));
  };

  if (assembly.emptyState) {
    return (
      <section className="fv-page fv-export-page">
        <div className="fv-stats-row fv-export-stats-row">
          <FvStatCard
            helper="Export remains disabled until a reviewed script exists"
            label="Readiness"
            tone="warning"
            value="Blocked"
          />
          <FvStatCard
            helper={`${assembly.approvedRequirementCount} approved row${
              assembly.approvedRequirementCount === 1 ? "" : "s"
            } available`}
            label="Approved requirements"
            tone="warning"
            value={assembly.approvedRequirementCount}
          />
          <FvStatCard
            helper="Only the supported Phase 1 handoff format is shown"
            label="Export format"
            tone="info"
            value="Markdown"
          />
        </div>

        <FvCallout
          className="fv-export-status-callout"
          role="alert"
          title="Export is still blocked"
          tone="error"
        >
          {blockerCopy ? (
            <>
              <strong>{blockerCopy.title}.</strong> {blockerCopy.body}
            </>
          ) : (
            "No exportable script content is available yet. Return to review or script to finish Phase 1."
          )}
        </FvCallout>

        <section className="fv-card fv-export-blocked-card">
          <FvEmptyState
            body={blockerCopy?.body}
            title={blockerCopy?.title ?? "Export is still blocked"}
          />
        </section>
      </section>
    );
  }

  return (
    <section className="fv-page fv-export-page">
      <div className="fv-stats-row fv-export-stats-row">
        <FvStatCard
          helper={`${assembly.approvedRequirementCount} approved row${
            assembly.approvedRequirementCount === 1 ? "" : "s"
          } included`}
          label="Approved requirements"
          tone={assembly.approvedRequirementCount > 0 ? "success" : "warning"}
          value={assembly.approvedRequirementCount}
        />
        <FvStatCard
          helper={exportFilename}
          label="Export format"
          tone="info"
          value="Markdown"
        />
        <FvStatCard
          helper={
            downloadedAt
              ? `Markdown downloaded at ${downloadedAt}`
              : "Local session status only"
          }
          label="Download status"
          tone={downloadedAt ? "success" : hasReadyPayload ? "info" : "warning"}
          value={downloadedAt ? "Downloaded" : readinessLabel}
        />
      </div>

      {pendingReviewCount > 0 ? (
        <FvCallout
          className="fv-export-status-callout"
          title="Export still has review blockers"
          tone="warning"
        >
          {pendingReviewCount} generated row
          {pendingReviewCount === 1 ? "" : "s"} still need consultant review
          before this handoff can be downloaded.
        </FvCallout>
      ) : null}

      {!hasReadyPayload ? (
        <FvCallout
          className="fv-export-status-callout"
          role="alert"
          title="Export is still blocked"
          tone="warning"
        >
          Finish review and script readiness before downloading the Markdown
          handoff.
        </FvCallout>
      ) : null}

      <div className="fv-export-workspace">
        <section
          aria-labelledby="export-deliverable-heading"
          className="fv-card fv-export-main-card"
        >
          <div className="fv-export-card-header">
            <div className="fv-export-title-stack">
              <p className="fv-overline">Markdown handoff</p>
              <div className="fv-export-title-row">
                <h2 className="fv-card-title" id="export-deliverable-heading">
                  Finalize Markdown handoff
                </h2>
                <div className="fv-export-badge-row">
                  <FvBadge tone={hasReadyPayload ? "success" : "warning"}>
                    {hasReadyPayload ? "Ready to download" : "Blocked"}
                  </FvBadge>
                  <FvBadge tone="info">Phase 1 only</FvBadge>
                </div>
              </div>
              <p className="fv-body-muted">
                Review the script package, confirm the metadata that will be
                included, and download the supported Markdown file for handoff.
              </p>
            </div>
          </div>

          <dl className="fv-export-key-grid">
            <ExportKeyValue label="Project" value={projectMetadata.projectName} />
            <ExportKeyValue label="Customer" value={projectMetadata.customerName} />
            <ExportKeyValue
              breakWords
              label="Source workbook"
              value={projectMetadata.sourceFilename}
            />
            <ExportKeyValue label="Filename" value={exportFilename} />
          </dl>

          <ExportOutputMetadata entries={outputMetadataEntries} />

          <div className="fv-export-detail-grid">
            <ExportRequirementCoverage overview={overview} />
            <ExportSectionCoverage overview={overview} />
          </div>
        </section>

        <aside className="fv-export-side-stack" aria-label="Export status">
          <section className="fv-card fv-export-status-card">
            <div className="fv-export-side-heading">
              <p className="fv-overline">Session status</p>
              <h2 className="fv-card-title">
                {downloadedAt ? "Downloaded in this session" : readinessLabel}
              </h2>
            </div>
            <div
              className={`fv-export-download-status ${
                downloadedAt ? "fv-export-download-status-success" : ""
              }`}
              role="status"
            >
              {downloadedAt
                ? `Markdown downloaded at ${downloadedAt}. This is a local session status only.`
                : hasReadyPayload
                  ? "Not downloaded in this session."
                  : "Export is blocked until the Phase 1 script is ready."}
            </div>
            <p className="fv-body-muted">
              Markdown is the only enabled export format in this slice. PDF,
              Excel, and sharing actions are intentionally not shown.
            </p>
          </section>

          <section className="fv-card fv-export-status-card">
            <div className="fv-export-side-heading">
              <p className="fv-overline">Readiness</p>
              <h2 className="fv-card-title">Handoff contents</h2>
            </div>
            <div className="fv-export-readiness-list">
              <ExportReadinessItem
                label="Approved rows"
                ready={assembly.approvedRequirementCount > 0}
                value={`${assembly.approvedRequirementCount} confirmed`}
              />
              <ExportReadinessItem
                label="Warnings and assumptions"
                ready
                value={
                  overview.hasWarnings || overview.hasAssumptions
                    ? "Included when present"
                    : "None recorded"
                }
              />
              <ExportReadinessItem
                label="Traceability"
                ready={overview.hasTraceability}
                value={
                  overview.hasTraceability
                    ? "Included"
                    : "Still missing references"
                }
              />
              <ExportReadinessItem
                label="Phase 2"
                ready
                value="Optional continuation; not required for Phase 1"
              />
            </div>
          </section>
        </aside>
      </div>
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

function ExportOutputMetadata({ entries }: { entries: OutputMetadataEntry[] }) {
  return (
    <section
      aria-labelledby="export-output-metadata-heading"
      className="fv-export-panel"
    >
      <div className="fv-export-panel-heading">
        <p className="fv-overline">Output metadata</p>
        <h3 className="fv-card-title" id="export-output-metadata-heading">
          General preferences
        </h3>
      </div>

      {entries.length > 0 ? (
        <dl className="fv-export-metadata-list">
          {entries.map((entry) => (
            <div key={entry.label} className="fv-export-metadata-item">
              <dt>{entry.label}</dt>
              <dd>{entry.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="fv-export-empty-note">No output metadata configured.</p>
      )}
    </section>
  );
}

function ExportRequirementCoverage({
  overview,
}: {
  overview: DemoScriptExportOverview;
}) {
  const visibleRequirements = overview.includedRequirementIds.slice(0, 12);
  const remainingCount =
    overview.includedRequirementIds.length - visibleRequirements.length;

  return (
    <section
      aria-labelledby="export-requirements-heading"
      className="fv-export-panel"
    >
      <div className="fv-export-panel-heading">
        <p className="fv-overline">Included requirements</p>
        <h3 className="fv-card-title" id="export-requirements-heading">
          Approved row coverage
        </h3>
      </div>

      {visibleRequirements.length > 0 ? (
        <div className="fv-export-chip-list">
          {visibleRequirements.map((id) => (
            <FvBadge key={id} tone="info">
              {id}
            </FvBadge>
          ))}
          {remainingCount > 0 ? (
            <FvBadge tone="neutral">+{remainingCount} more</FvBadge>
          ) : null}
        </div>
      ) : (
        <p className="fv-export-empty-note">No approved requirements included.</p>
      )}
    </section>
  );
}

function ExportSectionCoverage({
  overview,
}: {
  overview: DemoScriptExportOverview;
}) {
  return (
    <section
      aria-labelledby="export-sections-heading"
      className="fv-export-panel"
    >
      <div className="fv-export-panel-heading">
        <p className="fv-overline">Included sections</p>
        <h3 className="fv-card-title" id="export-sections-heading">
          Script package
        </h3>
      </div>

      <div className="fv-export-section-list">
        {overview.sectionSummaries.map((section) => (
          <div key={section.key} className="fv-export-section-item">
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
    </section>
  );
}

function ExportReadinessItem({
  label,
  ready,
  value,
}: {
  label: string;
  ready: boolean;
  value: string;
}) {
  return (
    <div className="fv-export-readiness-item">
      <FvBadge compact dot tone={ready ? "success" : "warning"}>
        {ready ? "Ready" : "Needs check"}
      </FvBadge>
      <div>
        <p>{label}</p>
        <span>{value}</span>
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

export function formatExportDownloadTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function readGeneralOutputPreferencesFromStorage(): GeneralOutputPreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(
      GENERAL_OUTPUT_PREFS_STORAGE_KEY,
    );

    if (!storedValue) {
      return null;
    }

    return normalizeStoredGeneralOutputPreferences(JSON.parse(storedValue));
  } catch {
    return null;
  }
}

function normalizeStoredGeneralOutputPreferences(
  value: unknown,
): GeneralOutputPreferences | null {
  const normalized = normalizeGeneralOutputPreferences(
    addGeneralPreferenceAliases(value),
  );

  return formatGeneralOutputMetadata(normalized).length > 0
    ? normalized
    : null;
}

function addGeneralPreferenceAliases(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  return {
    ...value,
    outputLanguage: value.outputLanguage ?? value.language,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function downloadDemoScriptMarkdown({
  assembly,
  outputPreferences,
  projectMetadata,
}: {
  assembly: DemoScriptAssembly;
  outputPreferences?: GeneralOutputPreferences | null;
  projectMetadata: ReviewProjectMetadata;
}): void {
  const exportTimestamp = new Date().toISOString();
  const markdown = serializeDemoScriptToMarkdown({
    assembly,
    exportTimestamp,
    outputPreferences: outputPreferences ?? undefined,
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
    <div className="fv-export-key-value">
      <dt>{label}</dt>
      <dd className={breakWords ? "fv-export-break" : undefined}>{value}</dd>
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
