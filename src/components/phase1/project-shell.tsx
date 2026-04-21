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

  return (
    <main className="app-canvas min-h-screen text-[color:var(--shell-ink)]">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Phase1Topbar />

        <header className="phase-shell-header">
          <div className="phase-shell-breadcrumbs">
            <Link href="/" className="phase-product-link">
              Projects
            </Link>
            <span className="phase-shell-divider">/</span>
            <span>{project.projectName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

          <div className="phase-shell-title-block">
            <h1 className="text-[1.9rem] font-semibold tracking-[-0.05em] sm:text-[2.25rem]">
              {project.projectName}
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[color:var(--shell-muted)]">
              {nextAction.helper}
            </p>
          </div>

          <div className="phase-shell-strip">
            <StripItem
              label="Workbook"
              value={project.snapshot.sourceFilename}
              wide
            />
            <StripItem label="Next action" value={nextAction.label} emphasis />
            <StripStat label="Rows" value={project.snapshot.sourceRowCount} />
            <StripStat
              label="Pending review"
              value={project.snapshot.generatedReviewableCount}
            />
            <StripStat
              label="Approved"
              value={project.snapshot.approvedCount}
            />
            {(currentStep === "script" ||
              currentStep === "export" ||
              project.snapshot.exportReady) && (
              <StripItem label="Export" value={exportState} />
            )}
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
                <span className="phase-stage-subtitle">{stepState.subtitle}</span>
              </Link>
            );
          })}
        </nav>

        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}

function StripItem({
  emphasis = false,
  label,
  value,
  wide = false,
}: {
  emphasis?: boolean;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`phase-shell-strip-item ${
        emphasis ? "phase-shell-strip-item-emphasis" : ""
      } ${wide ? "phase-shell-strip-item-wide" : ""}`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StripStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="phase-shell-strip-item phase-shell-strip-item-stat">
      <span>{label}</span>
      <strong>{value.toLocaleString("en-US")}</strong>
    </div>
  );
}
