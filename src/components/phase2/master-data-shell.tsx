"use client";

import { useState } from "react";
import Link from "next/link";
import type { Phase1ProjectRecord } from "@/lib/phase1/project-registry";
import Phase1Topbar from "@/components/phase1/phase-topbar";
import { getMasterDataStepPath } from "@/lib/master-data/workflow";
import {
  masterDataWorkflowMeta,
  masterDataWorkflowSteps,
  type MasterDataPhase2State,
  type MasterDataWorkflowStep,
} from "@/lib/master-data/types";

const STEP_LABELS: Record<MasterDataWorkflowStep, string> = {
  setup: "Configure Scope",
  process: "Generate Master Data",
  review: "Review & Approve",
  export: "Export & Download",
  traceability: "Traceability",
};

const STEP_SUBLABELS: Partial<Record<MasterDataWorkflowStep, string>> = {
  setup: "Approved Phase 1 rows",
  process: "AI processing…",
  review: "Review objects",
  export: "Configure & export",
  traceability: "View trace",
};

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <polyline points="2 6 5 9 10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  const approvedCount = Object.values(phase2.generatedObjects)
    .flat()
    .filter((o) => o.reviewStatus === "approved").length;
  const modifiedCount = Object.values(phase2.generatedObjects)
    .flat()
    .filter((o) => o.reviewStatus === "review").length;
  const pendingCount = objectCount - approvedCount - modifiedCount;

  const currentStepIndex = masterDataWorkflowSteps.indexOf(currentStep);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentLabel = STEP_LABELS[currentStep] ?? currentStep;

  const sessionDate = new Date().toISOString().slice(0, 10);

  const contextSections = buildContextSections(currentStep, phase2, {
    objectCount,
    approvedCount,
    modifiedCount,
    pendingCount,
    sessionDate,
    projectId: project.projectId,
    customerName: project.snapshot.sourceFilename ?? project.projectName,
  });

  return (
    <div className="fv-shell">
      <Phase1Topbar
        email={undefined}
        projectId={project.projectId.slice(0, 8).toUpperCase()}
      />

      {/* Mobile nav — hidden on desktop via CSS */}
      <div className="fv-mobile-nav" aria-label="Mobile navigation">
        <div className="fv-mobile-nav-bar">
          <div>
            <div className="fv-mobile-nav-label">{project.projectName}</div>
            <div className="fv-mobile-nav-current">{currentLabel}</div>
          </div>
          <button
            type="button"
            className="fv-mobile-nav-toggle"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            {mobileNavOpen ? "✕ Close" : "☰ Steps"}
          </button>
        </div>
        {mobileNavOpen ? (
          <div className="fv-mobile-nav-drawer">
            <Link href="/" className="fv-nav-item" onClick={() => setMobileNavOpen(false)}>
              Projects
            </Link>
            {masterDataWorkflowSteps.map((step) => {
              const href = getMasterDataStepPath(project.projectId, step);
              const isActive = currentStep === step;
              const status = getMasterDataStepStatus(phase2, step);
              const label = STEP_LABELS[step];
              if (status === "blocked") {
                return (
                  <span key={step} className="fv-nav-item" style={{ opacity: 0.45, cursor: "not-allowed" }} aria-disabled="true">
                    {label}
                  </span>
                );
              }
              return (
                <Link
                  key={step}
                  href={href}
                  aria-current={isActive ? "step" : undefined}
                  className={`fv-nav-item${isActive ? " fv-nav-item-active" : ""}`}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="fv-body">
        {/* Sidebar */}
        <nav className="fv-sidebar" aria-label="Master Data workflow">
          {/* Steps */}
          <div className="fv-sidebar-section">
            <span className="fv-sidebar-label">Progress</span>
            <div className="fv-step-list">
              {masterDataWorkflowSteps.map((step, idx) => {
                const isDone = idx < currentStepIndex;
                const isActive = step === currentStep;
                const href = getMasterDataStepPath(project.projectId, step);
                const status = getMasterDataStepStatus(phase2, step);

                return (
                  <Link
                    key={step}
                    href={status !== "blocked" ? href : "#"}
                    aria-current={isActive ? "step" : undefined}
                    className={`fv-step-item${isActive ? " fv-step-item-active" : ""}`}
                    onClick={status === "blocked" ? (e) => e.preventDefault() : undefined}
                    style={status === "blocked" && !isDone ? { opacity: 0.5, pointerEvents: "none" } : undefined}
                  >
                    <div
                      className={`fv-step-circle ${
                        isDone
                          ? "fv-step-circle-done"
                          : isActive
                            ? "fv-step-circle-active"
                            : "fv-step-circle-future"
                      }`}
                    >
                      {isDone ? <CheckIcon /> : idx + 1}
                    </div>
                    <div className="fv-step-text">
                      <span
                        className={`fv-step-name ${
                          isActive
                            ? "fv-step-name-active"
                            : isDone
                              ? "fv-step-name-done"
                              : ""
                        }`}
                      >
                        {STEP_LABELS[step]}
                      </span>
                      {isActive && STEP_SUBLABELS[step] ? (
                        <span className="fv-step-sub">{STEP_SUBLABELS[step]}</span>
                      ) : isDone && step === "setup" && phase2.applicableRequirements.length > 0 ? (
                        <span className="fv-step-sub">{phase2.applicableRequirements.length > 0 ? masterDataWorkflowMeta[step]?.subtitle : ""}</span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Contextual stats */}
          {contextSections.map((section) => (
            <div className="fv-sidebar-section" key={section.label}>
              <span className="fv-sidebar-label">{section.label}</span>
              {section.items.map((item) => (
                <div className="fv-sidebar-kv" key={item.label}>
                  <span className="fv-sidebar-kv-label">{item.label}</span>
                  <span className={`fv-sidebar-kv-value${item.tone ? ` fv-sidebar-kv-value-${item.tone}` : ""}`}>
                    {item.value}
                  </span>
                </div>
              ))}
              {section.cta ? (
                <button
                  type="button"
                  onClick={section.cta.onClick}
                  disabled={section.cta.disabled}
                  className="fv-sidebar-btn"
                >
                  {section.cta.label}
                </button>
              ) : null}
            </div>
          ))}
        </nav>

        {/* Content */}
        <main className="fv-content" id="main-content">
          <div className="fv-page">
            <nav className="fv-breadcrumb" aria-label="Breadcrumb">
              <Link href="/" className="fv-breadcrumb-link">Projects</Link>
              <span className="fv-breadcrumb-sep">/</span>
              <Link href={`/projects/${encodeURIComponent(project.projectId)}/export`} className="fv-breadcrumb-link">
                {project.projectName}
              </Link>
              <span className="fv-breadcrumb-sep">/</span>
              <span>Master Data</span>
            </nav>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

type ContextItem = { label: string; value: string; tone?: "positive" | "warning" | "danger" };
type ContextSection = {
  label: string;
  items: ContextItem[];
  cta?: { label: string; onClick: () => void; disabled?: boolean };
};

function buildContextSections(
  step: MasterDataWorkflowStep,
  phase2: MasterDataPhase2State,
  ctx: {
    objectCount: number;
    approvedCount: number;
    modifiedCount: number;
    pendingCount: number;
    sessionDate: string;
    projectId: string;
    customerName: string;
  },
): ContextSection[] {
  const sections: ContextSection[] = [];

  if (step === "setup") {
    sections.push({
      label: "Session",
      items: [
        { label: "Customer", value: ctx.customerName.slice(0, 12) },
        { label: "Project", value: ctx.projectId.slice(0, 8).toUpperCase() },
        { label: "Date", value: ctx.sessionDate },
      ],
    });
  }

  if (step === "process") {
    const total = phase2.selectedRequirementKeys.length;
    sections.push({
      label: "Generation",
      items: [
        { label: "Completed", value: `${ctx.objectCount} / ${total}` },
        { label: "Processing", value: phase2.generationStatus === "running" ? "Running…" : phase2.generationStatus },
        { label: "ETA", value: "~12 sec" },
      ],
    });
  }

  if (step === "review") {
    sections.push({
      label: "Review Stats",
      items: [
        { label: "Approved", value: String(ctx.approvedCount), tone: ctx.approvedCount > 0 ? "positive" : undefined },
        { label: "Modified", value: String(ctx.modifiedCount), tone: ctx.modifiedCount > 0 ? "warning" : undefined },
        { label: "Pending", value: String(ctx.pendingCount) },
      ],
    });
  }

  if (step === "export") {
    sections.push({
      label: "Export Summary",
      items: [
        { label: "Total", value: String(ctx.objectCount) },
        { label: "Approved", value: String(ctx.approvedCount), tone: "positive" },
        { label: "Modified", value: String(ctx.modifiedCount), tone: ctx.modifiedCount > 0 ? "warning" : undefined },
        { label: "Issues", value: String(ctx.pendingCount), tone: ctx.pendingCount > 0 ? "danger" : undefined },
      ],
    });
  }

  if (step === "setup" && phase2.applicableRequirements.length > 0) {
    sections.push({
      label: "Analysis",
      items: [
        { label: "Total req.", value: String(phase2.applicableRequirements.length) },
        { label: "Applicable", value: String(phase2.applicableRequirements.filter((r) => r.preselected).length) },
        { label: "Selected", value: String(phase2.selectedRequirementKeys.length) },
      ],
    });
  }

  return sections;
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
      .every((o) => o.reviewStatus === "approved");

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
