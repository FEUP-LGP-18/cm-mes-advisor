"use client";

import Link from "next/link";
import {
  getPhase1StepPath,
  phase1WorkflowLabels,
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
  const workflowFocus = describeWorkflowFocus(currentStep, nextAction);

  return (
    <main className="mesh-background min-h-screen overflow-x-hidden text-[color:var(--shell-ink)]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Phase1Topbar />

        <header className="phase-shell-header">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/" className="phase-product-link">
                MES Demo Advisor
              </Link>
              <span className="phase-shell-pill">Phase 1</span>
              <span className="phase-shell-pill phase-shell-pill-muted">
                {phase1WorkflowLabels[currentStep]}
              </span>
            </div>

            <h1 className="mt-2 text-[1.9rem] font-bold tracking-[-0.05em] text-[color:var(--shell-ink)] sm:text-[2.2rem]">
              {project.projectName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="phase-shell-pill phase-shell-pill-muted">
                Active workbook
              </span>
              <span className="phase-shell-pill">
                {project.workspaceState.source.sourceFilename}
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--shell-muted)]">
              Keep the main task on this route ahead of workflow chrome, then
              move forward only when the work on this screen is actually done.
            </p>
          </div>

          <div className="phase-shell-stats">
            <PhaseStat label="Rows" value={project.snapshot.sourceRowCount} />
            <PhaseStat
              label="Pending review"
              value={project.snapshot.generatedReviewableCount}
            />
            <PhaseStat
              label="Approved"
              value={project.snapshot.approvedCount}
            />
          </div>
        </header>

        <section className="phase-shell-progress">
          <div className="phase-shell-progress-copy">
            <p className="phase-overline">Workflow status</p>
            <p className="mt-2 text-lg font-semibold text-[color:var(--shell-ink)]">
              {workflowFocus.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--shell-muted)]">
              {workflowFocus.body}
            </p>
          </div>

          <nav aria-label="Phase 1 steps" className="phase-progress-grid">
            {progress.map((stepState, index) => {
              const href = getPhase1StepPath(project.projectId, stepState.step);
              const isActive = currentStep === stepState.step;

              return (
                <Link
                  key={stepState.step}
                  href={href}
                  aria-current={isActive ? "step" : undefined}
                  className={`phase-progress-link ${
                    isActive
                      ? "phase-progress-link-active"
                      : stepState.status === "blocked"
                        ? "phase-progress-link-blocked"
                        : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="phase-step-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="phase-step-status">
                      {stepState.status}
                    </span>
                  </div>
                  <span className="mt-2 block text-sm font-semibold">
                    {stepState.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </section>

        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}

function describeWorkflowFocus(
  currentStep: Phase1WorkflowStep,
  nextAction: Phase1NextAction,
) {
  if (currentStep === nextAction.step) {
    return {
      title: nextAction.label,
      body: nextAction.helper,
    };
  }

  return {
    title:
      currentStep === "script" || currentStep === "export"
        ? `${phase1WorkflowLabels[nextAction.step]} still gates final completion`
        : `${phase1WorkflowLabels[nextAction.step]} still needs attention`,
    body:
      currentStep === "script" || currentStep === "export"
        ? `${phase1WorkflowLabels[currentStep]} is available for drafting, but ${lowercaseFirst(nextAction.helper)}`
        : nextAction.helper,
  };
}

function PhaseStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="phase-stat">
      <p className="phase-overline">{label}</p>
      <p className="mt-2 text-lg font-bold tracking-[-0.03em] text-[color:var(--shell-ink)]">
        {value.toLocaleString("en-US")}
      </p>
    </div>
  );
}

function lowercaseFirst(value: string) {
  if (value.length === 0) {
    return value;
  }

  return `${value.slice(0, 1).toLowerCase()}${value.slice(1)}`;
}
