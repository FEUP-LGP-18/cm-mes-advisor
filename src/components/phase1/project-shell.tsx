"use client";

import { useState } from "react";
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
import Phase1Topbar from "./phase-topbar";

const NAV_ICONS: Record<string, React.ReactNode> = {
  source: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 2v8M5 7l3 3 3-3" />
      <path d="M3 12h10" />
    </svg>
  ),
  generate: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5.5v2.5l1.5 1.5" />
    </svg>
  ),
  review: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 4h10M3 8h7M3 12h5" />
    </svg>
  ),
  script: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M5 6h6M5 9h4" />
    </svg>
  ),
  export: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 2v8M5 7l3 3 3-3" />
      <path d="M2 12h12" />
    </svg>
  ),
};

const STEP_LABELS: Record<Phase1WorkflowStep, string> = {
  source: "Upload",
  generate: "AI Processing",
  review: "Requirements",
  script: "Script Output",
  export: "Export",
};

export default function Phase1ProjectShell({
  canEditPhase1 = true,
  children,
  currentStep,
  currentUserRole: _currentUserRole = "owner",
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
  const reviewCount = project.snapshot.generatedReviewableCount;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentLabel = STEP_LABELS[currentStep] ?? currentStep;

  return (
    <div className="fv-shell">
      <Phase1Topbar email={email} projectId={project.projectId.slice(0, 8).toUpperCase()} />

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
            {progress.map((stepState) => {
              const href = getPhase1StepPath(project.projectId, stepState.step);
              const isActive = currentStep === stepState.step;
              const isBlocked = stepState.status === "blocked";
              const label = STEP_LABELS[stepState.step] ?? stepState.label;
              if (isBlocked) {
                return (
                  <span key={stepState.step} className="fv-nav-item" style={{ opacity: 0.45, cursor: "not-allowed" }} aria-disabled="true">
                    {label}
                  </span>
                );
              }
              return (
                <Link key={stepState.step} href={href} aria-current={isActive ? "step" : undefined}
                  className={`fv-nav-item${isActive ? " fv-nav-item-active" : ""}`}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {label}
                </Link>
              );
            })}
            <Link href={`/projects/${project.projectId}/master-data/setup`} className="fv-nav-item" onClick={() => setMobileNavOpen(false)}>
              Master Data
            </Link>
          </div>
        ) : null}
      </div>

      <div className="fv-body">
        {/* Sidebar */}
        <nav className="fv-sidebar" aria-label="Project navigation">
          {/* Current project label */}
          <div className="fv-sidebar-section">
            <span className="fv-sidebar-label">Current Project</span>
            <span className="fv-sidebar-project-name">{project.projectName}</span>
          </div>

          {/* Demo Script steps */}
          <div className="fv-sidebar-section">
            <span className="fv-sidebar-label">Demo Script</span>

            <Link href="/" className="fv-nav-item">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="2" y="2" width="5" height="5" rx="1" />
                <rect x="9" y="2" width="5" height="5" rx="1" />
                <rect x="2" y="9" width="5" height="5" rx="1" />
                <rect x="9" y="9" width="5" height="5" rx="1" />
              </svg>
              Projects
            </Link>

            {progress.map((stepState) => {
              const href = getPhase1StepPath(project.projectId, stepState.step);
              const isActive = currentStep === stepState.step;
              const isBlocked = stepState.status === "blocked";
              const label = STEP_LABELS[stepState.step] ?? stepState.label;
              const badge = stepState.step === "review" && reviewCount > 0 ? reviewCount : null;

              if (isBlocked) {
                return (
                  <span
                    key={stepState.step}
                    className="fv-nav-item"
                    style={{ opacity: 0.45, cursor: "not-allowed" }}
                    aria-disabled="true"
                  >
                    {NAV_ICONS[stepState.step]}
                    {label}
                  </span>
                );
              }

              return (
                <Link
                  key={stepState.step}
                  href={href}
                  aria-current={isActive ? "step" : undefined}
                  className={`fv-nav-item${isActive ? " fv-nav-item-active" : ""}`}
                >
                  {NAV_ICONS[stepState.step]}
                  {label}
                  {badge ? <span className="fv-nav-badge">{badge}</span> : null}
                </Link>
              );
            })}
          </div>

          {/* Master Data (Phase 2) */}
          <div className="fv-sidebar-section">
            <span className="fv-sidebar-label">Master Data</span>
            <Link
              href={`/projects/${project.projectId}/master-data/setup`}
              className="fv-nav-item"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="2" y="4" width="12" height="9" rx="1" />
                <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
              </svg>
              Master Data
            </Link>
            <Link
              href={`/projects/${project.projectId}/export`}
              className={`fv-nav-item${currentStep === "export" ? " fv-nav-item-active" : ""}`}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M8 2v8M5 7l3 3 3-3" />
                <path d="M2 12h12" />
              </svg>
              Export
            </Link>
          </div>

          {/* General */}
          <div className="fv-sidebar-section">
            <span className="fv-sidebar-label">General</span>
            <Link
              href={`/projects/${project.projectId}/settings/general`}
              className="fv-nav-item"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="8" cy="8" r="2.5" />
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
              </svg>
              Settings
            </Link>
          </div>
        </nav>

        {/* Content */}
        <main className="fv-content" id="main-content">
          {/* Page breadcrumb + title strip */}
          <div className="fv-page">
            <nav className="fv-breadcrumb" aria-label="Breadcrumb">
              <Link href="/" className="fv-breadcrumb-link">Projects</Link>
              <span className="fv-breadcrumb-sep">/</span>
              <span>{project.projectName}</span>
              <span className="fv-breadcrumb-sep">/</span>
              <span>{phase1WorkflowMeta[currentStep].label}</span>
            </nav>

            <div style={{ marginBottom: "1.25rem" }}>
              <h1 className="fv-page-title">{phase1WorkflowMeta[currentStep].label}</h1>
              <p className="fv-page-subtitle">{nextAction.helper}</p>

              {!canEditPhase1 ? (
                <div className="fv-callout fv-callout-info" style={{ marginTop: "0.75rem" }}>
                  Read-only workspace. You can inspect the workflow, but only editors and owners can save changes.
                </div>
              ) : null}

              {persistenceFeedback ? (
                <div
                  className={`fv-callout fv-callout-${persistenceFeedback.tone === "error" ? "error" : persistenceFeedback.tone === "success" ? "success" : "info"}`}
                  style={{ marginTop: "0.75rem" }}
                  role={persistenceFeedback.tone === "error" ? "alert" : "status"}
                >
                  {persistenceFeedback.message}
                </div>
              ) : null}
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
