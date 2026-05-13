"use client";

import { useState } from "react";
import {
  masterDataObjectTypeLabels,
  masterDataObjectTypes,
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
  const availableObjectTypes = masterDataObjectTypes.filter(
    (objectType) => objectGroups[objectType].length > 0,
  );
  const [activeObjectType, setActiveObjectType] = useState(
    availableObjectTypes[0] ?? "enterprise",
  );
  const [activeObjectId, setActiveObjectId] = useState<string | null>(
    objectGroups[availableObjectTypes[0] ?? "enterprise"]?.[0]?.objectId ?? null,
  );
  const resolvedActiveObjectType = availableObjectTypes.includes(activeObjectType)
    ? activeObjectType
    : (availableObjectTypes[0] ?? "enterprise");
  const visibleObjects = objectGroups[resolvedActiveObjectType] ?? [];
  const activeObject =
    visibleObjects.find((objectDraft) => objectDraft.objectId === activeObjectId) ??
    visibleObjects[0] ??
    null;
  const allApproved = Object.values(objectGroups)
    .flat()
    .every((objectDraft) => objectDraft.reviewStatus === "approved");

  return (
    <section className="grid gap-6">
      <section className="phase-section-card">
        <div className="phase-section-copy">
          <p className="phase-overline">Master Data review</p>
          <h2 className="phase-section-title">
            Approve the generated objects before export.
          </h2>
          <p className="phase-section-body">
            Edit field values directly, keep warnings visible, and only move to
            export once the selected package is clear enough for an MES owner to
            validate outside the app.
          </p>
        </div>
      </section>

      {activeObject ? (
        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="phase-rail">
            <section className="phase-rail-card grid gap-4">
              <div>
                <p className="phase-overline">Object types</p>
                <h3 className="phase-rail-title">Review queue</h3>
              </div>

              <div className="grid gap-2">
                {availableObjectTypes.map((objectType) => (
                  <button
                    key={objectType}
                    type="button"
                    onClick={() => {
                      setActiveObjectType(objectType);
                      setActiveObjectId(objectGroups[objectType][0]?.objectId ?? null);
                    }}
                    className={`theme-shell-card rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                      objectType === resolvedActiveObjectType
                        ? "theme-shell-card-active"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>{masterDataObjectTypeLabels[objectType]}</span>
                      <span className="shell-chip shell-chip-neutral">
                        {objectGroups[objectType].length}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="phase-sidebar-panel">
                <div className="phase-sidebar-copy">
                  <p className="phase-overline">Objects</p>
                  <h4 className="theme-shell-title text-base font-semibold">
                    {masterDataObjectTypeLabels[resolvedActiveObjectType]}
                  </h4>
                </div>

                <div className="grid gap-2">
                  {visibleObjects.map((objectDraft) => (
                    <button
                      key={objectDraft.objectId}
                      type="button"
                      onClick={() => setActiveObjectId(objectDraft.objectId)}
                      className={`theme-shell-card rounded-2xl px-4 py-3 text-left transition ${
                        objectDraft.objectId === activeObject.objectId
                          ? "theme-shell-card-active"
                          : ""
                      }`}
                    >
                      <strong className="block text-sm">{objectDraft.name}</strong>
                      <span className="mt-1 block text-xs text-[color:var(--shell-subtle)]">
                        {objectDraft.reviewStatus}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </aside>

          <div className="grid gap-6">
            <section className="phase-section-card">
              <div className="phase-toolbar">
                <div className="phase-toolbar-copy">
                  <p className="phase-overline">Active object</p>
                  <h3 className="phase-section-title">{activeObject.name}</h3>
                  <p className="phase-section-body">
                    Review the editable fields, confirm the requirement links,
                    and mark the object approved only when the package looks safe.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateReviewStatus(activeObject.objectId, "pending")
                    }
                    className="focus-premium theme-shell-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
                  >
                    Mark pending
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateReviewStatus(activeObject.objectId, "review")
                    }
                    className="focus-premium theme-shell-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
                  >
                    Needs review
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateReviewStatus(activeObject.objectId, "approved")
                    }
                    className="focus-premium theme-button-primary rounded-2xl px-4 py-3 text-sm font-semibold transition"
                  >
                    Approve object
                  </button>
                </div>
              </div>

              <div className="phase-inline-metrics">
                <span>
                  <strong>{activeObject.sourceRequirementKeys.length}</strong> source rows
                </span>
                <span>
                  <strong>{activeObject.fields.length}</strong> fields
                </span>
                <span>
                  <strong>{activeObject.confidence.level}</strong> confidence
                </span>
                <span>
                  <strong>{activeObject.reviewStatus}</strong> status
                </span>
              </div>

              {activeObject.warnings.length > 0 ? (
                <div className="mt-6 grid gap-3">
                  {activeObject.warnings.map((warning) => (
                    <div
                      key={warning}
                      className="rounded-2xl border px-4 py-3 text-sm tone-warning"
                    >
                      {warning}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="phase-section-card">
              <div className="grid gap-4 md:grid-cols-2">
                {activeObject.fields.map((field) => (
                  <label key={field.key} className="grid gap-2 text-sm">
                    <span className="font-semibold text-[color:var(--shell-ink)]">
                      {field.label}
                    </span>
                    <input
                      value={field.value}
                      onChange={(event) =>
                        onUpdateField(
                          activeObject.objectId,
                          field.key,
                          event.currentTarget.value,
                        )
                      }
                      className="focus-premium theme-shell-input rounded-2xl px-4 py-3"
                    />
                    <span className="text-xs text-[color:var(--shell-subtle)]">
                      {field.source === "manual"
                        ? "Edited in review"
                        : `Current source: ${field.source}`}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="phase-section-card">
              <div className="phase-toolbar">
                <div className="phase-toolbar-copy">
                  <p className="phase-overline">Next actions</p>
                  <h3 className="phase-section-title">Finish the package</h3>
                  <p className="phase-section-body">
                    Keep traceability available during review, and only open
                    export when every object that matters has an explicit
                    approval decision.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onOpenTraceability}
                    className="focus-premium theme-shell-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
                  >
                    Open traceability
                  </button>
                  <button
                    type="button"
                    onClick={onReturnToProcess}
                    className="focus-premium theme-shell-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
                  >
                    Back to process
                  </button>
                  <button
                    type="button"
                    onClick={onOpenExport}
                    disabled={!allApproved}
                    className="focus-premium theme-button-primary rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Open export
                  </button>
                </div>
              </div>
            </section>
          </div>
        </section>
      ) : (
        <section className="phase-empty-state">
          <p className="phase-overline">No generated objects</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            Finish processing before review
          </h3>
          <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
            The object review surface becomes available once the setup and
            processing steps have created the first Master Data draft package.
          </p>
        </section>
      )}
    </section>
  );
}
