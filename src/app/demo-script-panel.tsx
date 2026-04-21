"use client";

import { useState } from "react";
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

interface DemoScriptEditingPanelProps {
  assembly: DemoScriptAssembly;
  draft: DemoScriptDraft;
  onDraftAction: (action: DemoScriptDraftAction) => void;
  onSwitchToReview: () => void;
  projectMetadata: ReviewProjectMetadata;
}

interface DemoScriptExportPanelProps {
  assembly: DemoScriptAssembly;
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
  onSwitchToReview,
  projectMetadata,
}: DemoScriptEditingPanelProps) {
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(
    assembly.sections[0]?.key ?? null,
  );

  const selectedSection =
    assembly.sections.find((section) => section.key === selectedSectionKey) ??
    assembly.sections[0] ??
    null;
  const [selectedStepKey, setSelectedStepKey] = useState<string | null>(
    selectedSection?.steps[0]?.key ?? null,
  );

  const selectedStep =
    selectedSection?.steps.find((step) => step.key === selectedStepKey) ??
    selectedSection?.steps[0] ??
    null;

  return (
    <section className="grid min-w-0 gap-5">
      <div className="grid gap-3 md:grid-cols-4">
        <ScriptSummaryCard
          label="Approved rows"
          value={assembly.approvedRequirementCount}
          helper="Consultant-approved rows feeding the script."
        />
        <ScriptSummaryCard
          label="Sections"
          value={assembly.sections.length}
          helper="Grouped story beats in the Phase 1 narrative."
        />
        <ScriptSummaryCard
          label="Demo steps"
          value={assembly.approvedStepCount}
          helper="Ordered steps that can still be refined here."
        />
        <ScriptSummaryCard
          label="Export readiness"
          value={assembly.emptyState ? "Blocked" : "Ready"}
          helper={
            assembly.emptyState
              ? "Resolve the blocker before finishing Phase 1."
              : "The document can move to the final export step."
          }
        />
      </div>

      <div className="document-panel overflow-hidden rounded-[1.75rem] p-5 sm:p-7">
        <div className="flex flex-col gap-5 border-b border-[color:var(--document-border)] pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="theme-doc-kicker mono-label text-[0.68rem]">
              Script editor
            </p>
            <h3 className="theme-doc-title mt-3 text-3xl font-bold leading-tight tracking-[-0.05em] sm:text-4xl">
              Shape the consultant-facing narrative
            </h3>
            <p className="theme-doc-body mt-3 text-sm leading-7">
              Edit the narrative with a section-by-section workflow. Keep the
              active section focused, and pull in evidence only when you need
              it.
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitchToReview}
            className="focus-premium theme-doc-button-secondary rounded-2xl px-4 py-3 text-sm font-bold transition"
          >
            Back to review
          </button>
        </div>

        {assembly.emptyState ? (
          <EmptyDemoScriptState
            actionLabel="Return to review"
            emptyState={assembly.emptyState}
            onAction={onSwitchToReview}
            titleEyebrow="Script blocked"
          />
        ) : (
          <div className="mt-6 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="theme-doc-card-muted rounded-[1.5rem] p-4">
              <div className="border-b border-[color:var(--document-border)] pb-4">
                <p className="theme-doc-subtle mono-label text-[0.58rem]">
                  Section outline
                </p>
                <p className="theme-doc-body mt-2 text-sm leading-6">
                  Choose the section you want to refine. Only one section stays
                  open at a time so the editing flow stays focused.
                </p>
              </div>

              <div className="mt-4 grid gap-2">
                {assembly.sections.map((section, index) => {
                  const isActive = section.key === selectedSection?.key;
                  return (
                    <div
                      key={section.key}
                      className={`rounded-2xl border p-3 transition ${
                        isActive
                          ? "theme-doc-card theme-doc-title"
                          : "theme-doc-card-muted theme-doc-body"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSectionKey(section.key);
                          setSelectedStepKey(section.steps[0]?.key ?? null);
                        }}
                        className="focus-premium block w-full text-left"
                      >
                        <p className="text-sm font-bold">
                          {resolveSectionTitle(draft, section)}
                        </p>
                        <p className="theme-doc-subtle mt-1 text-xs">
                          {section.sourceLabel} · {section.stepCount} steps
                        </p>
                      </button>

                      {assembly.sections.length > 1 ? (
                        <div className="mt-3 flex gap-2">
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
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </aside>

            <div className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <label className="theme-doc-card block rounded-[1.5rem] p-4">
                  <span className="theme-doc-subtle mono-label text-[0.62rem]">
                    Script title
                  </span>
                  <input
                    value={draft.title}
                    onChange={(event) =>
                      onDraftAction({
                        type: "renameTitle",
                        title: event.currentTarget.value,
                      })
                    }
                    className="focus-premium theme-doc-input mt-2 w-full rounded-2xl px-4 py-3 text-sm font-bold transition"
                  />
                </label>

                <div className="theme-doc-card rounded-[1.5rem] p-4 text-sm leading-6 theme-doc-body">
                  <p className="theme-doc-subtle mono-label text-[0.58rem]">
                    Script context
                  </p>
                  <p className="mt-2">
                    Project:{" "}
                    <span className="theme-doc-title font-bold">
                      {projectMetadata.projectName}
                    </span>
                  </p>
                  <p>
                    Customer:{" "}
                    <span className="theme-doc-title font-bold">
                      {projectMetadata.customerName}
                    </span>
                  </p>
                  <p className="break-all">
                    Source:{" "}
                    <span className="theme-doc-title font-bold">
                      {projectMetadata.sourceFilename}
                    </span>
                  </p>
                </div>
              </div>

              {selectedSection ? (
                <article className="theme-doc-card rounded-[1.75rem] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="theme-doc-kicker mono-label text-[0.58rem]">
                        {selectedSection.sourceLabel}
                      </p>
                      <label className="mt-2 block">
                        <span className="sr-only">Section title</span>
                        <input
                          value={resolveSectionTitle(draft, selectedSection)}
                          onChange={(event) =>
                            onDraftAction({
                              type: "editSectionTitle",
                              sectionKey: selectedSection.key,
                              title: event.currentTarget.value,
                            })
                          }
                          className="focus-premium theme-doc-title w-full rounded-xl border border-transparent bg-transparent px-0 py-0 text-2xl font-bold tracking-[-0.04em] transition focus:border-[color:var(--document-border)] focus:bg-[color:var(--document-soft-surface)] focus:px-3 focus:py-2"
                        />
                      </label>
                      <p className="theme-doc-body mt-2 text-sm leading-6">
                        {selectedSection.subtitle}
                      </p>
                    </div>
                    <div className="theme-doc-chip-brand rounded-full px-3 py-1.5 text-xs font-bold">
                      {selectedSection.stepCount} steps
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto pb-1">
                    <div className="flex min-w-max gap-2">
                      {selectedSection.steps.map((step, index) => {
                        const isActive = step.key === selectedStep?.key;
                        return (
                          <button
                            key={step.key}
                            type="button"
                            onClick={() => setSelectedStepKey(step.key)}
                            className={`focus-premium min-w-[180px] rounded-2xl border px-3 py-3 text-left transition ${
                              isActive
                                ? "theme-doc-card-brand"
                                : "theme-doc-card-muted hover:bg-[color:var(--document-soft-surface)]"
                            }`}
                          >
                            <p className="theme-doc-subtle mono-label text-[0.5rem]">
                              Step {index + 1}
                            </p>
                            <p className="mt-2 text-sm font-bold">
                              {resolveStepTitle(draft, step)}
                            </p>
                            <p className="theme-doc-subtle mt-1 text-xs">
                              {step.traceability.requirementId}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedStep ? (
                    <ScriptStepWorkbench
                      draft={draft}
                      onDraftAction={onDraftAction}
                      step={selectedStep}
                    />
                  ) : null}
                </article>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function DemoScriptExportPanel({
  assembly,
  onSwitchToReview,
  onSwitchToScript,
  projectMetadata,
}: DemoScriptExportPanelProps) {
  const overview = buildDemoScriptExportOverview(assembly);

  if (assembly.emptyState) {
    return (
      <section className="grid min-w-0 gap-5">
        <div className="grid gap-3 md:grid-cols-4">
          <ScriptSummaryCard
            label="Approved rows"
            value={assembly.approvedRequirementCount}
            helper="Rows approved into the draft script."
          />
          <ScriptSummaryCard
            label="Demo steps"
            value={assembly.approvedStepCount}
            helper="Steps currently assembled from approved rows."
          />
          <ScriptSummaryCard
            label="Sections"
            value={assembly.sections.length}
            helper="Story sections available for export."
          />
          <ScriptSummaryCard
            label="Export status"
            value="Blocked"
            helper="Resolve the blocker before downloading."
          />
        </div>

        <EmptyDemoScriptState
          actionLabel="Back to review"
          emptyState={assembly.emptyState}
          onAction={onSwitchToReview}
          secondaryActionLabel="Back to script"
          onSecondaryAction={onSwitchToScript}
          titleEyebrow="Export blocked"
        />
      </section>
    );
  }

  return (
    <section className="grid min-w-0 gap-5">
      <div className="grid gap-3 md:grid-cols-4">
        <ScriptSummaryCard
          label="Approved rows"
          value={assembly.approvedRequirementCount}
          helper="Rows included in the final deliverable."
        />
        <ScriptSummaryCard
          label="Demo steps"
          value={assembly.approvedStepCount}
          helper="Actionable MES demo steps in the document."
        />
        <ScriptSummaryCard
          label="Sections"
          value={assembly.sections.length}
          helper="Grouped narrative sections ready for handoff."
        />
        <ScriptSummaryCard
          label="Export status"
          value="Ready"
          helper="Markdown is available for download now."
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="document-panel min-w-0 rounded-[1.75rem] p-5 sm:p-6">
          <div className="theme-doc-card rounded-[1.5rem] p-5">
            <p className="theme-doc-kicker mono-label text-[0.68rem]">
              Export handoff
            </p>
            <h3 className="theme-doc-title mt-3 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
              Finalize the Phase 1 deliverable
            </h3>
            <p className="theme-doc-body mt-3 max-w-3xl text-sm leading-7">
              The editing work is done. This screen confirms what is going into
              the handoff document and keeps the download action front and
              center.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
              <div className="theme-doc-card-contrast rounded-[1.4rem] p-5">
                <p className="theme-shell-kicker mono-label text-[0.56rem]">
                  Deliverable preview
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
                  <ExportKeyValue
                    label="Output"
                    value="Phase 1 demo narrative"
                  />
                </div>
              </div>

              <div className="theme-doc-card-muted rounded-[1.4rem] p-5">
                <p className="theme-doc-subtle mono-label text-[0.56rem]">
                  Included in this handoff
                </p>
                <div className="mt-4 grid gap-2">
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
                        {section.requirementCount === 1 ? "" : "s"} grouped
                        here.
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>

        <aside className="premium-panel-strong h-fit rounded-[1.75rem] p-5 sm:p-6">
          <p className="theme-shell-kicker mono-label text-[0.68rem]">
            Download
          </p>
          <h4 className="theme-shell-title mt-3 text-3xl font-bold tracking-[-0.04em]">
            Ready to hand off
          </h4>
          <p className="theme-shell-body mt-3 text-sm leading-7">
            Download the Markdown deliverable for the Phase 1 demo review. This
            is the completion point for the current workflow.
          </p>

          <div className="theme-shell-card mt-5 rounded-[1.4rem] p-4 text-sm leading-6 theme-shell-body">
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
              <span className="theme-shell-title font-bold">Scope:</span> Phase
              1 only, with consultant-reviewed content and traceability.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() =>
                downloadDemoScriptMarkdown({
                  assembly,
                  projectMetadata,
                })
              }
              className="focus-premium theme-button-primary rounded-2xl px-4 py-3 text-sm font-bold transition"
            >
              Download Markdown
            </button>
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

          <p className="theme-shell-card-soft theme-shell-body mt-5 rounded-xl border-dashed px-4 py-3 text-sm leading-6">
            Phase 2 is optional and stays outside this handoff. Phase 1 is
            complete once this reviewed document is exported.
          </p>
        </aside>
      </div>
    </section>
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
      className="focus-premium theme-doc-button-secondary rounded-full px-3 py-1.5 text-[0.7rem] font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
    >
      Move {direction}
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
    <section className="theme-doc-card-muted mt-5 rounded-[1.5rem] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="theme-doc-subtle mono-label text-[0.58rem]">
            {step.groupLabel}
          </p>
          <label className="mt-2 block">
            <span className="sr-only">Step title</span>
            <input
              value={resolveStepTitle(draft, step)}
              onChange={(event) =>
                onDraftAction({
                  type: "editStep",
                  stepKey: step.key,
                  title: event.currentTarget.value,
                  note: resolveStepNote(draft, step),
                })
              }
              className="focus-premium theme-doc-title w-full rounded-xl border border-transparent bg-transparent px-0 py-0 text-lg font-bold transition focus:border-[color:var(--document-border)] focus:bg-[color:var(--document-soft-surface)] focus:px-3 focus:py-2"
            />
          </label>
          <p className="theme-doc-subtle mt-2 text-sm leading-6">
            {step.traceability.requirementId} · Excel row{" "}
            {step.traceability.sourceRowNumber} ·{" "}
            {step.sourceDemoStep.reviewStatus}
          </p>
        </div>
        <div className="theme-doc-chip rounded-full px-3 py-1.5 text-xs font-bold theme-doc-subtle">
          {step.confidence.level} confidence
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="block">
          <span className="theme-doc-subtle mono-label text-[0.58rem]">
            Step note
          </span>
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
            className="focus-premium theme-doc-input mt-2 min-h-24 w-full rounded-2xl p-3 text-sm leading-6"
          />
        </label>

        <div className="theme-doc-card rounded-[1.25rem] p-4">
          <p className="theme-doc-subtle mono-label text-[0.58rem]">
            Demo instructions
          </p>
          <ol className="theme-doc-title mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
            {step.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </div>

        <details className="theme-doc-card rounded-[1.25rem] p-4">
          <summary className="theme-doc-title cursor-pointer text-sm font-bold">
            Evidence and context
          </summary>
          <div className="mt-4 grid gap-4">
            <div>
              <p className="theme-doc-subtle mono-label text-[0.58rem]">
                Current comment
              </p>
              <p className="theme-doc-title mt-2 whitespace-pre-wrap text-sm leading-6">
                {step.currentComment}
              </p>
            </div>
            <div>
              <p className="theme-doc-subtle mono-label text-[0.58rem]">
                Generated source comment
              </p>
              <p className="theme-doc-body mt-2 whitespace-pre-wrap text-sm leading-6">
                {step.generatedComment}
              </p>
            </div>
            <ScriptDetailList label="Assumptions" items={step.assumptions} />
            <ScriptDetailList label="Warnings" items={step.warnings} />
            <div>
              <p className="theme-doc-subtle mono-label text-[0.58rem]">
                Traceability
              </p>
              <div className="theme-doc-body mt-2 flex flex-wrap gap-2 text-xs font-bold">
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
                <p className="theme-doc-subtle mono-label text-[0.58rem]">
                  Source references
                </p>
                <ul className="mt-2 grid gap-2">
                  {step.sourceReferences.map((reference) => (
                    <li
                      key={reference.id}
                      className="theme-doc-card rounded-2xl p-3 text-sm leading-6 theme-doc-body"
                    >
                      <span className="theme-doc-title font-bold">
                        {reference.kind}
                      </span>
                      :{" "}
                      {reference.url ? (
                        <a
                          href={reference.url}
                          rel="noreferrer"
                          target="_blank"
                          className="theme-doc-link font-bold underline underline-offset-4"
                        >
                          {reference.label}
                        </a>
                      ) : (
                        <span className="theme-doc-title font-bold">
                          {reference.label}
                        </span>
                      )}
                      . {reference.note}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
      </div>
    </section>
  );
}

function ScriptSummaryCard({
  helper,
  label,
  value,
}: {
  helper: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className="theme-shell-card-soft rounded-xl p-4">
      <p className="theme-shell-subtle mono-label text-[0.56rem]">{label}</p>
      <p className="theme-shell-title mt-2 text-3xl font-black tracking-[-0.05em]">
        {value}
      </p>
      <p className="theme-shell-body mt-2 text-sm leading-6">{helper}</p>
    </div>
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
  return (
    <span className="theme-doc-chip-brand rounded-full px-3 py-1">{label}</span>
  );
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
      <p className="theme-doc-subtle mono-label text-[0.58rem]">{label}</p>
      {items.length > 0 ? (
        <ul className="theme-doc-body mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="theme-doc-body mt-2 text-sm leading-6">
          No {label.toLowerCase()} recorded.
        </p>
      )}
    </div>
  );
}
