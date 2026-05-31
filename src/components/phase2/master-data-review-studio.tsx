"use client";

import { useState } from "react";
import {
  masterDataObjectTypeLabels,
  masterDataObjectTypes,
  type MasterDataDraftObject,
  type MasterDataPhase2State,
  type MasterDataReviewStatus,
} from "@/lib/master-data/types";

export default function MasterDataReviewStudio({
  onOpenExport,
  onOpenTraceability,
  onReturnToProcess,
  onUpdateField,
  onUpdateReviewStatus,
  phase2,
}: {
  onOpenExport: () => void;
  onOpenTraceability: () => void;
  onReturnToProcess: () => void;
  onUpdateField: (objectId: string, fieldKey: string, value: string) => void;
  onUpdateReviewStatus: (
    objectId: string,
    reviewStatus: MasterDataReviewStatus,
  ) => void;
  phase2: MasterDataPhase2State;
}) {
  const objectGroups = phase2.generatedObjects;
  const allObjects = masterDataObjectTypes.flatMap(
    (objectType) => objectGroups[objectType] ?? [],
  );
  const availableObjectTypes = masterDataObjectTypes.filter(
    (objectType) => objectGroups[objectType].length > 0,
  );
  const initialReviewObject =
    allObjects.find((o) => o.reviewStatus !== "approved") ??
    allObjects[0] ??
    null;
  const [activeObjectType, setActiveObjectType] = useState(
    initialReviewObject?.objectType ?? availableObjectTypes[0] ?? "enterprise",
  );
  const [activeObjectId, setActiveObjectId] = useState<string | null>(
    initialReviewObject?.objectId ?? null,
  );
  const resolvedActiveObjectType = availableObjectTypes.includes(activeObjectType)
    ? activeObjectType
    : (availableObjectTypes[0] ?? "enterprise");
  const visibleObjects = objectGroups[resolvedActiveObjectType] ?? [];
  const activeObject =
    visibleObjects.find((o) => o.objectId === activeObjectId) ??
    visibleObjects[0] ??
    null;
  const activeObjectIndex = activeObject
    ? allObjects.findIndex((o) => o.objectId === activeObject.objectId)
    : -1;
  const approvedCount = allObjects.filter((o) => o.reviewStatus === "approved").length;
  const pendingCount = allObjects.length - approvedCount;
  const allApproved = allObjects.length > 0 && pendingCount === 0;

  function selectObject(o: MasterDataDraftObject) {
    setActiveObjectType(o.objectType);
    setActiveObjectId(o.objectId);
  }

  function handleApproveAndNext() {
    if (!activeObject) return;
    onUpdateReviewStatus(activeObject.objectId, "approved");
    const next = findNextReviewObject(allObjects, activeObject);
    if (next) selectObject(next);
  }

  if (!activeObject) {
    return (
      <div>
        <div style={{ marginBottom: "1.25rem" }}>
          <h1 className="fv-page-title">Review Master Data</h1>
          <p className="fv-page-subtitle">No objects generated yet. Return to the process step to generate Master Data first.</p>
        </div>
        <button type="button" onClick={onReturnToProcess} className="fv-btn-secondary">
          ← Back to Process
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 className="fv-page-title">Review Master Data</h1>
        <p className="fv-page-subtitle">
          {allApproved
            ? `All ${allObjects.length} objects approved. Ready for export.`
            : `${approvedCount} of ${allObjects.length} objects approved — ${pendingCount} remaining.`}
        </p>
      </div>

      {/* All-approved banner */}
      {allApproved ? (
        <div className="fv-callout fv-callout-success" style={{ marginBottom: "1rem" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }} aria-hidden="true">
            <circle cx="8" cy="8" r="6" /><polyline points="5 8 7 10 11 6" />
          </svg>
          All objects approved — you can now proceed to export.
        </div>
      ) : null}

      <div className="fv-review-layout">
        {/* Left: object list */}
        <aside style={{ display: "grid", gap: "0.5rem", alignContent: "start" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.25rem" }}>
            Objects ({allObjects.length})
          </div>

          {availableObjectTypes.map((objectType) => {
            const typeObjects = objectGroups[objectType] ?? [];
            const typeApproved = typeObjects.filter((o) => o.reviewStatus === "approved").length;

            return (
              <div key={objectType}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveObjectType(objectType);
                    if (typeObjects[0]) selectObject(typeObjects[0]);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.375rem 0.5rem",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: objectType === resolvedActiveObjectType ? "var(--brand-primary)" : "var(--muted-fg)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{masterDataObjectTypeLabels[objectType]}</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 400, color: typeApproved === typeObjects.length ? "var(--status-approved)" : "var(--muted-fg)" }}>
                    {typeApproved}/{typeObjects.length}
                  </span>
                </button>
                {typeObjects.map((o) => {
                  const isActive = o.objectId === activeObject.objectId;
                  const statusColor =
                    o.reviewStatus === "approved" ? "var(--status-approved)" :
                    o.reviewStatus === "review" ? "var(--status-flagged)" :
                    "var(--muted-fg)";
                  return (
                    <button
                      key={o.objectId}
                      type="button"
                      onClick={() => selectObject(o)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "0.5rem 0.625rem",
                        marginBottom: "0.125rem",
                        borderRadius: "6px",
                        border: `1px solid ${isActive ? "var(--brand-primary)" : "var(--surface-border)"}`,
                        background: isActive ? "var(--brand-primary-bg, #eff6ff)" : "var(--surface)",
                        cursor: "pointer",
                        display: "block",
                      }}
                    >
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: isActive ? "var(--brand-primary)" : "var(--foreground)" }}>
                        {o.name}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: statusColor, marginTop: "0.125rem" }}>
                        {formatReviewStatus(o.reviewStatus)}
                        {o.warnings.length > 0 ? " · ⚠" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </aside>

        {/* Right: detail panel */}
        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          {/* Object header card */}
          <div className="fv-card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.25rem" }}>
                  {masterDataObjectTypeLabels[activeObject.objectType]} · {activeObjectIndex + 1} of {allObjects.length}
                </div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{activeObject.name}</h2>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  <span className={`fv-conf-${activeObject.confidence.level}`}>{activeObject.confidence.level} confidence</span>
                  <span className={`fv-badge-${activeObject.reviewStatus === "approved" ? "approved" : activeObject.reviewStatus === "review" ? "flagged" : "pending"}`}>
                    {formatReviewStatus(activeObject.reviewStatus)}
                  </span>
                  {activeObject.warnings.length > 0 ? (
                    <span className="fv-badge-flagged">{activeObject.warnings.length} warning{activeObject.warnings.length > 1 ? "s" : ""}</span>
                  ) : null}
                </div>
              </div>

              {/* Review actions */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => onUpdateReviewStatus(activeObject.objectId, "review")}
                  className="fv-btn-secondary"
                  style={{ padding: "0.375rem 0.75rem", fontSize: "0.78rem" }}
                >
                  Flag for Review
                </button>
                <button
                  type="button"
                  onClick={handleApproveAndNext}
                  className="fv-btn-primary"
                  style={{ padding: "0.375rem 0.75rem", fontSize: "0.78rem" }}
                >
                  Approve {pendingCount > 1 ? "& Next →" : "✓"}
                </button>
              </div>
            </div>

            {/* Warnings */}
            {activeObject.warnings.length > 0 ? (
              <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.375rem" }}>
                {activeObject.warnings.map((w) => (
                  <div key={w} className="fv-callout fv-callout-warning" style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}>
                    ⚠ {w}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* AI rationale */}
          {activeObject.confidence.rationale ? (
            <div className="fv-card" style={{ borderLeft: "3px solid var(--brand-primary)" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.375rem" }}>
                AI Rationale
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--foreground)", margin: 0, lineHeight: 1.6 }}>
                {activeObject.confidence.rationale}
              </p>
            </div>
          ) : null}

          {/* Fields */}
          <div className="fv-card">
            <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.75rem" }}>
              Fields ({activeObject.fields.length})
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
              {activeObject.fields.map((field) => (
                <div key={field.key}>
                  <label className="fv-field-label" htmlFor={`field-${activeObject.objectId}-${field.key}`}>
                    {field.label}
                    {field.required ? <span style={{ color: "var(--status-error)" }}> *</span> : null}
                    {field.warning ? <span style={{ marginLeft: "0.25rem", color: "var(--status-flagged)" }}>⚠</span> : null}
                  </label>
                  <input
                    id={`field-${activeObject.objectId}-${field.key}`}
                    className="fv-input"
                    value={field.value}
                    onChange={(e) => onUpdateField(activeObject.objectId, field.key, e.currentTarget.value)}
                  />
                  {field.warning ? (
                    <div style={{ fontSize: "0.7rem", color: "var(--status-flagged)", marginTop: "0.2rem" }}>{field.warning}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Source requirements */}
          {activeObject.sourceRequirementIds.length > 0 ? (
            <div className="fv-card">
              <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.5rem" }}>
                Source Requirements ({activeObject.sourceRequirementIds.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {activeObject.sourceRequirementIds.map((id, index) => {
                  const sourceKey =
                    activeObject.sourceRequirementKeys[index] ??
                    `${id}-${activeObject.sourceRowNumbers[index] ?? index}`;

                  return (
                    <span key={sourceKey} style={{ fontSize: "0.75rem", background: "var(--surface-border)", color: "var(--foreground)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontFamily: "monospace" }}>
                      {id}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Bottom navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={onReturnToProcess}
                className="fv-btn-secondary"
                style={{ fontSize: "0.78rem" }}
              >
                ← Back to Process
              </button>
              <button
                type="button"
                onClick={onOpenTraceability}
                className="fv-btn-secondary"
                style={{ fontSize: "0.78rem" }}
              >
                Traceability
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenExport}
              disabled={!allApproved}
              className="fv-btn-primary"
              style={{ fontSize: "0.78rem", opacity: allApproved ? 1 : 0.5, cursor: allApproved ? "pointer" : "not-allowed" }}
            >
              Proceed to Export →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function findNextReviewObject(
  objects: MasterDataDraftObject[],
  activeObject: MasterDataDraftObject,
) {
  const activeIndex = objects.findIndex((o) => o.objectId === activeObject.objectId);
  const isCandidate = (o: MasterDataDraftObject) =>
    o.objectId !== activeObject.objectId && o.reviewStatus !== "approved";
  return (
    objects.slice(activeIndex + 1).find(isCandidate) ??
    objects.find(isCandidate) ??
    null
  );
}

function formatReviewStatus(status: MasterDataReviewStatus) {
  switch (status) {
    case "approved": return "Approved";
    case "pending": return "Pending";
    case "review": return "Needs Review";
  }
}
