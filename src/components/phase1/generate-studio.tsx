"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  RequirementGenerationAvailabilityBody,
  RequirementGenerationModeCapability,
  RequirementGenerationRouteMode,
  RequirementGenerationUnavailableReason,
} from "@/lib/requirements/generation-api";
import { mockGenerationStageLabels } from "@/lib/requirements/generation";
import {
  filterReviewRequirements,
  type RequirementReviewFilter,
  type ReviewRequirement,
} from "@/lib/requirements/review";
import { RequirementsExplorer } from "@/app/requirements-review-workspace";

const defaultGenerateFilter: RequirementReviewFilter = "demo";

interface GenerateStudioProps {
  demoRequirements: ReviewRequirement[];
  generatedCount: number;
  generationFeedback: {
    tone: "neutral" | "success" | "error";
    message: string;
    code?: string;
    missingConfig?: string[];
    reason?: RequirementGenerationUnavailableReason;
  } | null;
  initialGenerationAvailability?: RequirementGenerationAvailabilityBody | null;
  isGenerating: boolean;
  lastGenerationMode: RequirementGenerationRouteMode | null;
  mockGenerationRun: {
    selectedCount: number;
    generatedCount: number;
    stages: Array<{
      label: (typeof mockGenerationStageLabels)[number];
      status: "waiting" | "running" | "complete";
    }>;
  };
  onGenerateRows: (
    targetRequirements: ReviewRequirement[],
    targetLabel: string,
    mode?: RequirementGenerationRouteMode,
  ) => Promise<boolean>;
  onOpenReview: () => void;
  requirements: ReviewRequirement[];
}

