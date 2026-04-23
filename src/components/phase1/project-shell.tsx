"use client";

import Link from "next/link";
import {
  getPhase1StepPath,
  phase1WorkflowMeta,
  type Phase1NextAction,
  type Phase1WorkflowStep,
  type Phase1WorkflowStepState,
} from "@/lib/phase1/workflow";
import type { Phase1ProjectRecord } from "@/lib/phase1/project-registry";
import Phase1Topbar from "./phase-topbar";

export default function Phase1ProjectShell({
  children,
  currentStep,
  nextAction,
  progress,
  project,
}: {
  children: React.ReactNode;
  currentStep: Phase1WorkflowStep;
  nextAction: Phase1NextAction;
  progress: Phase1WorkflowStepState[];
  project: Phase1ProjectRecord;
}) {
  const currentStepMeta = phase1WorkflowMeta[currentStep];
  const exportState = project.snapshot.exportReady ? "Ready" : "Blocked";
  const showExportState =
    currentStep === "script" ||
    currentStep === "export" ||
    project.snapshot.exportReady;

  return (
    <main className="app-canvas min-h-screen text-[color:var(--shell-ink)]">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Phase1Topbar />

        <header className="phase-shell-header">
          <div className="phase-shell-header-top">
            <div className="phase-shell-breadcrumbs">
              <Link href="/" className="phase-product-link">
                Projects
              </Link>
              <span className="phase-shell-divider">/</span>
              <span>{project.projectName}</span>
            </div>

            <div className="phase-shell-pill-row">
              <span className="phase-shell-pill">Phase 1</span>
              <span className="phase-shell-pill phase-shell-pill-muted">
                {currentStepMeta.label}
              </span>
              <span className="phase-shell-pill phase-shell-pill-muted">
                {currentStepMeta.subtitle}
              </span>
              {project.snapshot.exportReady ? (
                <span className="phase-shell-pill phase-shell-pill-ready">
                  Export ready
                </span>
              ) : null}
            </div>
          </div>

          <div className="phase-shell-header-main">
            <div className="phase-shell-title-block">
              <h1 className="phase-shell-title">{project.projectName}</h1>
              <p className="phase-shell-helper">{nextAction.helper}</p>
            </div>

            <div className="phase-shell-summary">
              <div className="phase-shell-summary-main">
                <SummaryItem
                  label="Next action"
                  value={nextAction.label}
                  emphasis
                />
                <SummaryItem
                  label="Workbook"
                  value={project.snapshot.sourceFilename}
                />
              </div>

              <div className="phase-shell-summary-stats">
                <SummaryStat
                  label="Rows"
                  value={project.snapshot.sourceRowCount}
                />
                <SummaryStat
                  label="Pending review"
                  value={project.snapshot.generatedReviewableCount}
                  tone={
                    project.snapshot.generatedReviewableCount > 0
                      ? "attention"
                      : "default"
                  }
                />
                <SummaryStat
                  label="Approved"
                  value={project.snapshot.approvedCount}
                />
                {showExportState ? (
                  <SummaryStat
                    label="Export"
                    value={exportState}
                    tone={project.snapshot.exportReady ? "positive" : "default"}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <nav aria-label="Phase 1 stages" className="phase-stage-nav">
          {progress.map((stepState) => {
            const href = getPhase1StepPath(project.projectId, stepState.step);
            const isActive = currentStep === stepState.step;

            return (
              <Link
                key={stepState.step}
                href={href}
                aria-current={isActive ? "step" : undefined}
                className={`phase-stage-link ${
                  isActive ? "phase-stage-link-active" : ""
                } ${
                  stepState.status === "blocked"
                    ? "phase-stage-link-blocked"
                    : ""
                }`}
              >
                <span className="phase-stage-eyebrow">{stepState.status}</span>
                <span className="phase-stage-title">{stepState.label}</span>
                <span className="phase-stage-subtitle">
                  {stepState.subtitle}
                </span>
              </Link>
            );
          })}
        </nav>

        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}

function SummaryItem({
  emphasis = false,
  label,
  value,
}: {
  emphasis?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`phase-shell-summary-item ${
        emphasis ? "phase-shell-summary-item-emphasis" : ""
      }`}
    >
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}

function SummaryStat({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "attention" | "default" | "positive";
  value: number | string;
}) {
  return (
    <div
      className={`phase-shell-summary-stat phase-shell-summary-stat-${tone}`}
    >
      <span>{label}</span>
      <strong title={String(value)}>
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </strong>
    </div>
  );
}
