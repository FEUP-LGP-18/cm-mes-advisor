"use client";

import { useEffect, useRef } from "react";
import {
  masterDataObjectTypeLabels,
  type MasterDataGenerationStatus,
  type MasterDataObjectType,
  type MasterDataPhase2State,
} from "@/lib/master-data/types";
import { ArrowLeft, ArrowRight, Retry } from "@/components/icons";

function ObjectFailurePanel({ phase2 }: { phase2: MasterDataPhase2State }) {
  const objectsWithWarnings = (Object.entries(phase2.generatedObjects) as [MasterDataObjectType, typeof phase2.generatedObjects[MasterDataObjectType]][])
    .flatMap(([type, arr]) => arr.filter((o) => o.warnings.length > 0).map((o) => ({ ...o, type })));

  if (objectsWithWarnings.length === 0 && Object.values(phase2.generatedObjects).flat().length === 0) {
    return (
      <div className="fv-card fv-card-left-error" style={{ marginTop: "0.25rem" }}>
        <div className="fv-card-title" style={{ color: "var(--status-error)" }}>Generation Failed</div>
        <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", margin: 0, lineHeight: 1.5 }}>
          No objects were generated. This typically means the AI could not connect to the requirements data or the generation request failed before producing output. Use Retry or switch to prototype drafts.
        </p>
      </div>
    );
  }

  if (objectsWithWarnings.length === 0) {
    return null;
  }

  return (
    <div className="fv-card fv-card-left-error" style={{ marginTop: "0.25rem" }}>
      <div className="fv-card-title" style={{ color: "var(--status-error)" }}>
        Object Warnings — {objectsWithWarnings.length} {objectsWithWarnings.length === 1 ? "object" : "objects"} flagged
      </div>
      <p style={{ fontSize: "0.78rem", color: "var(--muted-fg)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
        These objects were generated but have warnings that need resolution before export. Review them individually in the review step or retry generation.
      </p>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {objectsWithWarnings.map((obj) => (
          <div
            key={obj.objectId}
            style={{
              background: "var(--status-error-bg)",
              border: "1px solid var(--surface-border)",
              borderRadius: "var(--radius-sm)",
              padding: "0.625rem 0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted-fg)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {masterDataObjectTypeLabels[obj.type]}
              </span>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)" }}>
                {obj.name}
              </span>
            </div>
            <ul style={{ margin: 0, padding: "0 0 0 1rem", display: "grid", gap: "0.2rem" }}>
              {obj.warnings.map((w, i) => (
                <li key={i} style={{ fontSize: "0.78rem", color: "var(--status-error)", lineHeight: 1.5 }}>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function shouldAutoStartMasterDataGeneration(
  status: MasterDataGenerationStatus,
) {
  return status === "idle";
}

const STAGE_LABELS: Record<string, string> = {
  analysis: "Parse requirement text",
  mapping: "Map to MES object schema",
  defaults: "Populate required fields",
  relationships: "Validate cross-references",
  packaging: "Package Master Data files",
};

export default function MasterDataProcessStudio({
  onGenerate,
  onOpenReview,
  onReturnToSetup,
  onUsePrototypeDrafts,
  phase2,
}: {
  onGenerate: () => Promise<boolean>;
  onOpenReview: () => void;
  onReturnToSetup: () => void;
  onUsePrototypeDrafts: () => void;
  phase2: MasterDataPhase2State;
}) {
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (
      hasTriggeredRef.current ||
      !shouldAutoStartMasterDataGeneration(phase2.generationStatus)
    ) {
      return;
    }
    hasTriggeredRef.current = true;
    void onGenerate();
  }, [onGenerate, phase2.generationStatus]);

  const isReady = phase2.generationStatus === "ready";
  const isError = phase2.generationStatus === "error";

  const total = phase2.selectedRequirementKeys.length;
  const objectCount = Object.values(phase2.generatedObjects).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );
  const pct = total > 0 ? Math.round((objectCount / Math.max(total, 1)) * 100) : 0;

  // Group logs by stage for the steps display
  const stageOrder = ["analysis", "mapping", "defaults", "relationships", "packaging"];
  const stageMap = new Map<string, { status: string; message: string }>();
  for (const log of phase2.generationLogs) {
    stageMap.set(log.stage, { status: log.status, message: log.message });
  }

  // Build by-type breakdown
  const typeBreakdown = Object.entries(phase2.generatedObjects)
    .filter(([, arr]) => arr.length > 0 || phase2.selectedObjectTypes.includes(arr as unknown as string as never))
    .map(([type, arr]) => ({ type, count: arr.length }));

  const highConf = Object.values(phase2.generatedObjects).flat().filter((o) => o.confidence.level === "high").length;
  const medConf = Object.values(phase2.generatedObjects).flat().filter((o) => o.confidence.level === "medium").length;
  const warnings = Object.values(phase2.generatedObjects).flat().filter((o) => o.warnings.length > 0).length;

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 className="fv-page-title">
          {isReady ? "Master Data Generated" : isError ? "Generation Error" : "Generating Master Data…"}
        </h1>
        <p className="fv-page-subtitle">
          {isReady
            ? `${objectCount} objects created from ${total} selected requirements. Ready for review.`
            : isError
              ? "Generation completed with errors. Review and resolve before proceeding to export."
              : `AI is processing ${total} selected requirements and creating MES object definitions.`}
        </p>
      </div>

      {/* Error banner */}
      {isError ? (
        <div className="fv-callout fv-callout-error" style={{ marginBottom: "1rem" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }} aria-hidden="true">
            <circle cx="8" cy="8" r="6" /><line x1="6" y1="6" x2="10" y2="10" /><line x1="10" y1="6" x2="6" y2="10" />
          </svg>
          {phase2.generationFeedback ?? "Generation completed with errors — review below and resolve or skip before proceeding to export."}
        </div>
      ) : null}

      <div className="fv-two-col">
        {/* Left: progress + steps + terminal */}
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {/* Progress bar */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.875rem", color: "var(--foreground)", fontWeight: 500 }}>
                Overall Progress — {objectCount} of {total} objects
              </span>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: isReady ? "var(--status-approved)" : "var(--brand-primary)" }}>
                {isReady ? "100%" : `${pct}%`}
              </span>
            </div>
            <div className="fv-progress-track">
              <div
                className={`fv-progress-fill${isReady ? " fv-progress-fill-green" : ""}`}
                style={{ width: `${isReady ? 100 : pct}%` }}
              />
            </div>
          </div>

          {/* Generation steps */}
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.625rem" }}>
              Generation Steps
            </div>

            {stageOrder.map((stage, idx) => {
              const info = stageMap.get(stage);
              const isDone = info?.status === "complete";
              const isActive = info?.status === "running";
              const isWarn = info?.status === "warning";

              return (
                <div
                  key={stage}
                  className={`fv-gen-step${isDone || isWarn ? " fv-gen-step-done" : isActive ? " fv-gen-step-active" : ""}`}
                  style={isWarn ? { borderColor: "var(--status-flagged-border)", background: "var(--status-flagged-bg)" } : undefined}
                >
                  <div className={`fv-gen-circle${isDone || isWarn ? " fv-gen-circle-done" : isActive ? " fv-gen-circle-active" : " fv-gen-circle-future"}`}
                    style={isWarn ? { background: "var(--status-flagged)" } : undefined}
                  >
                    {isDone || isWarn ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <polyline points="1.5 5 4 7.5 8.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div>
                    <div className="fv-gen-step-title">{STAGE_LABELS[stage] ?? stage}</div>
                    {info?.message ? (
                      <div className="fv-gen-step-sub">{info.message}</div>
                    ) : !info ? (
                      <div className="fv-gen-step-sub">Waiting…</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Terminal log */}
          {phase2.generationLogs.length > 0 ? (
            <div className="fv-terminal">
              {phase2.generationLogs.map((log) => {
                const cls =
                  log.status === "complete" ? "fv-terminal-ok"
                    : log.status === "warning" ? "fv-terminal-warn"
                    : log.status === "running" ? "fv-terminal-run"
                    : "fv-terminal-info";
                const prefix = log.status === "complete" ? "[OK]" : log.status === "warning" ? "[WARN]" : log.status === "running" ? "[RUN]" : "[INFO]";
                return (
                  <div key={log.id}>
                    <span className={cls}>{prefix} </span>
                    <span className="fv-terminal-info">{log.message}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="fv-terminal">
              <span className="fv-terminal-info">Waiting for generation to start…</span>
            </div>
          )}

          {/* Per-object failure panel — only shown in error state */}
          {isError ? <ObjectFailurePanel phase2={phase2} /> : null}
        </div>

        {/* Right: stats cards + actions */}
        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          {/* Objects generated card */}
          <div className="fv-card">
            <div className="fv-card-title">Objects Generated</div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--brand-primary)", letterSpacing: "-0.04em", lineHeight: 1 }}>
              {objectCount}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted-fg)", marginTop: "0.25rem" }}>
              of {total} total · {pct}%
            </div>
            <div className="fv-progress-track" style={{ marginTop: "0.625rem" }}>
              <div className="fv-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* By object type */}
          {typeBreakdown.length > 0 ? (
            <div className="fv-card">
              <div className="fv-card-title">By Object Type</div>
              {typeBreakdown.map(({ type, count }) => (
                <div key={type} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.25rem 0", borderBottom: "1px solid var(--surface-border)" }}>
                  <span style={{ color: "var(--muted-fg)", textTransform: "capitalize" }}>{type}</span>
                  <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{count}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Confidence breakdown */}
          <div className="fv-card">
            <div className="fv-card-title">Confidence Breakdown</div>
            {[
              { label: "High", value: highConf, color: "var(--status-approved)" },
              { label: "Medium", value: medConf, color: "var(--status-flagged)" },
              { label: "Warnings", value: warnings, color: "var(--status-flagged)" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.25rem 0", borderBottom: "1px solid var(--surface-border)" }}>
                <span style={{ color: "var(--muted-fg)" }}>{row.label}</span>
                <span style={{ fontWeight: 700, color: row.value > 0 ? row.color : "var(--muted-fg)" }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {isReady ? (
              <button type="button" onClick={onOpenReview} className="fv-btn-primary" style={{ justifyContent: "center" }}>
                Review Results <ArrowRight />
              </button>
            ) : null}
            {isError ? (
              <>
                {phase2.mode === "real" ? (
                  <button type="button" onClick={onUsePrototypeDrafts} className="fv-btn-primary" style={{ justifyContent: "center" }}>
                    Switch to prototype drafts
                  </button>
                ) : null}
                <button type="button" onClick={() => void onGenerate()} className="fv-btn-secondary" style={{ justifyContent: "center" }}>
                  <Retry />Retry Generation
                </button>
                <button type="button" onClick={onOpenReview} className="fv-btn-secondary" style={{ justifyContent: "center" }}>
                  Review Partial Results
                </button>
              </>
            ) : null}
            <button type="button" onClick={onReturnToSetup} className="fv-btn-secondary" style={{ justifyContent: "center" }}>
              <ArrowLeft />Back to Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