export default function GenerateStudio({
  demoRequirements,
  generatedCount,
  generationFeedback,
  initialGenerationAvailability = null,
  isGenerating,
  lastGenerationMode,
  mockGenerationRun,
  onGenerateRows,
  onOpenReview,
  requirements,
}: GenerateStudioProps) {
  const [generationMode, setGenerationMode] =
    useState<RequirementGenerationRouteMode>("mock");
  const [generationAvailability, setGenerationAvailability] =
    useState<RequirementGenerationAvailabilityBody | null>(
      initialGenerationAvailability,
    );
  const [isRefreshingAvailability, setIsRefreshingAvailability] =
    useState(false);
  const [activeFilter, setActiveFilter] = useState<RequirementReviewFilter>(
    defaultGenerateFilter,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(
    null,
  );
  const [selectedRequirementKeys, setSelectedRequirementKeys] = useState<
    Set<string>
  >(() => new Set());

  const filteredRequirements = useMemo(
    () => filterReviewRequirements(requirements, activeFilter),
    [activeFilter, requirements],
  );
  const visibleRequirements = useMemo(
    () => searchRequirements(filteredRequirements, searchQuery),
    [filteredRequirements, searchQuery],
  );
  const selectedRequirements = useMemo(
    () =>
      requirements.filter((requirement) =>
        selectedRequirementKeys.has(requirement.requirementKey),
      ),
    [requirements, selectedRequirementKeys],
  );
  const mvpRequirements = useMemo(
    () => filterReviewRequirements(requirements, "mvp"),
    [requirements],
  );
  const allFilteredRequirementsSelected =
    visibleRequirements.length > 0 &&
    visibleRequirements.every((requirement) =>
      selectedRequirementKeys.has(requirement.requirementKey),
    );
  const realGenerationCapability =
    generationAvailability?.modes.real ?? createFallbackRealCapability();

  useEffect(() => {
    setGenerationAvailability(initialGenerationAvailability);
  }, [initialGenerationAvailability]);

  useEffect(() => {
    if (generationMode === "real" && !realGenerationCapability.available) {
      setGenerationMode("mock");
    }
  }, [generationMode, realGenerationCapability.available]);

  useEffect(() => {
    const feedbackReason = generationFeedback?.reason;

    if (
      generationFeedback?.code !== "real-generation-unavailable" ||
      !feedbackReason
    ) {
      return;
    }

    setGenerationAvailability((currentAvailability) => ({
      ok: true,
      checkedAt: new Date().toISOString(),
      modes: {
        mock:
          currentAvailability?.modes.mock ?? {
            available: true,
            message: "Draft mode is available.",
            mode: "mock",
            status: "available",
          },
        real: {
          available: false,
          message: generationFeedback.message,
          missingConfig: generationFeedback.missingConfig,
          mode: "real",
          status: feedbackReason,
        },
      },
    }));
  }, [generationFeedback]);

  function handleToggleRequirementSelection(requirementKey: string) {
    setSelectedRequirementKeys((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      if (nextSelection.has(requirementKey)) {
        nextSelection.delete(requirementKey);
      } else {
        nextSelection.add(requirementKey);
      }

      return nextSelection;
    });
  }

  function handleToggleAllFilteredRequirements() {
    setSelectedRequirementKeys((currentSelection) => {
      const nextSelection = new Set(currentSelection);
      const allFilteredSelected = visibleRequirements.every((requirement) =>
        nextSelection.has(requirement.requirementKey),
      );

      visibleRequirements.forEach((requirement) => {
        if (allFilteredSelected) {
          nextSelection.delete(requirement.requirementKey);
        } else {
          nextSelection.add(requirement.requirementKey);
        }
      });

      return nextSelection;
    });
  }

  async function handleGenerateAndAdvance(
    targetRequirements: ReviewRequirement[],
    targetLabel: string,
  ) {
    const generated = await onGenerateRows(
      targetRequirements,
      targetLabel,
      generationMode,
    );

    if (generated) {
      onOpenReview();
    }
  }

  async function handleRefreshGenerationAvailability() {
    setIsRefreshingAvailability(true);

    try {
      const response = await fetch(
        "/api/requirements/generation-availability?refresh=1",
        {
          cache: "no-store",
        },
      );
      const responseBody = (await response.json().catch(() => null)) as
        | RequirementGenerationAvailabilityBody
        | null;

      if (response.ok && responseBody?.ok) {
        setGenerationAvailability(responseBody);
        return;
      }

      setGenerationAvailability((currentAvailability) => ({
        ok: true,
        checkedAt: new Date().toISOString(),
        modes: {
          mock:
            currentAvailability?.modes.mock ?? {
              available: true,
              message: "Draft mode is available.",
              mode: "mock",
              status: "available",
            },
          real: createUnavailableRealCapability(
            "check-failed",
            "Grounded generation could not be confirmed right now. You can continue in draft mode and recheck later.",
          ),
        },
      }));
    } finally {
      setIsRefreshingAvailability(false);
    }
  }

  return (
    <section className="phase-studio-grid phase-generate-studio-grid">
      <section className="phase-section-card phase-generate-intro">
          <div className="phase-section-copy">
            <p className="phase-overline">Generate</p>
            <h2 className="phase-section-title">
              Produce the first credible draft without losing control of the slice.
            </h2>
            <p className="phase-section-body">
              Start with the recommended demo rows, keep the row explorer handy
              for custom selection, and let Review become the next obvious move
              as soon as drafts exist.
            </p>
          </div>

          <div className="phase-inline-metrics">
            <span>
              <strong>{demoRequirements.length}</strong> demo rows
            </span>
            <span>
              <strong>{mvpRequirements.length}</strong> MVP rows
            </span>
            <span>
              <strong>{selectedRequirements.length}</strong> selected
            </span>
            <span>
              <strong>{generatedCount}</strong> generated
            </span>
          </div>
      </section>

      <section className="phase-section-card phase-generate-explorer">
          <div className="phase-section-copy">
            <p className="phase-overline">Row Explorer</p>
            <h3 className="phase-section-title">
              Search, filter, and narrow the generation slice when needed.
            </h3>
            <p className="phase-section-body">
              The recommended demo slice remains the default, but the full row
              explorer stays available for custom runs without leaving this step.
            </p>
          </div>

          <RequirementsExplorer
            allFilteredRequirementsSelected={allFilteredRequirementsSelected}
            allRequirements={requirements}
            defaultOpen
            disclosureLabel="Row explorer and slice selection"
            filter={activeFilter}
            onFilterChange={(filter) => {
              setActiveFilter(filter);
              setSelectedRowNumber(null);
            }}
            onSearchChange={setSearchQuery}
            onSelectRequirement={(requirement) =>
              setSelectedRowNumber(requirement.sourceRowNumber)
            }
            onToggleAllFilteredRequirements={handleToggleAllFilteredRequirements}
            onToggleRequirementSelection={handleToggleRequirementSelection}
            searchQuery={searchQuery}
            selectedRequirementKeys={selectedRequirementKeys}
            selectedRowNumber={selectedRowNumber}
            visibleRequirements={visibleRequirements}
          />
      </section>

      <aside className="phase-rail phase-generate-primary-rail">
        <section className="phase-rail-card phase-generate-rail">
          <div className="phase-rail-header">
            <div>
              <p className="phase-overline">Generation rail</p>
              <h3 className="phase-rail-title">
                Run the recommended slice first.
              </h3>
            </div>
            <span className="phase-count-pill">
              {demoRequirements.length} recommended
            </span>
          </div>

          <GenerationModeSelector
            availability={realGenerationCapability}
            feedbackTone={generationFeedback?.tone ?? null}
            isRefreshingAvailability={isRefreshingAvailability}
            mode={generationMode}
            onModeChange={setGenerationMode}
            onRefreshAvailability={handleRefreshGenerationAvailability}
          />

          <div className="phase-mode-card">
            <p className="phase-overline">Recommended run</p>
            <p className="phase-mode-copy">
              Generate the demo-marked slice first for the safest consultant
              walkthrough, then use MVP or custom selection only when you
              intentionally want a narrower batch.
            </p>
          </div>

          <div className="phase-rail-stack">
            <button
              type="button"
              onClick={() =>
                handleGenerateAndAdvance(demoRequirements, "demo rows")
              }
              disabled={demoRequirements.length === 0 || isGenerating}
              className="focus-premium theme-button-primary rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating
                ? "Generating recommended draft..."
                : "Generate recommended draft"}
            </button>

            <div className="phase-expert-actions">
              <button
                type="button"
                onClick={() =>
                  handleGenerateAndAdvance(mvpRequirements, "MVP rows")
                }
                disabled={mvpRequirements.length === 0 || isGenerating}
                className="focus-premium theme-shell-button-secondary rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Generate MVP rows
              </button>
              <button
                type="button"
                onClick={() =>
                  handleGenerateAndAdvance(selectedRequirements, "selected rows")
                }
                disabled={selectedRequirements.length === 0 || isGenerating}
                className="focus-premium theme-shell-button-secondary rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Generate selected rows
              </button>
              {generatedCount > 0 ? (
                <button
                  type="button"
                  onClick={onOpenReview}
                  className="focus-premium theme-shell-button-secondary rounded-xl px-4 py-3 text-sm font-semibold transition"
                >
                  Open review queue
                </button>
              ) : null}
            </div>
          </div>

          {generationFeedback ? (
            <div
              className={`phase-feedback ${
                generationFeedback.tone === "success"
                  ? "phase-feedback-success"
                  : generationFeedback.tone === "error"
                    ? "phase-feedback-error"
                    : ""
              }`}
              role="status"
              aria-live="polite"
            >
              {generationFeedback.message}
            </div>
          ) : null}

          <div className="phase-status-list phase-status-list-compact">
            {mockGenerationRun.stages.map((stage) => (
              <div key={stage.label} className="phase-status-item">
                <span
                  className={`phase-status-dot phase-status-${stage.status}`}
                />
                <div>
                  <p className="phase-status-label">{stage.label}</p>
                  <p className="phase-status-meta">{stage.status}</p>
                </div>
              </div>
            ))}
          </div>

          {lastGenerationMode === "real" && generationMode === "mock" ? (
            <p className="phase-inline-note">
              The last successful run used grounded generation. This rail is
              currently set back to draft mode for a quicker pass.
            </p>
          ) : null}
        </section>
      </aside>
    </section>
  );
}

