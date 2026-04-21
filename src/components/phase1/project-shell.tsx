"use client";

import Link from "next/link";
import { phaseOneScope } from "@/lib/project-scope";
import {
  getPhase1StepPath,
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
  return (
    <main className="mesh-background min-h-screen overflow-x-hidden text-[color:var(--shell-ink)]">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Phase1Topbar />

        <header className="phase-topbar">
          <div className="min-w-0">
            <p className="phase-overline">Critical Manufacturing · Phase 1</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link href="/" className="phase-product-link">
                {phaseOneScope.productName}
              </Link>
              <span className="phase-divider" aria-hidden="true" />
              <p className="truncate text-lg font-semibold text-[color:var(--shell-ink)]">
                {project.projectName}
              </p>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--shell-muted)]">
              Current source:{" "}
              <span className="font-semibold text-[color:var(--shell-ink)]">
                {project.workspaceState.source.sourceFilename}
              </span>
              . Next up:{" "}
              <span className="font-semibold text-[color:var(--shell-ink)]">
                {nextAction.label}
              </span>
              .
            </p>
          </div>

          <div className="phase-status-strip">
            <PhaseStat label="Rows" value={project.snapshot.sourceRowCount} />
            <PhaseStat
              label="Review"
              value={project.snapshot.generatedReviewableCount}
            />
            <PhaseStat
              label="Approved"
              value={project.snapshot.approvedCount}
            />
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[248px_minmax(0,1fr)]">
          <aside className="phase-rail">
            <p className="phase-overline">Workflow</p>
            <nav aria-label="Phase 1 steps" className="mt-4 grid gap-2">
              {progress.map((stepState, index) => {
                const href = getPhase1StepPath(
                  project.projectId,
                  stepState.step,
                );
                const isActive = currentStep === stepState.step;

                return (
                  <Link
                    key={stepState.step}
                    href={href}
                    aria-current={isActive ? "step" : undefined}
                    className={`phase-step-link ${
                      isActive
                        ? "phase-step-link-active"
                        : stepState.status === "blocked"
                          ? "phase-step-link-blocked"
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

            <div className="phase-rail-note">
              <p className="phase-overline">Next action</p>
              <p className="mt-2 text-sm font-semibold text-[color:var(--shell-ink)]">
                {nextAction.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--shell-muted)]">
                {nextAction.helper}
              </p>
            </div>
          </aside>

          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
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
