"use client";

import Link from "next/link";
import type { Phase1ProjectRecord } from "@/lib/phase1/project-registry";
import Phase1Topbar from "@/components/phase1/phase-topbar";
import {
  getMasterDataStepPath,
} from "@/lib/master-data/workflow";
import {
  masterDataWorkflowMeta,
  masterDataWorkflowSteps,
  type MasterDataPhase2State,
  type MasterDataWorkflowStep,
} from "@/lib/master-data/types";

export default function MasterDataProjectShell({
  children,
  currentStep,
  project,
}: {
  children: React.ReactNode;
  currentStep: MasterDataWorkflowStep;
  project: Phase1ProjectRecord;
}) {
  const phase2 = project.phase2;
  const objectCount = Object.values(phase2.generatedObjects).reduce(
    (total, entries) => total + entries.length,
    0,
  );
  const pendingApprovalCount = Object.values(phase2.generatedObjects)
    .flat()
    .filter((objectDraft) => objectDraft.reviewStatus !== "approved").length;
  const currentStepMeta = masterDataWorkflowMeta[currentStep];
  const phaseModeLabel =
    project.snapshot.approvedCount === 0
      ? "Phase 1 approval needed"
      : phase2.mode === "real"
        ? "Grounded generation"
        : "Prototype drafts";

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
              <Link
                href={`/projects/${encodeURIComponent(project.projectId)}/export`}
                className="phase-product-link"
              >
                {project.projectName}
              </Link>
              <span className="phase-shell-divider">/</span>
              <span>Master Data</span>
            </div>

            <div className="phase-shell-pill-row">
              <span className="phase-shell-pill">Phase 2</span>
              <span className="phase-shell-pill phase-shell-pill-muted">
                {currentStepMeta.label}
              </span>
              <span className="phase-shell-pill phase-shell-pill-muted">
                {phaseModeLabel}
              </span>
            </div>
          </div>

          <div className="phase-shell-header-main">
            <div className="phase-shell-title-block">
              <h1 className="phase-shell-title">Master Data continuation</h1>
              <p className="phase-shell-helper">
                Turn the reviewed requirement slice into a consultant-approved
                MES package without leaving the project workspace.
              </p>
            </div>

            <div className="phase-shell-summary">
              <div className="phase-shell-summary-main">
                <SummaryItem
                  emphasis
                  label="Current stage"
                  value={currentStepMeta.label}
                />
                <SummaryItem
                  label="Selected rows"
                  value={String(phase2.selectedRequirementKeys.length)}
                />
              </div>

              <div className="phase-shell-summary-stats">
                <SummaryStat label="Objects" value={objectCount} />
                <SummaryStat
                  label="Needs review"
                  tone={pendingApprovalCount > 0 ? "attention" : "positive"}
                  value={pendingApprovalCount}
                />
                <SummaryStat
                  label="Traceability"
                  value={phase2.traceability.length}
                />
              </div>
            </div>
          </div>
        </header>

        <nav aria-label="Phase 2 stages" className="phase-stage-nav">
          {masterDataWorkflowSteps.map((step) => {
            const href = getMasterDataStepPath(project.projectId, step);
            const isActive = currentStep === step;
            const status = getMasterDataStepStatus(phase2, step);

            return (
              <Link
                key={step}
                href={href}
                aria-current={isActive ? "step" : undefined}
                className={`phase-stage-link ${
                  isActive ? "phase-stage-link-active" : ""
                } ${status === "blocked" ? "phase-stage-link-blocked" : ""}`}
              >
                <span className="phase-stage-eyebrow">{status}</span>
                <span className="phase-stage-title">
                  {masterDataWorkflowMeta[step].label}
                </span>
                <span className="phase-stage-subtitle">
                  {masterDataWorkflowMeta[step].subtitle}
                </span>
              </Link>
            );
          })}
        </nav>

        <section className="phase-workspace-body min-w-0">{children}</section>
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

function getMasterDataStepStatus(
  phase2: MasterDataPhase2State,
  step: MasterDataWorkflowStep,
) {
  const objectCount = Object.values(phase2.generatedObjects).reduce(
    (total, entries) => total + entries.length,
    0,
  );
  const allApproved =
    objectCount > 0 &&
    Object.values(phase2.generatedObjects)
      .flat()
      .every((objectDraft) => objectDraft.reviewStatus === "approved");

  switch (step) {
    case "setup":
      return phase2.applicableRequirements.length > 0 ? "complete" : "available";
    case "process":
      return phase2.selectedRequirementKeys.length > 0 ? "available" : "blocked";
    case "review":
      return objectCount > 0 ? "available" : "blocked";
    case "export":
      return allApproved ? "available" : "blocked";
    case "traceability":
      return objectCount > 0 ? "available" : "blocked";
  }
}
