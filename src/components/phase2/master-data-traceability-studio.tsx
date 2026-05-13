"use client";

import { useMemo, useState } from "react";
import { masterDataObjectTypeLabels, type MasterDataTraceabilityRecord } from "@/lib/master-data/types";

export function filterMasterDataTraceabilityRecords(
  records: MasterDataTraceabilityRecord[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return records;
  }

  return records.filter((record) =>
    [
      record.requirementId,
      record.objectName,
      record.objectType,
      record.fieldLabel,
      record.value,
      record.note,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

export default function MasterDataTraceabilityStudio({
  onReturnToExport,
  records,
}: {
  onReturnToExport: () => void;
  records: MasterDataTraceabilityRecord[];
}) {
  const [query, setQuery] = useState("");
  const filteredRecords = useMemo(
    () => filterMasterDataTraceabilityRecords(records, query),
    [query, records],
  );
  const hasTraceability = records.length > 0;
  const hasVisibleTraceability = filteredRecords.length > 0;

  return (
    <section className="grid gap-6">
      <section className="phase-section-card">
        <div className="phase-toolbar">
          <div className="phase-toolbar-copy">
            <p className="phase-overline">Traceability</p>
            <h2 className="phase-section-title">
              Keep the requirement-to-object audit trail visible.
            </h2>
            <p className="phase-section-body">
              Search by requirement, object, field, or value whenever you need
              to explain where a specific package entry came from.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search requirement, object, field, or value..."
              className="focus-premium theme-shell-input min-w-[280px] rounded-2xl px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={onReturnToExport}
              className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
            >
              Back to export
            </button>
          </div>
        </div>
      </section>

      <section className="phase-section-card overflow-hidden">
        {!hasTraceability ? (
          <div className="phase-empty-state">
            <p className="phase-overline">No traceability links yet</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              Export creates the audit trail after approved drafts exist.
            </h3>
            <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
              Return to export after the generated Master Data objects are
              reviewed and the draft package has enough links to inspect.
            </p>
          </div>
        ) : !hasVisibleTraceability ? (
          <div className="phase-empty-state">
            <p className="phase-overline">No matches</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              No traceability rows match that search.
            </h3>
            <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
              Try a requirement ID, object name, field label, source type, or
              generated value from the package.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="theme-shell-table w-full text-left text-sm">
              <thead className="theme-shell-table-head">
                <tr>
                  <th className="px-4 py-3 font-semibold">Requirement</th>
                  <th className="px-4 py-3 font-semibold">Object</th>
                  <th className="px-4 py-3 font-semibold">Field</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.traceId} className="theme-shell-table-row">
                    <td className="px-4 py-3 align-top">
                      <div className="grid gap-1">
                        <strong>{record.requirementId || "No ID"}</strong>
                        <span className="text-xs text-[color:var(--shell-subtle)]">
                          Row {record.sourceRowNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="grid gap-1">
                        <strong>{record.objectName}</strong>
                        <span className="text-xs text-[color:var(--shell-subtle)]">
                          {masterDataObjectTypeLabels[record.objectType]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">{record.fieldLabel}</td>
                    <td className="px-4 py-3 align-top">{record.source}</td>
                    <td className="px-4 py-3 align-top">{record.value}</td>
                    <td className="px-4 py-3 align-top text-[color:var(--shell-muted)]">
                      {record.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
