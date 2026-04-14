"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  buildReviewRequirements,
  createRequirementsReviewState,
  filterReviewRequirements,
  requirementReviewFilters,
  summarizeReviewRequirements,
  updateRequirementsReviewState,
  type RequirementReviewAction,
  type RequirementReviewFilter,
  type RequirementReviewStatus,
  type ReviewProjectMetadata,
  type ReviewRequirement,
} from "@/lib/requirements/review";
import type { ParsedRequirement } from "@/lib/requirements/parser";
import {
  CUSTOMER_X_REVIEW_STORAGE_KEY,
  loadRequirementsReviewState,
  parseRequirementsReviewState,
  saveRequirementsReviewState,
} from "@/lib/requirements/review-storage";

const filterLabels: Record<RequirementReviewFilter, string> = {
  all: "All rows",
  demo: "Demo rows",
  mvp: "MVP rows",
  pending: "Pending rows",
  review: "Review rows",
  approved: "Approved rows",
  skipped: "Skipped rows",
};

const filterDescriptions: Record<RequirementReviewFilter, string> = {
  all: "All parsed requirements from the fixture.",
  demo: "Rows marked for demo in the source Excel file.",
  mvp: "Rows marked as MVP in the source Excel file.",
  pending: "Rows waiting for review actions or future AI drafts.",
  review: "Rows flagged for consultant review or workaround decisions.",
  approved: "Rows accepted for the Phase 1 demo-script flow.",
  skipped: "Rows intentionally left out of the current review slice.",
};

const statusStyles: Record<RequirementReviewStatus, string> = {
  pending: "border-[#d0d7de] bg-[#f7f9fa] text-[#30363d]",
  review: "border-[#f59e0b] bg-[#fff7ed] text-[#92400e]",
  approved: "border-[#0f766e] bg-[#e8f4f1] text-[#0f5132]",
  skipped: "border-[#8b949e] bg-[#f3f4f6] text-[#4b5563]",
};

const reviewStorageChangeEventName = "cm-mes-advisor:review-state-change";

interface RequirementsReviewWorkspaceProps {
  projectMetadata: ReviewProjectMetadata;
  requirements: ParsedRequirement[];
}

