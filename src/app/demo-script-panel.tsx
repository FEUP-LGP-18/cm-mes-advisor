"use client";

import type {
  DemoScriptAssembly,
  DemoScriptDraft,
  DemoScriptDraftAction,
  DemoScriptSection,
  DemoScriptStep,
} from "@/lib/requirements/demo-script";
import type { ReviewProjectMetadata } from "@/lib/requirements/review";

interface DemoScriptPanelProps {
  assembly: DemoScriptAssembly;
  draft: DemoScriptDraft;
  onDraftAction: (action: DemoScriptDraftAction) => void;
  onSwitchToReview: () => void;
  projectMetadata: ReviewProjectMetadata;
}

export default function DemoScriptPanel({
  assembly,
  draft,
  onDraftAction,
  onSwitchToReview,
  projectMetadata,
}: DemoScriptPanelProps) {
  return (
    <section className="grid gap-5 rounded-lg border border-[#d0d7de] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#d0d7de] pb-5">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-[#0f766e]">
            Demo Script
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
            Assemble the Phase 1 demo script
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#4b5563]">
            Approved requirement drafts become a grouped, traceable demo script.
            Keep the script editable here, then finish the workflow with the
            separate export in Epic 7.
          </p>
          <p className="mt-3 text-sm text-[#59636e]">
            Project:{" "}
            <span className="font-semibold">{projectMetadata.projectName}</span>
            {" · "}Customer:{" "}
            <span className="font-semibold">
              {projectMetadata.customerName}
            </span>
            {" · "}Source:{" "}
            <span className="font-semibold">
              {projectMetadata.sourceFilename}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled
            className="rounded-md border border-[#d0d7de] bg-[#f7f9fa] px-3 py-2 text-sm font-semibold text-[#59636e]"
          >
            Export document comes next in Epic 7
          </button>
          <button
            type="button"
            onClick={onSwitchToReview}
            className="rounded-md border border-[#0f766e] bg-[#0f766e] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0c5f59]"
          >
            Back to review
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          label="Generated drafts"
          value={assembly.generatedRequirementCount}
          helper="Drafts available from the review workflow."
        />
        <StatCard
          label="Approved requirements"
          value={assembly.approvedRequirementCount}
          helper="Approved rows used as script source."
        />
        <StatCard
          label="Demo steps"
          value={assembly.approvedStepCount}
          helper="Ordered steps that can be edited locally."
        />
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase text-[#59636e]">
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
          className="mt-2 w-full rounded-md border border-[#c9d3d1] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#b7d7d1]"
        />
      </label>

      {assembly.emptyState ? (
        <EmptyDemoScriptState
          emptyState={assembly.emptyState}
          onSwitchToReview={onSwitchToReview}
        />
      ) : (
        <div className="grid gap-5">
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

      <div className="rounded-md border border-dashed border-[#a8b3bd] bg-[#f8fbfb] p-4 text-sm leading-6 text-[#4b5563]">
        Phase 2 stays optional here. Approved requirement outputs already give
        you a complete Phase 1 demo script view, and Epic 7 will turn this into
        an exportable document.
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
    <section className="rounded-lg border border-[#d0d7de] bg-[#f8fbfb] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#111827]">
            Section order
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#4b5563]">
            Reorder sections to match the demo narrative. The chosen order is
            stored locally with the rest of the review state.
          </p>
        </div>
        <p className="rounded-md border border-[#d0d7de] bg-white px-2 py-1 text-xs font-semibold text-[#59636e]">
          {draft.sectionOrder.length > 0
            ? "Custom ordering saved"
            : "Using the source order"}
        </p>
      </div>

      <div className="mt-4 grid gap-2">
        {sections.map((section, index) => (
          <div
            key={section.key}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#d0d7de] bg-white px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-[#111827]">
                {section.title}
              </p>
              <p className="text-xs uppercase text-[#59636e]">
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
                className="rounded-md border border-[#d0d7de] bg-white px-3 py-1.5 text-xs font-semibold text-[#30363d] transition hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#a8b3bd]"
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
                className="rounded-md border border-[#d0d7de] bg-white px-3 py-1.5 text-xs font-semibold text-[#30363d] transition hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#a8b3bd]"
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
    <article className="rounded-lg border border-[#d0d7de] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[#0f766e]">
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
              className="w-full rounded-md border border-transparent bg-[#f8fbfb] px-0 py-0 text-xl font-semibold text-[#111827] outline-none transition focus:border-[#c9d3d1] focus:bg-white focus:px-2 focus:py-1 focus:ring-2 focus:ring-[#b7d7d1]"
            />
          </label>
          <p className="mt-2 text-sm leading-6 text-[#4b5563]">
            {section.subtitle}
          </p>
        </div>
        <div className="rounded-md border border-[#d0d7de] bg-[#f8fbfb] px-2 py-1 text-xs font-semibold text-[#59636e]">
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
    <section className="rounded-md border border-[#e5e7eb] bg-[#f8fbfb] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase text-[#59636e]">
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
              className="w-full rounded-md border border-transparent bg-[#f8fbfb] px-0 py-0 text-base font-semibold text-[#111827] outline-none transition focus:border-[#c9d3d1] focus:bg-white focus:px-2 focus:py-1 focus:ring-2 focus:ring-[#b7d7d1]"
            />
          </label>
          <p className="mt-2 text-sm leading-6 text-[#4b5563]">
            {step.traceability.requirementId} · Excel row{" "}
            {step.traceability.sourceRowNumber} ·{" "}
            {step.sourceDemoStep.reviewStatus}
          </p>
        </div>
        <div className="rounded-md border border-[#d0d7de] bg-white px-2 py-1 text-xs font-semibold text-[#59636e]">
          {step.confidence.level} confidence
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-[#59636e]">
            Current comment
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#1f2937]">
            {step.currentComment}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-[#59636e]">
            Generated source comment
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4b5563]">
            {step.generatedComment}
          </p>
        </div>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-[#59636e]">
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
            className="mt-2 min-h-20 w-full rounded-md border border-[#c9d3d1] bg-white p-3 text-sm leading-6 text-[#1f2937] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#b7d7d1]"
          />
        </label>
        <div>
          <p className="text-xs font-semibold uppercase text-[#59636e]">
            Demo instructions
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-[#1f2937]">
            {step.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </div>
        <ScriptDetailList label="Assumptions" items={step.assumptions} />
        <ScriptDetailList label="Warnings" items={step.warnings} />
        <div>
          <p className="text-xs font-semibold uppercase text-[#59636e]">
            Traceability
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[#4b5563]">
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
            <p className="text-xs font-semibold uppercase text-[#59636e]">
              Source references
            </p>
            <ul className="mt-2 grid gap-2">
              {step.sourceReferences.map((reference) => (
                <li
                  key={reference.id}
                  className="rounded-md border border-[#e5e7eb] bg-white p-3 text-sm leading-6 text-[#4b5563]"
                >
                  <span className="font-semibold text-[#1f2937]">
                    {reference.kind}
                  </span>
                  : {reference.label}. {reference.note}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EmptyDemoScriptState({
  emptyState,
  onSwitchToReview,
}: {
  emptyState: DemoScriptAssembly["emptyState"];
  onSwitchToReview: () => void;
}) {
  const emptyCopy = getEmptyStateCopy(emptyState);

  return (
    <section className="rounded-lg border border-dashed border-[#a8b3bd] bg-[#f8fbfb] p-6">
      <p className="text-sm font-semibold uppercase text-[#0f766e]">
        Demo script not ready
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-[#111827]">
        {emptyCopy.title}
      </h3>
      <p className="mt-4 max-w-3xl leading-7 text-[#4b5563]">
        {emptyCopy.body}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSwitchToReview}
          className="rounded-md border border-[#0f766e] bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c5f59]"
        >
          Go to review
        </button>
        <p className="rounded-md border border-[#d0d7de] bg-white px-3 py-2 text-sm font-semibold text-[#59636e]">
          Epic 7 export comes after the script is assembled.
        </p>
      </div>
    </section>
  );
}

function getEmptyStateCopy(emptyState: DemoScriptAssembly["emptyState"]): {
  title: string;
  body: string;
} {
  switch (emptyState) {
    case "no-generated-drafts":
      return {
        title: "Generate drafts before assembling the script",
        body: "No generated drafts are available yet. Use the Review tab to generate drafts for selected requirements, then approve the rows you want to include in the demo script.",
      };
    case "no-approved-drafts":
      return {
        title: "Approve at least one generated draft",
        body: "Generated drafts exist, but none are approved yet. Approve the rows you want to keep in the script, then return here to assemble the Phase 1 demo flow.",
      };
    case "no-demo-steps":
      return {
        title: "Approved drafts exist, but no demo steps were produced",
        body: "The approved draft output does not include demo steps yet. Review the source row, adjust the generated output, or regenerate the draft before the script can be assembled.",
      };
    default:
      return {
        title: "Demo script unavailable",
        body: "The script assembly state could not be determined from the current review data.",
      };
  }
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

function StatCard({
  helper,
  label,
  value,
}: {
  helper: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-[#d0d7de] bg-[#f8fbfb] p-4">
      <p className="text-xs font-semibold uppercase text-[#59636e]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#111827]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#4b5563]">{helper}</p>
    </div>
  );
}

function TraceChip({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-[#d0d7de] bg-[#f7f9fa] px-2 py-1">
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
      <p className="text-xs font-semibold uppercase text-[#59636e]">{label}</p>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#4b5563]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-[#4b5563]">
          No {label.toLowerCase()} recorded.
        </p>
      )}
    </div>
  );
}
