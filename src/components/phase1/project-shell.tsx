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
import type { ProjectRole } from "@/lib/projects/types";
import CopyProjectLinkButton from "./copy-project-link-button";
import Phase1Topbar from "./phase-topbar";

export default function Phase1ProjectShell({
  canEditPhase1 = true,
  children,
  currentStep,
  currentUserRole = "owner",
  email,
  nextAction,
  persistenceFeedback,
  progress,
  project,
}: {
  canEditPhase1?: boolean;
  children: React.ReactNode;
  currentStep: Phase1WorkflowStep;
  currentUserRole?: ProjectRole | null;
  email?: string | null;
  nextAction: Phase1NextAction;
  persistenceFeedback?: {
    tone: "neutral" | "success" | "error";
    message: string;
  } | null;
  progress: Phase1WorkflowStepState[];
  project: Phase1ProjectRecord;
}) {
  const currentStepMeta = phase1WorkflowMeta[currentStep];
  const exportState = project.snapshot.exportReady ? "Ready" : "Blocked";
  const showExportState =
    currentStep === "script" ||
    currentStep === "export" ||
    project.snapshot.exportReady;
  const roleLabel = formatRole(currentUserRole ?? "owner");

  return (
    <main className="app-canvas min-h-screen text-[color:var(--shell-ink)]">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Phase1Topbar email={email} />

        <header className="phase-shell-header">
          <div className="phase-shell-header-top">
            <div className="phase-shell-breadcrumbs">
              <Link href="/" className="phase-product-link">
                Projects
              </Link>
              <span className="phase-shell-divider">/</span>
              <span>{project.projectName}</span>
              <span className="phase-shell-divider">·</span>
              <Link
                href={`/projects/${project.projectId}/settings/general`}
                className="phase-product-link"
              >
                Settings
              </Link>
            </div>

            <div className="phase-shell-pill-row">
              <span className="phase-shell-pill">Phase 1</span>
              <span className="phase-shell-pill phase-shell-pill-muted">
                {roleLabel}
              </span>
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
              {!canEditPhase1 ? (
                <p className="phase-feedback mt-3" role="status">
                  Read-only workspace. You can inspect the workflow, but only
                  editors and owners can save changes.
                </p>
              ) : null}
              {persistenceFeedback ? (
                <p
                  className={`phase-feedback phase-feedback-${persistenceFeedback.tone} mt-3`}
                  role={
                    persistenceFeedback.tone === "error" ? "alert" : "status"
                  }
                >
                  {persistenceFeedback.message}
                </p>
              ) : null}
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
                <SummaryItem
                  label="Last saved"
                  value={formatDateTime(project.updatedAt)}
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
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <CopyProjectLinkButton projectId={project.projectId} />
              </div>
            </div>
          </div>
        </header>

        <nav aria-label="Phase 1 stages" className="phase-stage-nav">
          {progress.map((stepState) => {
            const href = getPhase1StepPath(project.projectId, stepState.step);
            const isActive = currentStep === stepState.step;
            const isBlocked = stepState.status === "blocked";

            const content = (
              <>
                <span className="phase-stage-eyebrow">{stepState.status}</span>
                <span className="phase-stage-title">{stepState.label}</span>
                <span className="phase-stage-subtitle">
                  {stepState.subtitle}
                </span>
              </>
            );

            if (isBlocked) {
              return (
                <span className="phase-stage-disabled-wrap" key={stepState.step}>
                  <button
                    type="button"
                    className="phase-stage-link phase-stage-link-blocked"
                    disabled
                    aria-describedby={`phase-stage-blocked-${stepState.step}`}
                  >
                    {content}
                  </button>
                  <span
                    className="phase-stage-tooltip"
                    id={`phase-stage-blocked-${stepState.step}`}
                    role="tooltip"
                  >
                    Complete the previous required step before opening{" "}
                    {stepState.label}.
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={stepState.step}
                href={href}
                aria-current={isActive ? "step" : undefined}
                className={`phase-stage-link ${
                  isActive ? "phase-stage-link-active" : ""
                }`}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        <section className="phase-workspace-body min-w-0">{children}</section>
      </div>
    </main>
  );
}

function formatRole(role: ProjectRole) {
  return `${role[0].toUpperCase()}${role.slice(1)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
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