export default function RequirementsReviewWorkspace({
  projectMetadata,
  requirements,
}: RequirementsReviewWorkspaceProps) {
  const fallbackReviewState = useMemo(
    () => createRequirementsReviewState(projectMetadata),
    [projectMetadata],
  );
  const reviewStorageSnapshot = useSyncExternalStore(
    subscribeReviewStorage,
    readReviewStorageSnapshot,
    getServerReviewStorageSnapshot,
  );
  const reviewState = useMemo(
    () =>
      parseRequirementsReviewState(reviewStorageSnapshot, fallbackReviewState),
    [fallbackReviewState, reviewStorageSnapshot],
  );
  const [activeFilter, setActiveFilter] =
    useState<RequirementReviewFilter>("all");
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(
    null,
  );

  const reviewRequirements = useMemo(
    () => buildReviewRequirements(requirements, reviewState.requirements),
    [requirements, reviewState.requirements],
  );
  const summary = useMemo(
    () => summarizeReviewRequirements(reviewRequirements),
    [reviewRequirements],
  );
  const filteredRequirements = useMemo(
    () => filterReviewRequirements(reviewRequirements, activeFilter),
    [activeFilter, reviewRequirements],
  );
  const selectedRequirement =
    reviewRequirements.find(
      (requirement) => requirement.sourceRowNumber === selectedRowNumber,
    ) ?? null;

  function handleReviewAction(
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) {
    const currentState = loadRequirementsReviewState(
      window.localStorage,
      fallbackReviewState,
    );
    const nextState = updateRequirementsReviewState(
      currentState,
      requirement,
      action,
    );

    saveRequirementsReviewState(window.localStorage, nextState);
    window.dispatchEvent(new Event(reviewStorageChangeEventName));
  }

  return (
    <div className="grid gap-6">
      <section
        aria-label="Requirement filters"
        className="grid gap-3 md:grid-cols-3 xl:grid-cols-7"
      >
        {requirementReviewFilters.map((filter) => (
          <button
            key={filter}
            type="button"
            aria-pressed={activeFilter === filter}
            onClick={() => {
              setActiveFilter(filter);
              setSelectedRowNumber(null);
            }}
            className={`min-h-28 rounded-lg border p-4 text-left transition ${
              activeFilter === filter
                ? "border-[#0f766e] bg-[#e8f4f1] text-[#102a27]"
                : "border-[#d0d7de] bg-white text-[#30363d] hover:border-[#8aa8a2]"
            }`}
          >
            <span className="block text-sm font-semibold">
              {filterLabels[filter]}
            </span>
            <span className="mt-2 block text-3xl font-semibold">
              {getFilterCount(summary, filter)}
            </span>
            <span className="mt-2 block text-xs leading-5 text-[#59636e]">
              {filterDescriptions[filter]}
            </span>
          </button>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
        <div className="overflow-hidden rounded-lg border border-[#d0d7de] bg-white">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#d0d7de] p-5">
            <div>
              <h2 className="text-xl font-semibold text-[#111827]">
                Requirements
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#59636e]">
                {filteredRequirements.length} rows in{" "}
                {filterLabels[activeFilter].toLowerCase()}. Select one
                requirement to inspect the original Excel data and record local
                review decisions.
              </p>
            </div>
            <p className="rounded-md border border-[#d0d7de] px-3 py-2 text-sm font-semibold text-[#30363d]">
              Local browser state
            </p>
          </div>

          {filteredRequirements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-[#f0f3f3] text-xs uppercase text-[#4b5563]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Excel row</th>
                    <th className="px-4 py-3 font-semibold">Requirement</th>
                    <th className="px-4 py-3 font-semibold">L2 process</th>
                    <th className="px-4 py-3 font-semibold">L3 or operation</th>
                    <th className="px-4 py-3 font-semibold">Demo</th>
                    <th className="px-4 py-3 font-semibold">MVP</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequirements.map((requirement) => {
                    const isSelected =
                      requirement.sourceRowNumber === selectedRowNumber;

                    return (
                      <tr
                        key={requirement.requirementKey}
                        className={`border-t border-[#e5e7eb] ${
                          isSelected ? "bg-[#e8f4f1]" : "bg-white"
                        }`}
                      >
                        <td className="px-4 py-3 align-top font-semibold text-[#0f766e]">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedRowNumber(requirement.sourceRowNumber)
                            }
                            className="rounded-md text-left font-semibold underline-offset-4 hover:underline"
                          >
                            {requirement.requirementId || "No ID"}
                          </button>
                        </td>
                        <td className="px-4 py-3 align-top text-[#30363d]">
                          {requirement.sourceRowNumber}
                        </td>
                        <td className="max-w-lg px-4 py-3 align-top leading-6 text-[#1f2937]">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedRowNumber(requirement.sourceRowNumber)
                            }
                            className="rounded-md text-left underline-offset-4 hover:underline"
                          >
                            {emptyValue(requirement.requirementDescription)}
                          </button>
                        </td>
                        <td className="px-4 py-3 align-top text-[#30363d]">
                          {emptyValue(requirement.l2Process)}
                        </td>
                        <td className="px-4 py-3 align-top text-[#30363d]">
                          {emptyValue(
                            requirement.l3Process || requirement.operation,
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <FlagBadge active={requirement.demo} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <FlagBadge active={requirement.mvp} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <StatusBadge status={requirement.reviewStatus} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyFilterState filter={activeFilter} />
          )}
        </div>

        <RequirementDetail
          onReviewAction={handleReviewAction}
          requirement={selectedRequirement}
        />
      </section>
    </div>
  );
}

function getFilterCount(
  summary: ReturnType<typeof summarizeReviewRequirements>,
  filter: RequirementReviewFilter,
): number {
  switch (filter) {
    case "all":
      return summary.allCount;
    case "demo":
      return summary.demoCount;
    case "mvp":
      return summary.mvpCount;
    case "pending":
      return summary.pendingCount;
    case "review":
      return summary.reviewCount;
    case "approved":
      return summary.approvedCount;
    case "skipped":
      return summary.skippedCount;
  }
}

function RequirementDetail({
  onReviewAction,
  requirement,
}: {
  onReviewAction: (
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) => void;
  requirement: ReviewRequirement | null;
}) {
  if (!requirement) {
    return (
      <aside className="min-h-[420px] rounded-lg border border-dashed border-[#a8b3bd] bg-white p-6">
        <p className="text-sm font-semibold uppercase text-[#0f766e]">
          No row selected
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[#111827]">
          Select a requirement to inspect details
        </h2>
        <p className="mt-4 leading-7 text-[#4b5563]">
          Choose any row from the requirements list to review the full parsed
          Excel values, including the original source comment. Epic 3 adds local
          notes, review status actions, skip handling, and refresh-safe
          prototype persistence.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-[#d0d7de] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[#0f766e]">
            Requirement details
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
            {requirement.requirementId || "No requirement ID"}
          </h2>
        </div>
        <StatusBadge status={requirement.reviewStatus} />
      </div>

      <ReviewActionsPanel
        onReviewAction={onReviewAction}
        requirement={requirement}
      />

      <dl className="mt-6 grid gap-4">
        <DetailField label="Source Excel row">
          {requirement.sourceRowNumber}
        </DetailField>
        <DetailField label="Requirement description">
          {emptyValue(requirement.requirementDescription)}
        </DetailField>
        <DetailField label="L2 process">
          {emptyValue(requirement.l2Process)}
        </DetailField>
        <DetailField label="L3 process">
          {emptyValue(requirement.l3Process)}
        </DetailField>
        <DetailField label="Operation">
          {emptyValue(requirement.operation)}
        </DetailField>
        <DetailField label="Demo raw / normalized">
          {emptyValue(requirement.demoRaw)} / {formatBoolean(requirement.demo)}
        </DetailField>
        <DetailField label="MVP raw / normalized">
          {emptyValue(requirement.mvpRaw)} / {formatBoolean(requirement.mvp)}
        </DetailField>
        <DetailField label="Priority fields">
          EMS: {emptyValue(requirement.prioEms)}; CWS:{" "}
          {emptyValue(requirement.prioCws)}
        </DetailField>
        <DetailField label="Availability fields">
          Availability: {emptyValue(requirement.availability)}; CM:{" "}
          {emptyValue(requirement.availabilityCm)}
        </DetailField>
        <DetailField label="Description availability">
          {emptyValue(requirement.descriptionAvailability)}
        </DetailField>
        <DetailField label="Supported percentage">
          {emptyValue(requirement.supportedPercent)}
        </DetailField>
        <DetailField label="Source comment from Excel, not AI output">
          {emptyValue(requirement.sourceComment)}
        </DetailField>
      </dl>
    </aside>
  );
}

function ReviewActionsPanel({
  onReviewAction,
  requirement,
}: {
  onReviewAction: (
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) => void;
  requirement: ReviewRequirement;
}) {
  return (
    <section className="mt-6 rounded-lg border border-[#d0d7de] bg-[#f8fbfb] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#111827]">
            Consultant review state
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#4b5563]">
            No AI output is generated yet. These fields are local prototype
            notes for Epic 3 and stay separate from the original Excel comment.
          </p>
        </div>
        <span className="rounded-md border border-[#d0d7de] bg-white px-2 py-1 text-xs font-semibold text-[#59636e]">
          Auto-saved locally
        </span>
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase text-[#59636e]">
          Manual consultant comment
        </span>
        <textarea
          value={requirement.consultantComment}
          onChange={(event) =>
            onReviewAction(requirement, {
              type: "edit",
              consultantComment: event.currentTarget.value,
            })
          }
          placeholder="Add a draft comment or workaround note. Future AI drafts will arrive in a later epic."
          className="mt-2 min-h-28 w-full rounded-md border border-[#c9d3d1] bg-white p-3 text-sm leading-6 text-[#1f2937] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#b7d7d1]"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase text-[#59636e]">
          Review note or reason
        </span>
        <textarea
          value={requirement.reviewNote}
          onChange={(event) =>
            onReviewAction(requirement, {
              type: "edit",
              reviewNote: event.currentTarget.value,
            })
          }
          placeholder="For example: needs Rui/MCP confirmation, workaround required, or not part of this demo slice."
          className="mt-2 min-h-20 w-full rounded-md border border-[#c9d3d1] bg-white p-3 text-sm leading-6 text-[#1f2937] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#b7d7d1]"
        />
      </label>

      <div className="mt-4 rounded-md border border-dashed border-[#a8b3bd] bg-white p-3 text-sm leading-6 text-[#4b5563]">
        Generated output placeholder:{" "}
        {requirement.generatedOutput.hasGeneratedOutput
          ? "available"
          : "not generated yet"}
        . Reset clears local manual edits and returns the row to pending; it
        never copies over or changes the source Excel comment.
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <ReviewActionButton
          label="Approve"
          onClick={() => onReviewAction(requirement, { type: "approve" })}
          tone="approve"
        />
        <ReviewActionButton
          label="Flag for review"
          onClick={() => onReviewAction(requirement, { type: "flag" })}
          tone="review"
        />
        <ReviewActionButton
          label="Skip"
          onClick={() => onReviewAction(requirement, { type: "skip" })}
          tone="neutral"
        />
        <ReviewActionButton
          label="Reset to draft"
          onClick={() => onReviewAction(requirement, { type: "resetToDraft" })}
          tone="neutral"
        />
      </div>
    </section>
  );
}

function ReviewActionButton({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone: "approve" | "review" | "neutral";
}) {
  const toneClass =
    tone === "approve"
      ? "border-[#0f766e] bg-[#0f766e] text-white hover:bg-[#0c5f59]"
      : tone === "review"
        ? "border-[#f59e0b] bg-[#fff7ed] text-[#92400e] hover:bg-[#ffedd5]"
        : "border-[#d0d7de] bg-white text-[#30363d] hover:bg-[#f3f4f6]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${toneClass}`}
    >
      {label}
    </button>
  );
}

function DetailField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="border-t border-[#e5e7eb] pt-4">
      <dt className="text-xs font-semibold uppercase text-[#59636e]">
        {label}
      </dt>
      <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#1f2937]">
        {children}
      </dd>
    </div>
  );
}

function EmptyFilterState({ filter }: { filter: RequirementReviewFilter }) {
  const emptyCopy =
    filter === "review" || filter === "approved" || filter === "skipped"
      ? "Use the row detail panel actions to move requirements into this review state."
      : "No source rows match this fixture-backed filter.";

  return (
    <div className="p-8">
      <p className="text-sm font-semibold uppercase text-[#0f766e]">
        Empty filter
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
        No {filterLabels[filter].toLowerCase()} yet
      </h2>
      <p className="mt-4 max-w-2xl leading-7 text-[#4b5563]">{emptyCopy}</p>
    </div>
  );
}

function FlagBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex min-w-16 justify-center rounded-md border px-2 py-1 text-xs font-semibold ${
        active
          ? "border-[#0f766e] bg-[#e8f4f1] text-[#0f5132]"
          : "border-[#d0d7de] bg-[#f7f9fa] text-[#59636e]"
      }`}
    >
      {formatBoolean(active)}
    </span>
  );
}

function StatusBadge({ status }: { status: RequirementReviewStatus }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function formatBoolean(value: boolean): string {
  return value ? "Yes" : "No";
}

function emptyValue(value: string | null | undefined): string {
  return value?.trim() || "Not provided";
}

function subscribeReviewStorage(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(reviewStorageChangeEventName, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(reviewStorageChangeEventName, onStoreChange);
  };
}

function readReviewStorageSnapshot(): string {
  try {
    return window.localStorage.getItem(CUSTOMER_X_REVIEW_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function getServerReviewStorageSnapshot(): string {
  return "";
}