function GenerationModeSelector({
  availability,
  feedbackTone,
  isRefreshingAvailability,
  mode,
  onModeChange,
  onRefreshAvailability,
}: {
  availability: RequirementGenerationModeCapability;
  feedbackTone: "neutral" | "success" | "error" | null;
  isRefreshingAvailability: boolean;
  mode: RequirementGenerationRouteMode;
  onModeChange: (mode: RequirementGenerationRouteMode) => void;
  onRefreshAvailability: () => Promise<void>;
}) {
  const realModeDisabled = !availability.available;

  return (
    <div className="phase-mode-card">
      <div className="phase-mode-toggle">
        <button
          type="button"
          onClick={() => onModeChange("mock")}
          aria-pressed={mode === "mock"}
          className={`focus-premium phase-mode-button ${
            mode === "mock" ? "phase-mode-button-active" : ""
          }`}
        >
          Draft mode
        </button>
        <button
          type="button"
          onClick={() => onModeChange("real")}
          disabled={realModeDisabled}
          aria-pressed={mode === "real"}
          aria-disabled={realModeDisabled}
          className={`focus-premium phase-mode-button ${
            mode === "real" ? "phase-mode-button-active" : ""
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Grounded mode
        </button>
      </div>

      <div className="phase-mode-copy">
        <p>
          Current mode:{" "}
          <strong>
            {mode === "mock" ? "Draft mode" : "Grounded generation"}
          </strong>
          {feedbackTone === "error" && mode === "real"
            ? ". Grounded mode failed safely, so draft mode remains available."
            : "."}
        </p>
        {!availability.available ? <p>{availability.message}</p> : null}
      </div>

      {!availability.available ? (
        <button
          type="button"
          onClick={() => void onRefreshAvailability()}
          disabled={isRefreshingAvailability}
          className="focus-premium theme-shell-button-secondary rounded-full px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRefreshingAvailability ? "Rechecking..." : "Recheck real access"}
        </button>
      ) : (
        <span className="phase-ready-pill">Grounded mode available</span>
      )}
    </div>
  );
}

function createFallbackRealCapability(): RequirementGenerationModeCapability {
  return createUnavailableRealCapability(
    "check-failed",
    "Grounded generation could not be confirmed right now. You can continue in draft mode and recheck later.",
  );
}

function createUnavailableRealCapability(
  reason: RequirementGenerationUnavailableReason,
  message: string,
  missingConfig?: string[],
): RequirementGenerationModeCapability {
  return {
    available: false,
    message,
    missingConfig,
    mode: "real",
    status: reason,
  };
}

function searchRequirements(
  requirements: ReviewRequirement[],
  searchQuery: string,
): ReviewRequirement[] {
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
