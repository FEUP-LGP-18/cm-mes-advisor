"use client";

import { useMemo, useState } from "react";
import { masterDataObjectTypeLabels, type MasterDataTraceabilityRecord } from "@/lib/master-data/types";

export function filterMasterDataTraceabilityRecords(
  records: MasterDataTraceabilityRecord[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return records;
  return records.filter((record) =>
    [record.requirementId, record.objectName, record.objectType, record.fieldLabel, record.value, record.note]
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

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 className="fv-page-title">Traceability</h1>
        <p className="fv-page-subtitle">
          {records.length > 0
            ? `${records.length} requirement-to-object links. Search by requirement, object, field, or value.`
            : "Export creates the audit trail after approved objects exist."}
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "0.625rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          type="search"
          placeholder="Search requirement, object, field, value…"
          className="fv-search-input"
          style={{ flex: "1 1 280px" }}
        />
        <button
          type="button"
          onClick={onReturnToExport}
          className="fv-btn-secondary"
        >
          ← Back to Export
        </button>
      </div>

      {/* Empty state — no records */}
      {records.length === 0 ? (
        <div className="fv-empty">
          <svg className="fv-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9l-6-6z" />
            <polyline points="9 3 9 9 15 9" />
          </svg>
          <div className="fv-empty-title">No traceability links yet</div>
          <div className="fv-empty-body">
            Return to export after the generated Master Data objects are reviewed and the draft package has been downloaded.
          </div>
          <button
            type="button"
            onClick={onReturnToExport}
            className="fv-btn-secondary"
            style={{ marginTop: "1rem" }}
          >
            ← Back to Export
          </button>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="fv-empty">
          <div className="fv-empty-title">No matches</div>
          <div className="fv-empty-body">
            No traceability rows match &ldquo;{query}&rdquo;. Try a requirement ID, object name, field label, or value.
          </div>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="fv-btn-secondary"
            style={{ marginTop: "1rem" }}
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="fv-table-wrap" style={{ overflowX: "auto" }}>
          <table className="fv-table" style={{ minWidth: "700px" }}>
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Object</th>
                <th>Field</th>
                <th>Source</th>
                <th>Value</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.traceId}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--foreground)" }}>
                      {record.requirementId || "No ID"}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted-fg)", marginTop: "0.1rem" }}>
                      Row {record.sourceRowNumber}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--foreground)" }}>
                      {record.objectName}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted-fg)", marginTop: "0.1rem" }}>
                      {masterDataObjectTypeLabels[record.objectType]}
                    </div>
                  </td>
                  <td className="fv-table-muted">{record.fieldLabel}</td>
                  <td>
                    <span style={{
                      fontSize: "0.72rem", fontFamily: "var(--font-mono), monospace",
                      background: "var(--surface-border)", color: "var(--foreground)",
                      padding: "0.1rem 0.4rem", borderRadius: "4px",
                    }}>
                      {record.source}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "var(--foreground)", maxWidth: "200px" }}>
                    {record.value}
                  </td>
                  <td className="fv-table-muted" style={{ maxWidth: "180px", fontSize: "0.75rem" }}>
                    {record.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredRecords.length > 0 ? (
        <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--muted-fg)" }}>
          Showing {filteredRecords.length} of {records.length} links
        </div>
      ) : null}
    </div>
  );
}
