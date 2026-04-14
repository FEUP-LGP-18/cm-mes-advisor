"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  filterReviewRequirements,
  requirementReviewFilters,
  type RequirementReviewFilter,
  type RequirementsReviewSummary,
  type ReviewRequirement,
} from "@/lib/requirements/review";

const filterLabels: Record<RequirementReviewFilter, string> = {
  all: "All rows",
  demo: "Demo rows",
  mvp: "MVP rows",
  pending: "Pending rows",
  review: "Review rows",
  approved: "Approved rows",
};

const filterDescriptions: Record<RequirementReviewFilter, string> = {
  all: "All parsed requirements from the fixture.",
  demo: "Rows marked for demo in the source Excel file.",
  mvp: "Rows marked as MVP in the source Excel file.",
  pending: "Rows waiting for future Epic 3 review actions.",
  review: "Rows that will need review after Epic 3 adds review actions.",
  approved: "Rows that will be approved after Epic 3 adds persistence.",
};

interface RequirementsReviewWorkspaceProps {
  requirements: ReviewRequirement[];
  summary: RequirementsReviewSummary;
}

export default function RequirementsReviewWorkspace({
  requirements,
  summary,
}: RequirementsReviewWorkspaceProps) {
  const [activeFilter, setActiveFilter] =
    useState<RequirementReviewFilter>("all");
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(
    null,
  );

  const filteredRequirements = useMemo(
    () => filterReviewRequirements(requirements, activeFilter),
    [activeFilter, requirements],
  );
  const selectedRequirement =
    filteredRequirements.find(
      (requirement) => requirement.sourceRowNumber === selectedRowNumber,
    ) ?? null;

  return (
    <div className="grid gap-6">
      <section
        aria-label="Requirement filters"
        className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"
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
                requirement to inspect the original Excel data.
              </p>
            </div>
            <p className="rounded-md border border-[#d0d7de] px-3 py-2 text-sm font-semibold text-[#30363d]">
              Read-only until Epic 3
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
                        key={`${requirement.sourceRowNumber}-${requirement.requirementId}`}
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

        <RequirementDetail requirement={selectedRequirement} />
      </section>
    </div>
  );
}

function getFilterCount(
  summary: RequirementsReviewSummary,
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
  }
}

function RequirementDetail({
  requirement,
}: {
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
          Excel values, including the original source comment. Review actions,
          editing, approvals, and persistence arrive in Epic 3.
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
  const futureCopy =
    filter === "review" || filter === "approved"
      ? "Epic 3 will add review actions and persistence before rows can enter this state."
      : "No source rows match this fixture-backed filter.";

  return (
    <div className="p-8">
      <p className="text-sm font-semibold uppercase text-[#0f766e]">
        Empty filter
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
        No {filterLabels[filter].toLowerCase()} yet
      </h2>
      <p className="mt-4 max-w-2xl leading-7 text-[#4b5563]">{futureCopy}</p>
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

function StatusBadge({
  status,
}: {
  status: ReviewRequirement["reviewStatus"];
}) {
  return (
    <span className="inline-flex rounded-md border border-[#d0d7de] bg-[#f7f9fa] px-2 py-1 text-xs font-semibold capitalize text-[#30363d]">
      {status}
    </span>
  );
}

function formatBoolean(value: boolean): string {
  return value ? "Yes" : "No";
}

function emptyValue(value: string): string {
  return value.trim() || "Not provided";
}
