"use client";

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

      <div className="document-panel overflow-hidden rounded-2xl p-5 sm:p-7">
        <div className="flex flex-col gap-5 border-b border-[#17211f]/10 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="mono-label text-[0.68rem] text-[#0f6f62]">
              Script editor
            </p>
            <h3 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.05em] text-[#17211f] sm:text-4xl">
              Shape the consultant-facing narrative
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#45534f]">
              Refine the story before handoff. This step is for naming sections,
              polishing step notes, and checking traceability before the final
              export.
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitchToReview}
            className="focus-premium rounded-2xl border border-[#17211f]/10 bg-white/70 px-4 py-3 text-sm font-bold text-[#17211f] transition hover:bg-white"
          >
            Back to review
          </button>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <label className="block">
            <span className="mono-label text-[0.62rem] text-[#6a7773]">
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
              className="focus-premium mt-2 w-full rounded-2xl border border-[#17211f]/10 bg-white/70 px-4 py-3 text-sm font-bold text-[#17211f] transition focus:bg-white"
            />
          </label>

          <div className="rounded-xl border border-[#17211f]/10 bg-white/55 p-4 text-sm leading-6 text-[#45534f]">
            <p className="mono-label text-[0.58rem] text-[#6a7773]">
              Script context
            </p>
            <p className="mt-2">
              Project:{" "}
              <span className="font-bold text-[#17211f]">
                {projectMetadata.projectName}
              </span>
            </p>
            <p>
              Customer:{" "}
              <span className="font-bold text-[#17211f]">
                {projectMetadata.customerName}
              </span>
            </p>
            <p className="break-all">
              Source:{" "}
              <span className="font-bold text-[#17211f]">
                {projectMetadata.sourceFilename}
              </span>
            </p>
          </div>
        </div>

        {assembly.emptyState ? (
          <EmptyDemoScriptState
            actionLabel="Return to review"
            emptyState={assembly.emptyState}
            onAction={onSwitchToReview}
            titleEyebrow="Script blocked"
          />
        ) : (
          <div className="mt-6 grid gap-5">
            <SectionOrderControls
              draft={draft}
              sections={assembly.sections}
              onDraftAction={onDraftAction}
            />

            <div className="grid gap-4">
              {assembly.sections.map((section) => (
                <DemoScriptSectionCard
                  key={section.key}
                  draft={draft}
                  onDraftAction={onDraftAction}
                  section={section}
                />
              ))}
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="premium-panel-strong min-w-0 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div className="max-w-3xl">
              <p className="mono-label text-[0.68rem] text-[#8fcac0]">
                Export handoff
              </p>
              <h3 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl">
                Finalize the Phase 1 deliverable
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#bdd7d0]">
                The editing work is done. This step confirms what will be in the
                document and gives you one clean download action for the client
                demo handoff.
              </p>
            </div>
            <span className="rounded-full border border-[#2f8f8a]/35 bg-[#2f8f8a]/12 px-3 py-1.5 text-xs font-bold text-[#d2eee7]">
              Markdown ready
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <ExportInfoCard title="Document details">
              <ExportKeyValue
                label="Title"
                value={assembly.title || projectMetadata.projectName}
              />
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
            </ExportInfoCard>

            <ExportInfoCard title="Included in this document">
              <div className="grid gap-2 sm:grid-cols-2">
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
            </ExportInfoCard>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ExportInfoCard title="Included requirements">
              <div className="flex flex-wrap gap-2">
                {overview.includedRequirementIds.slice(0, 12).map((id) => (
                  <span
                    key={id}
                    className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-[#eefcf8]"
                  >
                    {id}
                  </span>
                ))}
                {overview.includedRequirementIds.length > 12 ? (
                  <span className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-[#9fb9b2]">
                    +{overview.includedRequirementIds.length - 12} more
                  </span>
                ) : null}
              </div>
            </ExportInfoCard>

            <ExportInfoCard title="Grouped demo steps">
              <div className="grid gap-2">
                {overview.sectionSummaries.map((section) => (
                  <div
                    key={section.key}
                    className="rounded-xl border border-white/10 bg-black/18 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-white">
                        {section.title}
                      </p>
                      <span className="text-xs font-bold text-[#9fb9b2]">
                        {section.stepCount} steps
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#a9c5be]">
                      {section.requirementCount} approved requirement
                      {section.requirementCount === 1 ? "" : "s"} grouped here.
                    </p>
                  </div>
                ))}
              </div>
            </ExportInfoCard>
          </div>
        </section>

        <aside className="document-panel h-fit rounded-2xl p-5 sm:p-6">
          <p className="mono-label text-[0.68rem] text-[#0f6f62]">Download</p>
          <h4 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#17211f]">
            Ready to hand off
          </h4>
          <p className="mt-3 text-sm leading-7 text-[#45534f]">
            Download the Markdown deliverable for the Phase 1 demo review. This
            is the completion point for the current workflow.
          </p>

          <div className="mt-5 rounded-xl border border-[#17211f]/10 bg-white/70 p-4 text-sm leading-6 text-[#45534f]">
            <p>
              <span className="font-bold text-[#17211f]">Format:</span> Markdown
            </p>
            <p>
              <span className="font-bold text-[#17211f]">Filename:</span>{" "}
              {createDemoScriptExportFilename(
                assembly.title,
                projectMetadata.projectName,
              )}
            </p>
            <p>
              <span className="font-bold text-[#17211f]">Scope:</span> Phase 1
              only, with consultant-reviewed content and traceability.
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
              className="focus-premium rounded-2xl bg-[#0f766e] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0b5f59]"
            >
              Download Markdown
            </button>
            <button
              type="button"
              onClick={onSwitchToScript}
              className="focus-premium rounded-2xl border border-[#17211f]/10 bg-white/70 px-4 py-3 text-sm font-bold text-[#17211f] transition hover:bg-white"
            >
              Back to script
            </button>
            <button
              type="button"
              onClick={onSwitchToReview}
              className="focus-premium rounded-2xl border border-[#17211f]/10 bg-[#17211f]/4 px-4 py-3 text-sm font-bold text-[#45534f] transition hover:bg-[#17211f]/8"
            >
              Back to review
            </button>
          </div>

          <p className="mt-5 rounded-xl border border-dashed border-[#0f766e]/20 bg-[#0f766e]/7 px-4 py-3 text-sm leading-6 text-[#45534f]">
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
    <section className="mt-6 rounded-2xl border border-dashed border-[#0f766e]/35 bg-[#0f766e]/8 p-6">
      <p className="mono-label text-[0.68rem] text-[#0f6f62]">{titleEyebrow}</p>
      <h3 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#17211f]">
        {emptyCopy.title}
      </h3>
      <p className="mt-4 max-w-3xl leading-7 text-[#45534f]">
        {emptyCopy.body}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAction}
          className="focus-premium rounded-2xl bg-[#0f766e] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0b5f59]"
        >
          {actionLabel}
        </button>
        {onSecondaryAction && secondaryActionLabel ? (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="focus-premium rounded-2xl border border-[#17211f]/10 bg-white/70 px-4 py-3 text-sm font-bold text-[#17211f] transition hover:bg-white"
          >
            {secondaryActionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function SectionOrderControls({
  draft,
  onDraftAction,
  sections,
}: {
  draft: DemoScriptDraft;
  onDraftAction: (action: DemoScriptDraftAction) => void;
  sections: DemoScriptSection[];
}) {
  if (sections.length <= 1) {
    return null;
  }

  const currentOrder = sections.map((section) => section.key);

  return (
    <section className="rounded-xl border border-[#17211f]/10 bg-white/55 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-[#17211f]">Section order</h4>
          <p className="mt-2 text-sm leading-6 text-[#45534f]">
            Reorder sections to match the walkthrough. The chosen order is
            stored locally with the review state.
          </p>
        </div>
        <p className="rounded-full border border-[#17211f]/10 bg-white/80 px-3 py-1.5 text-xs font-bold text-[#5d6b67]">
          {draft.sectionOrder.length > 0
            ? "Custom ordering saved"
            : "Using the source order"}
        </p>
      </div>

      <div className="mt-4 grid gap-2">
        {sections.map((section, index) => (
          <div
            key={section.key}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#17211f]/10 bg-white/80 px-4 py-3"
          >
            <div>
              <p className="text-sm font-bold text-[#17211f]">
                {section.title}
              </p>
              <p className="mono-label mt-1 text-[0.56rem] text-[#6a7773]">
                {section.sourceLabel}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  onDraftAction({
                    type: "setSectionOrder",
                    sectionOrder: moveSection(currentOrder, section.key, "up"),
                  })
                }
                disabled={index === 0}
                className="focus-premium rounded-full border border-[#17211f]/10 bg-white px-3 py-1.5 text-xs font-bold text-[#45534f] transition hover:bg-[#edf7f4] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Move up
              </button>
              <button
                type="button"
                onClick={() =>
                  onDraftAction({
                    type: "setSectionOrder",
                    sectionOrder: moveSection(
                      currentOrder,
                      section.key,
                      "down",
                    ),
                  })
                }
                disabled={index === sections.length - 1}
                className="focus-premium rounded-full border border-[#17211f]/10 bg-white px-3 py-1.5 text-xs font-bold text-[#45534f] transition hover:bg-[#edf7f4] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Move down
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DemoScriptSectionCard({
  draft,
  onDraftAction,
  section,
}: {
  draft: DemoScriptDraft;
  onDraftAction: (action: DemoScriptDraftAction) => void;
  section: DemoScriptSection;
}) {
  return (
    <article className="rounded-2xl border border-[#17211f]/10 bg-white/78 p-4 shadow-[0_18px_50px_rgba(23,33,31,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mono-label text-[0.6rem] text-[#0f6f62]">
            {section.sourceLabel}
          </p>
          <label className="mt-2 block">
            <span className="sr-only">Section title</span>
            <input
              value={resolveSectionTitle(draft, section)}
              onChange={(event) =>
                onDraftAction({
                  type: "editSectionTitle",
                  sectionKey: section.key,
                  title: event.currentTarget.value,
                })
              }
              className="focus-premium w-full rounded-xl border border-transparent bg-transparent px-0 py-0 text-2xl font-bold tracking-[-0.04em] text-[#17211f] transition focus:border-[#17211f]/10 focus:bg-white/80 focus:px-3 focus:py-2"
            />
          </label>
          <p className="mt-2 text-sm leading-6 text-[#45534f]">
            {section.subtitle}
          </p>
        </div>
        <div className="rounded-full border border-[#0f766e]/20 bg-[#0f766e]/8 px-3 py-1.5 text-xs font-bold text-[#0f6f62]">
          {section.stepCount} steps
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        {section.steps.map((step) => (
          <DemoScriptStepCard
            key={step.key}
            draft={draft}
            onDraftAction={onDraftAction}
            step={step}
          />
        ))}
      </div>
    </article>
  );
}

function DemoScriptStepCard({
  draft,
  onDraftAction,
  step,
}: {
  draft: DemoScriptDraft;
  onDraftAction: (action: DemoScriptDraftAction) => void;
  step: DemoScriptStep;
}) {
  return (
    <section className="rounded-xl border border-[#17211f]/10 bg-[#fbf8ef] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="mono-label text-[0.58rem] text-[#6a7773]">
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
              className="focus-premium w-full rounded-xl border border-transparent bg-transparent px-0 py-0 text-lg font-bold text-[#17211f] transition focus:border-[#17211f]/10 focus:bg-white/80 focus:px-3 focus:py-2"
            />
          </label>
          <p className="mt-2 text-sm leading-6 text-[#5d6b67]">
            {step.traceability.requirementId} · Excel row{" "}
            {step.traceability.sourceRowNumber} ·{" "}
            {step.sourceDemoStep.reviewStatus}
          </p>
        </div>
        <div className="rounded-full border border-[#17211f]/10 bg-white/80 px-3 py-1.5 text-xs font-bold text-[#5d6b67]">
          {step.confidence.level} confidence
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <p className="mono-label text-[0.58rem] text-[#6a7773]">
            Current comment
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#17211f]">
            {step.currentComment}
          </p>
        </div>
        <div>
          <p className="mono-label text-[0.58rem] text-[#6a7773]">
            Generated source comment
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#45534f]">
            {step.generatedComment}
          </p>
        </div>
        <label className="block">
          <span className="mono-label text-[0.58rem] text-[#6a7773]">
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
            placeholder="Add local prototype notes for this step."
            className="focus-premium mt-2 min-h-20 w-full rounded-2xl border border-[#17211f]/10 bg-white/80 p-3 text-sm leading-6 text-[#17211f] placeholder:text-[#80908b]"
          />
        </label>
        <div>
          <p className="mono-label text-[0.58rem] text-[#6a7773]">
            Demo instructions
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-[#17211f]">
            {step.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </div>
        <ScriptDetailList label="Assumptions" items={step.assumptions} />
        <ScriptDetailList label="Warnings" items={step.warnings} />
        <div>
          <p className="mono-label text-[0.58rem] text-[#6a7773]">
            Traceability
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[#45534f]">
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
            <p className="mono-label text-[0.58rem] text-[#6a7773]">
              Source references
            </p>
            <ul className="mt-2 grid gap-2">
              {step.sourceReferences.map((reference) => (
                <li
                  key={reference.id}
                  className="rounded-2xl border border-[#17211f]/10 bg-white/80 p-3 text-sm leading-6 text-[#45534f]"
                >
                  <span className="font-bold text-[#17211f]">
                    {reference.kind}
                  </span>
                  :{" "}
                  {reference.url ? (
                    <a
                      href={reference.url}
                      rel="noreferrer"
                      target="_blank"
                      className="font-bold text-[#0f6f62] underline decoration-[#0f6f62]/25 underline-offset-4"
                    >
                      {reference.label}
                    </a>
                  ) : (
                    <span className="font-bold text-[#17211f]">
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
    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
      <p className="mono-label text-[0.56rem] text-[#8ea7a0]">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#a9c5be]">{helper}</p>
    </div>
  );
}

function ExportInfoCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/18 p-4">
      <p className="mono-label text-[0.58rem] text-[#8ea7a0]">{title}</p>
      <div className="mt-3 grid gap-3">{children}</div>
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
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8ea7a0]">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold text-white ${
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
        present
          ? "border-[#2f8f8a]/35 bg-[#2f8f8a]/12 text-[#d2eee7]"
          : "border-white/10 bg-white/[0.05] text-[#9fb9b2]"
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
    <span className="rounded-full border border-[#0f766e]/20 bg-[#0f766e]/8 px-3 py-1">
      {label}
    </span>
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
      <p className="mono-label text-[0.58rem] text-[#6a7773]">{label}</p>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#45534f]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-[#45534f]">
          No {label.toLowerCase()} recorded.
        </p>
      )}
    </div>
  );
}
