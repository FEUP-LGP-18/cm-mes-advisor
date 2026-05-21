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
    allObjects.find((objectDraft) => objectDraft.reviewStatus !== "approved") ??
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
    visibleObjects.find((objectDraft) => objectDraft.objectId === activeObjectId) ??
    visibleObjects[0] ??
    null;
  const activeObjectIndex = activeObject
    ? allObjects.findIndex(
        (objectDraft) => objectDraft.objectId === activeObject.objectId,
      )
    : -1;
  const approvedObjectCount = allObjects.filter(
    (objectDraft) => objectDraft.reviewStatus === "approved",
  ).length;
  const pendingDecisionCount = allObjects.length - approvedObjectCount;
  const allApproved = allObjects.length > 0 && pendingDecisionCount === 0;

  function selectObject(objectDraft: MasterDataDraftObject) {
    setActiveObjectType(objectDraft.objectType);
    setActiveObjectId(objectDraft.objectId);
  }

  function handleApproveAndNextObject() {
    if (!activeObject) {
      return;
    }

    onUpdateReviewStatus(activeObject.objectId, "approved");
    const nextObject = findNextReviewObject(allObjects, activeObject);

    if (nextObject) {
      selectObject(nextObject);
    }
  }

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
        <div className="phase-inline-metrics">
          <span>{allObjects.length} objects</span>
          <span>{approvedObjectCount} approved</span>
          <span>{pendingDecisionCount} need decisions</span>
        </div>
      </section>

      {activeObject ? (
        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="phase-rail">
            <section className="phase-rail-card grid gap-4">
              <div>
                <p className="phase-overline">Object navigation</p>
                <h3 className="phase-rail-title">Review queue</h3>
              </div>

              <div className="grid gap-3">
                {availableObjectTypes.map((objectType) => {
                  const typeObjects = objectGroups[objectType] ?? [];
                  const typeApprovedCount = typeObjects.filter(
                    (objectDraft) => objectDraft.reviewStatus === "approved",
                  ).length;

                  return (
                    <div
                      key={objectType}
                      className="rounded-2xl border border-[color:var(--shell-border)] p-3"
                    >
                      <button
                        type="button"
                        onClick={() => selectObject(typeObjects[0])}
                        className={`focus-premium w-full rounded-xl px-2 py-2 text-left text-sm font-semibold transition ${
                          objectType === resolvedActiveObjectType
                            ? "theme-shell-card-active"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{masterDataObjectTypeLabels[objectType]}</span>
                          <span className="shell-chip shell-chip-neutral">
                            {typeApprovedCount}/{typeObjects.length} approved
                          </span>
                        </div>
                      </button>
                      <div className="mt-2 grid gap-2">
                        {typeObjects.map((objectDraft) => (
                          <button
                            key={objectDraft.objectId}
                            type="button"
                            onClick={() => selectObject(objectDraft)}
                            className={`focus-premium rounded-xl border px-3 py-2.5 text-left transition ${
                              objectDraft.objectId === activeObject.objectId
                                ? "theme-shell-card-active"
                                : "theme-shell-card-soft"
                            }`}
                          >
                            <strong className="block text-sm">
                              {objectDraft.name}
                            </strong>
                            <span className="mt-1 block text-xs text-[color:var(--shell-subtle)]">
                              {formatReviewStatus(objectDraft.reviewStatus)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
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

                <div className="grid gap-3 sm:min-w-[240px]">
                  <p className="phase-overline">Review decision</p>
                  <button
                    type="button"
                    onClick={handleApproveAndNextObject}
                    className="focus-premium theme-button-primary rounded-2xl px-4 py-3 text-sm font-semibold transition"
                  >
                    Approve and next object
                  </button>
                  <div className="grid gap-2 sm:grid-cols-2">
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
                  </div>
                </div>
              </div>

              <div className="phase-inline-metrics">
                <span>
                  {activeObjectIndex + 1} of {allObjects.length} objects
                </span>
                <span>{pendingDecisionCount} need decisions</span>
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
                  <strong>{formatReviewStatus(activeObject.reviewStatus)}</strong> status
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

function findNextReviewObject(
  objects: MasterDataDraftObject[],
  activeObject: MasterDataDraftObject,
) {
  const activeIndex = objects.findIndex(
    (objectDraft) => objectDraft.objectId === activeObject.objectId,
  );
  const isNextCandidate = (objectDraft: MasterDataDraftObject) =>
    objectDraft.objectId !== activeObject.objectId &&
    objectDraft.reviewStatus !== "approved";
  const nextAfterCurrent = objects
    .slice(activeIndex + 1)
    .find(isNextCandidate);

  return nextAfterCurrent ?? objects.find(isNextCandidate) ?? null;
}

function formatReviewStatus(status: MasterDataReviewStatus) {
  switch (status) {
    case "approved":
      return "Approved";
    case "pending":
      return "Pending";
    case "review":
      return "Needs review";
  }
}
