"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  RequirementReviewAction,
  ReviewRequirement,
} from "@/lib/requirements/review";
import {
  GuidedReviewCard,
  ReviewQueueNavigator,
  ReviewWorkflowStep,
} from "@/app/requirements-review-workspace";

type ExplorerFilter = "all" | "pending" | "review" | "approved" | "skipped";

interface ReviewStudioProps {
  approvedCount: number;
  generatedCount: number;
  generatedReviewableRequirements: ReviewRequirement[];
  onGenerateDemoRows: () => Promise<boolean>;
  onGoToGenerate: () => void;
  onOpenScript: () => void;
  onReviewAction: (
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) => void;
  projectId: string;
  reviewRequirements: ReviewRequirement[];
}

export default function ReviewStudio({
  approvedCount,
  generatedCount,
  generatedReviewableRequirements,
  onGenerateDemoRows,
  onGoToGenerate,
  onOpenScript,
  onReviewAction,
  projectId,
  reviewRequirements,
}: ReviewStudioProps) {
  const selectionStorageKey = `cm-mes-advisor:review-selection:${projectId}`;
  const explorerFilterStorageKey = `cm-mes-advisor:review-explorer-filter:${projectId}`;
  const explorerQueryStorageKey = `cm-mes-advisor:review-explorer-query:${projectId}`;
  const reviewQueue = generatedReviewableRequirements;
  const generatedInventory = useMemo(
    () =>
      reviewRequirements.filter(
        (requirement) =>
          requirement.generatedOutput.state === "mock-generated-draft",
      ),
    [reviewRequirements],
  );
  const [selectedRequirementKey, setSelectedRequirementKey] = useState<
    string | null
  >(generatedReviewableRequirements[0]?.requirementKey ?? null);
  const [explorerFilter, setExplorerFilter] = useState<ExplorerFilter>("pending");
  const [explorerQuery, setExplorerQuery] = useState("");

  useEffect(() => {
    let frame = 0;

    try {
      const persistedSelection = window.localStorage.getItem(selectionStorageKey);
      const persistedFilter = window.localStorage.getItem(
        explorerFilterStorageKey,
      );
      const persistedQuery = window.localStorage.getItem(explorerQueryStorageKey);

      frame = window.requestAnimationFrame(() => {
        if (persistedSelection) {
          setSelectedRequirementKey(persistedSelection);
        }

        if (isExplorerFilter(persistedFilter)) {
          setExplorerFilter(persistedFilter);
        }

        if (persistedQuery) {
          setExplorerQuery(persistedQuery);
        }
      });
    } catch {
      // Ignore local persistence failures.
    }

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [explorerFilterStorageKey, explorerQueryStorageKey, selectionStorageKey]);

  const activeRequirementKey =
    selectedRequirementKey &&
    reviewQueue.some(
      (requirement) => requirement.requirementKey === selectedRequirementKey,
    )
      ? selectedRequirementKey
      : (reviewQueue[0]?.requirementKey ?? null);
  const currentRequirement =
    reviewQueue.find(
      (requirement) => requirement.requirementKey === activeRequirementKey,
    ) ??
    reviewQueue[0] ??
    null;
  const activeQueueIndex = currentRequirement
    ? reviewQueue.findIndex(
        (requirement) =>
          requirement.requirementKey === currentRequirement.requirementKey,
      )
    : -1;
  const explorerRows = useMemo(
    () =>
      searchExplorerRequirements(
        filterExplorerRequirements(generatedInventory, explorerFilter),
        explorerQuery,
      ),
    [explorerFilter, explorerQuery, generatedInventory],
  );
  const queuedRequirementKeys = useMemo(
    () => new Set(reviewQueue.map((requirement) => requirement.requirementKey)),
    [reviewQueue],
  );

  const handleSelectNextReviewRequirement = useCallback(
    (requirement: ReviewRequirement | null) => {
      if (!requirement) {
        setSelectedRequirementKey(reviewQueue[0]?.requirementKey ?? null);
        return;
      }

      const remainingQueue = reviewQueue.filter(
        (entry) => entry.requirementKey !== requirement.requirementKey,
      );
      const nextRequirement =
        remainingQueue.find(
          (entry) => entry.sourceRowNumber > requirement.sourceRowNumber,
        ) ??
        remainingQueue[0] ??
        null;

      setSelectedRequirementKey(nextRequirement?.requirementKey ?? null);
    },
    [reviewQueue],
  );

  const handleSelectPreviousReviewRequirement = useCallback(
    (requirement: ReviewRequirement | null) => {
      if (reviewQueue.length === 0) {
        setSelectedRequirementKey(null);
        return;
      }

      if (!requirement) {
        setSelectedRequirementKey(reviewQueue[0]?.requirementKey ?? null);
        return;
      }

      const currentIndex = reviewQueue.findIndex(
        (entry) => entry.requirementKey === requirement.requirementKey,
      );

      if (currentIndex <= 0) {
        setSelectedRequirementKey(reviewQueue[0]?.requirementKey ?? null);
        return;
      }

      setSelectedRequirementKey(
        reviewQueue[currentIndex - 1]?.requirementKey ?? null,
      );
    },
    [reviewQueue],
  );

  const handleGuidedReviewAction = useCallback(
    (requirement: ReviewRequirement, action: RequirementReviewAction) => {
      onReviewAction(requirement, action);

      if (
        action.type === "approve" ||
        action.type === "flag" ||
        action.type === "skip"
      ) {
        handleSelectNextReviewRequirement(requirement);
      }
    },
    [handleSelectNextReviewRequirement, onReviewAction],
  );

  useEffect(() => {
    if (!activeRequirementKey) {
      return;
    }

    try {
      window.localStorage.setItem(selectionStorageKey, activeRequirementKey);
    } catch {
      // Ignore local persistence failures.
    }
  }, [activeRequirementKey, selectionStorageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(explorerFilterStorageKey, explorerFilter);
      window.localStorage.setItem(explorerQueryStorageKey, explorerQuery);
    } catch {
      // Ignore local persistence failures.
    }
  }, [
    explorerFilter,
    explorerFilterStorageKey,
    explorerQuery,
    explorerQueryStorageKey,
  ]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";

      if (isTypingTarget || !currentRequirement) {
        return;
      }

      if (event.key === "[") {
        event.preventDefault();
        handleSelectPreviousReviewRequirement(currentRequirement);
      }

      if (event.key === "]") {
        event.preventDefault();
        handleSelectNextReviewRequirement(currentRequirement);
      }

      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        handleGuidedReviewAction(currentRequirement, { type: "approve" });
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        handleGuidedReviewAction(currentRequirement, { type: "flag" });
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleGuidedReviewAction(currentRequirement, { type: "skip" });
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        handleGuidedReviewAction(currentRequirement, { type: "resetToDraft" });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentRequirement,
    handleGuidedReviewAction,
    handleSelectNextReviewRequirement,
    handleSelectPreviousReviewRequirement,
  ]);

  const reviewWorkspaceReady = generatedCount > 0 && currentRequirement !== null;

  return (
    <section className="grid gap-6">
      <section className="phase-section-card">
        <div className="phase-section-copy">
          <p className="phase-overline">Review</p>
          <h2 className="phase-section-title">Review generated requirements</h2>
          <p className="phase-section-body">
            Decide one requirement at a time, keep the draft and evidence in
            view, and use the left rail only when you need to move or filter
            the queue.
          </p>
        </div>
      </section>

      {reviewWorkspaceReady ? (
        <section className="phase-review-workspace">
          <aside className="phase-review-sidebar">
            <div className="phase-review-sidebar-scroll">
              <div className="grid gap-4">
                <ReviewQueueNavigator
                  activeQueueIndex={activeQueueIndex}
                  approvedCount={approvedCount}
                  currentRequirement={currentRequirement}
                  onOpenScript={onOpenScript}
                  onSelectNext={handleSelectNextReviewRequirement}
                  onSelectPrevious={handleSelectPreviousReviewRequirement}
                  onSelectQueueRequirement={(requirement) =>
                    setSelectedRequirementKey(requirement.requirementKey)
                  }
                  reviewQueue={reviewQueue}
                  stickyOnDesktop={false}
                />

                <section className="phase-sidebar-panel phase-desktop-only">
                  <ReviewInventoryContent
                    explorerFilter={explorerFilter}
                    explorerQuery={explorerQuery}
                    explorerRows={explorerRows}
                    onExplorerFilterChange={setExplorerFilter}
                    onExplorerQueryChange={setExplorerQuery}
                    onOpenRequirement={(requirement) =>
                      setSelectedRequirementKey(requirement.requirementKey)
                    }
                    queuedRequirementKeys={queuedRequirementKeys}
                  />
                </section>
              </div>
            </div>

            <details className="phase-sidebar-panel phase-mobile-only">
              <summary className="theme-shell-title cursor-pointer text-sm font-bold">
                Filters and full inventory
              </summary>
              <div className="mt-4">
                <ReviewInventoryContent
                  explorerFilter={explorerFilter}
                  explorerQuery={explorerQuery}
                  explorerRows={explorerRows}
                  onExplorerFilterChange={setExplorerFilter}
                  onExplorerQueryChange={setExplorerQuery}
                  onOpenRequirement={(requirement) =>
                    setSelectedRequirementKey(requirement.requirementKey)
                  }
                  queuedRequirementKeys={queuedRequirementKeys}
                />
              </div>
            </details>
          </aside>

          <div className="phase-review-main grid gap-6">
            <GuidedReviewCard
              onReviewAction={handleGuidedReviewAction}
              onSelectNext={handleSelectNextReviewRequirement}
              requirement={currentRequirement}
            />
          </div>
        </section>
      ) : (
        <ReviewWorkflowStep
          activeQueueIndex={activeQueueIndex}
          approvedCount={approvedCount}
          currentRequirement={currentRequirement}
          generatedCount={generatedCount}
          onGenerateDemoRows={async () => {
            const generated = await onGenerateDemoRows();

            if (generated) {
              setSelectedRequirementKey(reviewQueue[0]?.requirementKey ?? null);
            }
          }}
          onGoToGenerate={onGoToGenerate}
          onOpenScript={onOpenScript}
          onReviewAction={handleGuidedReviewAction}
          onSelectPrevious={handleSelectPreviousReviewRequirement}
          onSelectQueueRequirement={(requirement) =>
            setSelectedRequirementKey(requirement.requirementKey)
          }
          onSelectNext={handleSelectNextReviewRequirement}
          reviewQueue={reviewQueue}
          showFrame={false}
        />
      )}

      {currentRequirement ? (
        <div className="phase-mobile-review-bar grid xl:hidden">
          <button
            type="button"
            onClick={() =>
              handleGuidedReviewAction(currentRequirement, { type: "approve" })
            }
            className="focus-premium theme-button-primary rounded-xl px-3 py-3 text-sm font-semibold transition"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() =>
              handleGuidedReviewAction(currentRequirement, { type: "flag" })
            }
            className="focus-premium theme-shell-button-secondary rounded-xl px-3 py-3 text-sm font-semibold transition"
          >
            Flag
          </button>
          <button
            type="button"
            onClick={() =>
              handleGuidedReviewAction(currentRequirement, { type: "skip" })
            }
            className="focus-premium theme-shell-button-secondary rounded-xl px-3 py-3 text-sm font-semibold transition"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => handleSelectNextReviewRequirement(currentRequirement)}
            className="focus-premium theme-shell-button-secondary rounded-xl px-3 py-3 text-sm font-semibold transition"
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ReviewInventoryContent({
  explorerFilter,
  explorerQuery,
  explorerRows,
  onExplorerFilterChange,
  onExplorerQueryChange,
  onOpenRequirement,
  queuedRequirementKeys,
}: {
  explorerFilter: ExplorerFilter;
  explorerQuery: string;
  explorerRows: ReviewRequirement[];
  onExplorerFilterChange: (filter: ExplorerFilter) => void;
  onExplorerQueryChange: (query: string) => void;
  onOpenRequirement: (requirement: ReviewRequirement) => void;
  queuedRequirementKeys: Set<string>;
}) {
  return (
    <>
      <div className="phase-sidebar-copy">
        <p className="phase-overline">Inventory</p>
        <h3 className="phase-rail-title">Search and filter generated rows</h3>
        <p className="phase-inline-note">
          Keep filters visible, then open a pending row directly from the list.
        </p>
      </div>

      <div className="phase-sidebar-filter-grid">
        {(["pending", "review", "approved", "skipped", "all"] as const).map(
          (filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onExplorerFilterChange(filter)}
              className={`focus-premium phase-filter-chip ${
                explorerFilter === filter ? "phase-filter-chip-active" : ""
              }`}
            >
              {capitalize(filter)}
            </button>
          ),
        )}
      </div>

      <input
        value={explorerQuery}
        onChange={(event) => onExplorerQueryChange(event.currentTarget.value)}
        placeholder="Search ID, process, or draft text..."
        className="focus-premium theme-shell-input w-full rounded-xl px-4 py-3 text-sm"
      />

      <div className="phase-sidebar-list">
        {explorerRows.length > 0 ? (
          explorerRows.map((requirement) => {
            const isPendingQueueRow = queuedRequirementKeys.has(
              requirement.requirementKey,
            );

            return (
              <div key={requirement.requirementKey} className="phase-inventory-item">
                <div className="min-w-0">
                  <p className="phase-overlay-row-title">
                    {requirement.requirementId || `Row ${requirement.sourceRowNumber}`}
                  </p>
                  <p className="phase-overlay-row-body">
                    {requirement.requirementDescription ||
                      "No requirement description."}
                  </p>
                </div>

                <div className="phase-overlay-row-meta">
                  <span>{requirement.reviewStatus}</span>
                  <span>Row {requirement.sourceRowNumber}</span>
                </div>

                <button
                  type="button"
                  disabled={!isPendingQueueRow}
                  onClick={() => {
                    if (!isPendingQueueRow) {
                      return;
                    }

                    onOpenRequirement(requirement);
                  }}
                  className="focus-premium theme-shell-button-secondary rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isPendingQueueRow ? "Open row" : "Reviewed"}
                </button>
              </div>
            );
          })
        ) : (
          <div className="phase-feedback">
            No generated rows match the current filters.
          </div>
        )}
      </div>
    </>
  );
}

function filterExplorerRequirements(
  requirements: ReviewRequirement[],
  filter: ExplorerFilter,
) {
  if (filter === "all") {
    return requirements;
  }

  return requirements.filter((requirement) => requirement.reviewStatus === filter);
}

function searchExplorerRequirements(
  requirements: ReviewRequirement[],
  searchQuery: string,
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return requirements;
  }

  return requirements.filter((requirement) =>
    [
      requirement.requirementId,
      requirement.requirementDescription,
      requirement.l2Process,
      requirement.l3Process,
      requirement.operation,
      requirement.reviewStatus,
      requirement.sourceComment,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

function isExplorerFilter(value: string | null): value is ExplorerFilter {
  return (
    value === "all" ||
    value === "pending" ||
    value === "review" ||
    value === "approved" ||
    value === "skipped"
  );
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
