"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Phase1Topbar from "./phase-topbar";
import { usePhase1Project } from "./project-provider";
import CopyProjectLinkButton from "./copy-project-link-button";
import type { Project, ProjectActivityEvent } from "@/lib/projects/types";
import {
  industryTemplateDefinitions,
  loadSettingsBehaviorSnapshot,
  saveSettingsBehaviorSnapshot,
  type IndustryTemplateId,
} from "@/lib/settings";

// ── Types ──────────────────────────────────────────────────────

interface ActionFeedback {
  message: string;
  tone: "error" | "success";
}

type SettingsTab = "templates" | "general" | "ai" | "about";

// ── Industry templates data ────────────────────────────────────

// ── GeneralSettingsView ────────────────────────────────────────

export interface GeneralSettingsViewProps {
  actionFeedback: ActionFeedback | null;
  archiveConfirmOpen: boolean;
  deleteConfirmInput: string;
  deleteConfirmOpen: boolean;
  isArchiving: boolean;
  isDeleting: boolean;
  isSaving: boolean;
  isOwner: boolean;
  isServerBacked: boolean;
  project: Project | null;
  projectId: string;
  projectName: string;
  recentActivityEvents: ProjectActivityEvent[];
  formCustomerName: string;
  formDescription: string;
  formName: string;
  formNameError: string | null;
  onArchiveCancel: () => void;
  onArchiveConfirm: () => void;
  onArchiveRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onDeleteConfirmInputChange: (value: string) => void;
  onDeleteRequest: () => void;
  onFormCustomerNameChange: (value: string) => void;
  onFormDescriptionChange: (value: string) => void;
  onFormNameChange: (value: string) => void;
  onFormSubmit: (e: React.FormEvent) => void;
  onRemoveLocalProject: () => void;
  onResetLocalProject: () => void;
  onUnarchiveRequest: () => void;
}

export function GeneralSettingsView({
  actionFeedback,
  archiveConfirmOpen,
  deleteConfirmInput,
  deleteConfirmOpen,
  isArchiving,
  isDeleting,
  isSaving,
  isOwner,
  isServerBacked,
  project,
  projectId,
  projectName,
  recentActivityEvents,
  formCustomerName,
  formDescription,
  formName,
  formNameError,
  onArchiveCancel,
  onArchiveConfirm,
  onArchiveRequest,
  onDeleteCancel,
  onDeleteConfirm,
  onDeleteConfirmInputChange,
  onDeleteRequest,
  onFormCustomerNameChange,
  onFormDescriptionChange,
  onFormNameChange,
  onFormSubmit,
  onRemoveLocalProject,
  onResetLocalProject,
  onUnarchiveRequest,
}: GeneralSettingsViewProps) {
  const isArchived = project?.status === "archived";
  const canManageLifecycle = isOwner && isServerBacked;
  const deleteMatchesName = deleteConfirmInput.trim() === projectName.trim();

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {actionFeedback ? (
        <div
          className={`fv-callout ${actionFeedback.tone === "success" ? "fv-callout-success" : "fv-callout-error"}`}
          role={actionFeedback.tone === "error" ? "alert" : "status"}
        >
          {actionFeedback.message}
        </div>
      ) : null}

      {/* Project metadata */}
      <section aria-labelledby="general-metadata-heading" className="fv-card">
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <h2 className="fv-card-title" style={{ margin: 0 }} id="general-metadata-heading">
            Project details
          </h2>
          <CopyProjectLinkButton projectId={projectId} />
        </div>
        {!isOwner && (
          <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", margin: "0 0 1rem" }}>
            You have read-only access to project details.
          </p>
        )}

        <form style={{ display: "grid", gap: "1rem", maxWidth: "480px" }} noValidate onSubmit={onFormSubmit}>
          <div style={{ display: "grid", gap: "0.3rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-fg)", letterSpacing: "0.04em" }} htmlFor="general-project-name">
              Project name
            </label>
            <input
              aria-describedby={formNameError ? "general-name-error" : undefined}
              aria-invalid={!!formNameError}
              disabled={!isOwner || isSaving}
              id="general-project-name"
              required
              type="text"
              value={formName}
              onChange={(e) => onFormNameChange(e.target.value)}
              className={`fv-input${formNameError ? " fv-input-error" : ""}`}
            />
            {formNameError ? (
              <p style={{ fontSize: "0.75rem", color: "var(--status-error, #ef4444)", margin: 0 }} id="general-name-error" role="alert">
                {formNameError}
              </p>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: "0.3rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-fg)", letterSpacing: "0.04em" }} htmlFor="general-customer-name">
              Customer name
            </label>
            <input
              disabled={!isOwner || isSaving}
              id="general-customer-name"
              placeholder="Optional"
              type="text"
              value={formCustomerName}
              onChange={(e) => onFormCustomerNameChange(e.target.value)}
              className="fv-input"
            />
          </div>

          {isServerBacked && (
            <div style={{ display: "grid", gap: "0.3rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-fg)", letterSpacing: "0.04em" }} htmlFor="general-description">
                Description
              </label>
              <textarea
                disabled={!isOwner || isSaving}
                id="general-description"
                placeholder="Optional"
                rows={3}
                value={formDescription}
                onChange={(e) => onFormDescriptionChange(e.target.value)}
                className="fv-input"
                style={{ resize: "vertical" }}
              />
            </div>
          )}

          {isOwner && (
            <div>
              <button disabled={isSaving} type="submit" className="fv-btn-primary">
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </form>
      </section>

      {isOwner && !isServerBacked ? (
        <section aria-labelledby="general-local-demo-heading" className="fv-card">
          <h2 className="fv-card-title" id="general-local-demo-heading" style={{ marginBottom: "0.25rem" }}>
            Local demo controls
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", margin: "0 0 1rem" }}>
            Reset this browser-only project for another walkthrough, or remove it from the local project list.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <button type="button" onClick={onResetLocalProject} className="fv-btn-secondary">
              Reset to sample start
            </button>
            <button type="button" onClick={onRemoveLocalProject} className="fv-btn-secondary">
              Remove from local list
            </button>
          </div>
        </section>
      ) : null}

      {canManageLifecycle && (
        <section aria-labelledby="general-archive-heading" className="fv-card">
          <h2 className="fv-card-title" id="general-archive-heading" style={{ marginBottom: "0.25rem" }}>
            {isArchived ? "Unarchive project" : "Archive project"}
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", margin: "0 0 1rem" }}>
            {isArchived
              ? "Restore this project to active status. It will reappear normally on the dashboard."
              : "Archived projects are kept but marked as inactive. You can unarchive at any time."}
          </p>
          {archiveConfirmOpen ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <p style={{ fontSize: "0.875rem", margin: 0 }}>
                Archive <strong>{projectName}</strong>? The project will be marked as inactive but not deleted.
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button disabled={isArchiving} type="button" onClick={onArchiveConfirm} className="fv-btn-primary">
                  {isArchiving ? "Archiving…" : "Confirm archive"}
                </button>
                <button disabled={isArchiving} type="button" onClick={onArchiveCancel} className="fv-btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              disabled={isArchiving}
              type="button"
              onClick={isArchived ? onUnarchiveRequest : onArchiveRequest}
              className="fv-btn-secondary"
            >
              {isArchiving
                ? isArchived ? "Unarchiving…" : "Archiving…"
                : isArchived ? "Unarchive project" : "Archive project"}
            </button>
          )}
        </section>
      )}

      {canManageLifecycle && (
        <section aria-labelledby="general-delete-heading" className="fv-card" style={{ borderColor: "var(--status-error, #ef4444)" }}>
          <h2 className="fv-card-title" id="general-delete-heading" style={{ marginBottom: "0.25rem", color: "var(--status-error, #ef4444)" }}>
            Delete project
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", margin: "0 0 1rem" }}>
            Permanently delete this project and all associated data. This cannot be undone.
          </p>
          {deleteConfirmOpen ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <p style={{ fontSize: "0.875rem", margin: 0 }}>
                Type <strong>{projectName}</strong> to confirm deletion.
              </p>
              <input
                aria-label="Type project name to confirm deletion"
                disabled={isDeleting}
                placeholder={projectName}
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => onDeleteConfirmInputChange(e.target.value)}
                className="fv-input"
                style={{ maxWidth: "320px" }}
              />
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  aria-disabled={!deleteMatchesName || isDeleting}
                  disabled={!deleteMatchesName || isDeleting}
                  type="button"
                  onClick={onDeleteConfirm}
                  className="fv-btn-danger"
                >
                  {isDeleting ? "Deleting…" : "Delete project"}
                </button>
                <button disabled={isDeleting} type="button" onClick={onDeleteCancel} className="fv-btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={onDeleteRequest} className="fv-btn-danger">
              Delete project…
            </button>
          )}
        </section>
      )}

      {isServerBacked ? (
        <section aria-labelledby="general-activity-heading" className="fv-card">
          <h2 className="fv-card-title" id="general-activity-heading" style={{ marginBottom: "0.75rem" }}>
            Recent activity
          </h2>
          {recentActivityEvents.length > 0 ? (
            <div className="phase-status-list">
              {recentActivityEvents.map((event) => (
                <div className="phase-status-item" key={event.id}>
                  <span className="phase-status-dot phase-status-complete" />
                  <div>
                    <p className="phase-status-label">{formatActivityEvent(event)}</p>
                    <p className="phase-status-meta">{formatActivityDate(event.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)" }}>
              Project events will appear here after the first saved action.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}

// ── TemplatesTab ───────────────────────────────────────────────

function TemplatesTab({ projectId }: { projectId: string }) {
  const [selectedId, setSelectedId] = useState<IndustryTemplateId | null>(() =>
    typeof window === "undefined"
      ? null
      : loadSettingsBehaviorSnapshot(window.localStorage).industryTemplateId,
  );
  const [saved, setSaved] = useState(false);
  const selected =
    industryTemplateDefinitions.find((template) => template.id === selectedId) ??
    null;

  function handleApplyTemplate() {
    const snapshot = loadSettingsBehaviorSnapshot(window.localStorage);
    saveSettingsBehaviorSnapshot(window.localStorage, {
      ...snapshot,
      industryTemplateId: selectedId,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: "0 0 0.25rem" }}>
          Industry Templates
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted-fg)", margin: 0 }}>
          Select a template to preset requirement categories and generation hints for your industry vertical.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 300px" : "1fr", gap: "1rem", alignItems: "start" }}>
        {/* Template grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
          {industryTemplateDefinitions.map((template) => {
            const isActive = selectedId === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setSelectedId(isActive ? null : template.id);
                  setSaved(false);
                }}
                style={{
                  display: "grid",
                  gap: "0.5rem",
                  padding: "1rem",
                  border: `2px solid ${isActive ? "var(--brand-primary)" : "var(--surface-border)"}`,
                  borderRadius: "8px",
                  background: isActive ? "color-mix(in srgb, var(--brand-primary) 6%, #ffffff)" : "#ffffff",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                aria-pressed={isActive}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--foreground)" }}>
                    {template.label}
                  </span>
                  {isActive && (
                    <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14, flexShrink: 0, color: "var(--brand-primary)" }}>
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--muted-fg)", margin: 0, lineHeight: 1.4 }}>
                  {template.description}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.25rem" }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.4rem", background: "var(--surface-muted)", borderRadius: "3px", color: "var(--muted-fg)" }}>
                    {template.defaults.requirementFocus.length} focus areas
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Template details */}
        {selected && (
          <div className="fv-card" style={{ position: "sticky", top: "1rem" }}>
            <div className="fv-card-title" style={{ marginBottom: "0.5rem" }}>{selected.label}</div>
            <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", margin: "0 0 1rem", lineHeight: 1.5 }}>
              {selected.description}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1.25rem" }}>
              {[...selected.defaults.processGuidance, ...selected.defaults.requirementFocus].map((tag) => (
                <span
                  key={tag}
                  style={{ fontSize: "0.7rem", fontWeight: 600, padding: "0.2rem 0.5rem", background: "color-mix(in srgb, var(--brand-primary) 10%, transparent)", color: "var(--brand-primary)", borderRadius: "4px" }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={handleApplyTemplate}
                className="fv-btn-primary"
                style={{ flex: 1, justifyContent: "center" }}
              >
                Use for next project
              </button>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link
                  href={`/projects/${projectId}/source`}
                  className="fv-btn-secondary"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  Back to source
                </Link>
                <button type="button" onClick={() => setSelectedId(null)} className="fv-btn-secondary">
                  Clear
                </button>
              </div>
              {saved ? (
                <p role="status" className="fv-help-text" style={{ margin: 0 }}>
                  Template saved for the next project you create.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Toggle component ───────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      style={{
        flexShrink: 0,
        width: "2.5rem",
        height: "1.375rem",
        borderRadius: "999px",
        border: "none",
        background: checked ? "var(--brand-primary)" : "var(--surface-border)",
        cursor: "pointer",
        padding: "2px",
        transition: "background 0.2s",
        display: "flex",
        alignItems: "center",
      }}
    >
      <span
        style={{
          display: "block",
          width: "1rem",
          height: "1rem",
          borderRadius: "50%",
          background: "#ffffff",
          transition: "transform 0.2s",
          transform: checked ? "translateX(1.125rem)" : "translateX(0)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

// ── AIConfigTab ────────────────────────────────────────────────

const AI_PREFS_KEY = "mes-advisor-ai-prefs";

interface AIPrefs {
  confidenceThreshold: number;
  verbosity: "low" | "medium" | "high";
  autoReview: boolean;
  includeExplanations: boolean;
}

const AI_DEFAULTS: AIPrefs = {
  confidenceThreshold: 75,
  verbosity: "medium",
  autoReview: true,
  includeExplanations: true,
};

function AIConfigTab() {
  const [prefs, setPrefs] = useState<AIPrefs>(() => {
    if (typeof window === "undefined") return AI_DEFAULTS;
    try {
      const stored = localStorage.getItem(AI_PREFS_KEY);
      return stored ? { ...AI_DEFAULTS, ...JSON.parse(stored) } : AI_DEFAULTS;
    } catch { return AI_DEFAULTS; }
  });
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof AIPrefs>(key: K, value: AIPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(AI_PREFS_KEY, JSON.stringify(prefs));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setPrefs(AI_DEFAULTS);
    setSaved(false);
    try {
      localStorage.removeItem(AI_PREFS_KEY);
    } catch {}
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: "0 0 0.25rem" }}>
          AI Configuration
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted-fg)", margin: 0 }}>
          Adjust how the AI advisor generates, scores, and presents requirements.
        </p>
      </div>

      <section className="fv-card" aria-labelledby="ai-params-heading">
        <div className="fv-card-title" id="ai-params-heading" style={{ marginBottom: "1.25rem" }}>
          AI Parameters
        </div>

        <div style={{ display: "grid", gap: "1.5rem", maxWidth: "480px" }}>
          {/* Confidence threshold */}
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }} htmlFor="ai-confidence">
                Confidence threshold
              </label>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--brand-primary)", minWidth: "3rem", textAlign: "right" }}>
                {prefs.confidenceThreshold}%
              </span>
            </div>
            <input
              id="ai-confidence"
              type="range"
              min={50}
              max={95}
              step={5}
              value={prefs.confidenceThreshold}
              onChange={(e) => update("confidenceThreshold", Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--brand-primary)" }}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--muted-fg)", margin: 0 }}>
              Requirements below this score are flagged for manual review.
            </p>
          </div>

          {/* Verbosity */}
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }} htmlFor="ai-verbosity">
              Response verbosity
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["low", "medium", "high"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => update("verbosity", level)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    border: `2px solid ${prefs.verbosity === level ? "var(--brand-primary)" : "var(--surface-border)"}`,
                    borderRadius: "6px",
                    background: prefs.verbosity === level ? "color-mix(in srgb, var(--brand-primary) 8%, #ffffff)" : "#ffffff",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: prefs.verbosity === level ? "var(--brand-primary)" : "var(--muted-fg)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.15s",
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--muted-fg)", margin: 0 }}>
              Controls the level of detail in generated requirement descriptions.
            </p>
          </div>

          {/* Toggles */}
          <div style={{ display: "grid", gap: "0.875rem" }}>
            {[
              { key: "autoReview" as const, label: "Auto-review", desc: "Automatically move completed generations to the review stage." },
              { key: "includeExplanations" as const, label: "Include explanations", desc: "Append rationale and mapping notes to each generated requirement." },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>{label}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>{desc}</div>
                </div>
                <Toggle
                  id={`ai-toggle-${key}`}
                  checked={prefs[key] as boolean}
                  onChange={(val) => update(key, val)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button type="button" onClick={handleSave} className="fv-btn-primary">
          Save changes
        </button>
        <button type="button" onClick={handleReset} className="fv-btn-secondary">
          Reset to defaults
        </button>
        {saved && (
          <span style={{ fontSize: "0.8rem", color: "var(--status-approved)" }}>
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

// ── AboutTab ───────────────────────────────────────────────────

function AboutTab() {
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: "0 0 0.25rem" }}>
          About
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted-fg)", margin: 0 }}>
          Version information, resources, and data management.
        </p>
      </div>

      {/* Version */}
      <section className="fv-card" aria-labelledby="about-version-heading">
        <div className="fv-card-title" id="about-version-heading" style={{ marginBottom: "0.75rem" }}>
          Version
        </div>
        <div style={{ display: "grid", gap: "0.375rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--foreground)" }}>v0.9.1-beta</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.5rem", background: "color-mix(in srgb, var(--brand-primary) 12%, transparent)", color: "var(--brand-primary)", borderRadius: "4px" }}>
              Pilot
            </span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", margin: 0 }}>
            LGP 2026 · FEUP × Critical Manufacturing
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="fv-card" aria-labelledby="about-stats-heading">
        <div className="fv-card-title" id="about-stats-heading" style={{ marginBottom: "0.875rem" }}>
          Session statistics
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem" }}>
          {[
            { label: "Requirements generated", value: "—" },
            { label: "Phases completed", value: "—" },
            { label: "Templates applied", value: "—" },
            { label: "Last export", value: "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: "0.75rem", background: "var(--surface-muted)", borderRadius: "6px" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.25rem" }}>{value}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted-fg)", lineHeight: 1.3 }}>{label}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--muted-fg)", margin: "0.75rem 0 0" }}>
          Per-project statistics are available after completing Phase 1 and exporting results.
        </p>
      </section>

      {/* Resources */}
      <section className="fv-card" aria-labelledby="about-resources-heading">
        <div className="fv-card-title" id="about-resources-heading" style={{ marginBottom: "0.875rem" }}>
          Resources
        </div>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {[
            { label: "Getting started guide", href: "/docs/getting-started" },
            { label: "Requirement generation reference", href: "/docs/generation" },
            { label: "Release checklist", href: "/docs/release-checklist" },
            { label: "Partner integration notes", href: "/docs/partner" },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.625rem 0.75rem",
                border: "1px solid var(--surface-border)",
                borderRadius: "6px",
                fontSize: "0.85rem",
                color: "var(--foreground)",
                textDecoration: "none",
                transition: "background 0.15s",
              }}
            >
              {label}
              <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14, color: "var(--muted-fg)" }}>
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── GeneralPrefsSection (inside General tab) ───────────────────

const GENERAL_PREFS_KEY = "mes-advisor-general-prefs";

interface GeneralPrefs {
  consultantName: string;
  mesVersion: string;
  outputLanguage: string;
  autoSave: boolean;
  emailNotifications: boolean;
  phaseAlerts: boolean;
  collaborationUpdates: boolean;
}

const GENERAL_PREFS_DEFAULTS: GeneralPrefs = {
  consultantName: "",
  mesVersion: "CM V10",
  outputLanguage: "English",
  autoSave: true,
  emailNotifications: false,
  phaseAlerts: true,
  collaborationUpdates: true,
};

function GeneralPrefsSection() {
  const [prefs, setPrefs] = useState<GeneralPrefs>(() => {
    if (typeof window === "undefined") return GENERAL_PREFS_DEFAULTS;
    try {
      const stored = localStorage.getItem(GENERAL_PREFS_KEY);
      return stored ? { ...GENERAL_PREFS_DEFAULTS, ...JSON.parse(stored) } : GENERAL_PREFS_DEFAULTS;
    } catch { return GENERAL_PREFS_DEFAULTS; }
  });
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof GeneralPrefs>(key: K, value: GeneralPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(GENERAL_PREFS_KEY, JSON.stringify(prefs));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <section className="fv-card" aria-labelledby="prefs-defaults-heading">
        <div className="fv-card-title" id="prefs-defaults-heading" style={{ marginBottom: "1rem" }}>
          Project defaults
        </div>
        <div style={{ display: "grid", gap: "1rem", maxWidth: "480px" }}>
          <div style={{ display: "grid", gap: "0.3rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-fg)", letterSpacing: "0.04em" }} htmlFor="prefs-consultant-name">
              Consultant name
            </label>
            <input
              id="prefs-consultant-name"
              type="text"
              placeholder="Your name"
              value={prefs.consultantName}
              onChange={(e) => update("consultantName", e.target.value)}
              className="fv-input"
            />
          </div>
          <div style={{ display: "grid", gap: "0.3rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-fg)", letterSpacing: "0.04em" }} htmlFor="prefs-mes-version">
              MES version
            </label>
            <select
              id="prefs-mes-version"
              value={prefs.mesVersion}
              onChange={(e) => update("mesVersion", e.target.value)}
              className="fv-input"
              style={{ cursor: "pointer" }}
            >
              <option>CM V8</option>
              <option>CM V9</option>
              <option>CM V10</option>
            </select>
          </div>
          <div style={{ display: "grid", gap: "0.3rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-fg)", letterSpacing: "0.04em" }} htmlFor="prefs-output-language">
              Output language
            </label>
            <select
              id="prefs-output-language"
              value={prefs.outputLanguage}
              onChange={(e) => update("outputLanguage", e.target.value)}
              className="fv-input"
              style={{ cursor: "pointer" }}
            >
              <option>English</option>
              <option>Portuguese</option>
              <option>Spanish</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button type="button" onClick={handleSave} className="fv-btn-primary">
              Save changes
            </button>
            {saved && (
              <span style={{ fontSize: "0.8rem", color: "var(--status-approved)" }}>Saved</span>
            )}
          </div>
        </div>
      </section>

      <section className="fv-card" aria-labelledby="prefs-notifications-heading">
        <div className="fv-card-title" id="prefs-notifications-heading" style={{ marginBottom: "1rem" }}>
          Notifications &amp; behaviour
        </div>
        <div style={{ display: "grid", gap: "0.875rem" }}>
          {[
            { key: "autoSave" as const, label: "Auto-save requirements", desc: "Persist review changes automatically as you work." },
            { key: "emailNotifications" as const, label: "Email notifications", desc: "Receive emails when collaborators make changes." },
            { key: "phaseAlerts" as const, label: "Phase completion alerts", desc: "Show an in-app alert when a phase is completed." },
            { key: "collaborationUpdates" as const, label: "Collaboration updates", desc: "Notify when team members join or update this project." },
          ].map(({ key, label, desc }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <div>
                <label htmlFor={`notif-${key}`} style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: "0.125rem", cursor: "pointer" }}>
                  {label}
                </label>
                <span style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>{desc}</span>
              </div>
              <Toggle
                id={`notif-${key}`}
                checked={prefs[key] as boolean}
                onChange={(val) => {
                  update(key, val);
                  try {
                    localStorage.setItem(GENERAL_PREFS_KEY, JSON.stringify({ ...prefs, [key]: val }));
                  } catch {}
                }}
              />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

// ── GeneralSettings (main export with full shell) ──────────────

export default function GeneralSettings({
  isOwner,
  isServerBacked,
  projectId,
  recentActivityEvents = [],
  serverProject,
}: {
  isOwner: boolean;
  isServerBacked: boolean;
  projectId: string;
  recentActivityEvents?: ProjectActivityEvent[];
  serverProject: Project | null;
}) {
  const {
    project: localProject,
    removeLocalProjectFromQueue,
    resetLocalProjectProgress,
    updateLocalProjectMetadata,
  } = usePhase1Project();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(serverProject);
  const sourceFormName = project?.name ?? localProject?.projectName ?? "";
  const sourceFormCustomerName = project?.customerName ?? localProject?.customerName ?? "";
  const sourceFormDescription = project?.description ?? "";
  const projectName = sourceFormName || "Project";

  const [formName, setFormName] = useState(sourceFormName);
  const [formCustomerName, setFormCustomerName] = useState(sourceFormCustomerName);
  const [formDescription, setFormDescription] = useState(sourceFormDescription);
  const [formNameError, setFormNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setFormName(sourceFormName);
    setFormCustomerName(sourceFormCustomerName);
    setFormDescription(sourceFormDescription);
    setFormNameError(null);
  }, [sourceFormCustomerName, sourceFormDescription, sourceFormName]);

  const showFeedback = useCallback((message: string, tone: "error" | "success") => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setActionFeedback({ message, tone });
    feedbackTimerRef.current = setTimeout(() => setActionFeedback(null), 5000);
  }, []);

  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) { setFormNameError("Project name is required."); return; }
    setFormNameError(null);
    setIsSaving(true);

    if (!isServerBacked) {
      updateLocalProjectMetadata(trimmedName, formCustomerName.trim() || null);
      showFeedback("Project details saved.", "success");
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        body: JSON.stringify({ customerName: formCustomerName.trim() || null, description: formDescription.trim() || null, name: trimmedName }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { showFeedback(body?.error ?? "Changes could not be saved. Please try again.", "error"); return; }
      setProject(body as Project);
      showFeedback("Project details saved.", "success");
    } catch {
      showFeedback("Could not reach the server. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [formCustomerName, formDescription, formName, isServerBacked, projectId, showFeedback, updateLocalProjectMetadata]);

  const handleResetLocalProject = useCallback(() => {
    resetLocalProjectProgress();
    showFeedback("Local demo reset to the sample workbook start.", "success");
    router.push(`/projects/${encodeURIComponent(projectId)}/source`);
  }, [projectId, resetLocalProjectProgress, router, showFeedback]);

  const handleRemoveLocalProject = useCallback(() => {
    if (!window.confirm("Remove this local project from the project list on this browser?")) return;
    removeLocalProjectFromQueue();
    router.push("/");
  }, [removeLocalProjectFromQueue, router]);

  const handleArchiveConfirm = useCallback(async () => {
    setIsArchiving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/settings/archive`, { body: JSON.stringify({ action: "archive" }), headers: { "content-type": "application/json" }, method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { showFeedback(body?.error ?? "Project could not be archived. Please try again.", "error"); return; }
      setProject(body as Project);
      setArchiveConfirmOpen(false);
      showFeedback("Project archived.", "success");
    } catch { showFeedback("Could not reach the server. Please try again.", "error"); } finally { setIsArchiving(false); }
  }, [projectId, showFeedback]);

  const handleUnarchiveRequest = useCallback(async () => {
    setIsArchiving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/settings/archive`, { body: JSON.stringify({ action: "unarchive" }), headers: { "content-type": "application/json" }, method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { showFeedback(body?.error ?? "Project could not be unarchived. Please try again.", "error"); return; }
      setProject(body as Project);
      showFeedback("Project restored to active.", "success");
    } catch { showFeedback("Could not reach the server. Please try again.", "error"); } finally { setIsArchiving(false); }
  }, [projectId, showFeedback]);

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, { body: JSON.stringify({ confirmationName: projectName }), headers: { "content-type": "application/json" }, method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { showFeedback(body?.error ?? "Project could not be deleted. Please try again.", "error"); return; }
      router.push("/");
    } catch {
      showFeedback("Could not reach the server. Please try again.", "error");
      setIsDeleting(false);
    }
  }, [projectId, projectName, router, showFeedback]);

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "templates", label: "Industry Templates" },
    { id: "general", label: "General" },
    { id: "ai", label: "AI Configuration" },
    { id: "about", label: "About" },
  ];

  return (
    <div className="fv-shell">
      <Phase1Topbar email={undefined} projectId={projectId.slice(0, 8).toUpperCase()} />
      <div className="fv-body">
        {/* Sidebar */}
        <nav className="fv-sidebar" aria-label="Settings navigation">
          <div className="fv-sidebar-section">
            <span className="fv-sidebar-label">Current Project</span>
            <span className="fv-sidebar-project-name">{projectName}</span>
          </div>

          <div className="fv-sidebar-section">
            <span className="fv-sidebar-label">Navigation</span>
            <Link href="/" className="fv-nav-item">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="2" y="2" width="5" height="5" rx="1" />
                <rect x="9" y="2" width="5" height="5" rx="1" />
                <rect x="2" y="9" width="5" height="5" rx="1" />
                <rect x="9" y="9" width="5" height="5" rx="1" />
              </svg>
              Projects
            </Link>
            <Link href={`/projects/${projectId}`} className="fv-nav-item">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M8 2v8M5 7l3 3 3-3" />
                <path d="M3 12h10" />
              </svg>
              Workflow
            </Link>
            <span className="fv-nav-item fv-nav-item-active" aria-current="page">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="8" cy="8" r="2.5" />
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M11.4 3.2l-1.4 1.4M3.2 11.4l1.4-1.4" />
              </svg>
              Settings
            </span>
            <Link href={`/projects/${projectId}/settings/collaboration`} className="fv-nav-item">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="5.5" cy="5" r="2" />
                <circle cx="10.5" cy="5" r="2" />
                <path d="M2 13c0-2 1.6-3 3.5-3s3.5 1 3.5 3" />
                <path d="M10.5 10c1.8 0 3.5 1 3.5 3" />
              </svg>
              Collaboration
            </Link>
          </div>
        </nav>

        {/* Main content */}
        <main className="fv-content" id="main-content">
          <div className="fv-page">
            {/* Breadcrumb */}
            <nav className="fv-breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: "1.25rem" }}>
              <Link href="/" className="fv-breadcrumb-link">Projects</Link>
              <span className="fv-breadcrumb-sep">/</span>
              <Link href={`/projects/${projectId}`} className="fv-breadcrumb-link">{projectName}</Link>
              <span className="fv-breadcrumb-sep">/</span>
              <span>Settings</span>
            </nav>

            {/* Tab nav */}
            <nav
              aria-label="Settings sections"
              style={{
                display: "flex",
                gap: "0",
                borderBottom: "1px solid var(--surface-border)",
                marginBottom: "1.5rem",
              }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "0.625rem 1.125rem",
                    fontSize: "0.85rem",
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    color: activeTab === tab.id ? "var(--brand-primary)" : "var(--muted-fg)",
                    border: "none",
                    borderBottom: activeTab === tab.id ? "2px solid var(--brand-primary)" : "2px solid transparent",
                    marginBottom: "-1px",
                    background: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "color 0.15s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Tab content */}
            {activeTab === "templates" && <TemplatesTab projectId={projectId} />}

            {activeTab === "general" && (
              <div style={{ display: "grid", gap: "1.25rem" }}>
                <GeneralSettingsView
                  actionFeedback={actionFeedback}
                  archiveConfirmOpen={archiveConfirmOpen}
                  deleteConfirmInput={deleteConfirmInput}
                  deleteConfirmOpen={deleteConfirmOpen}
                  formCustomerName={formCustomerName}
                  formDescription={formDescription}
                  formName={formName}
                  formNameError={formNameError}
                  isArchiving={isArchiving}
                  isDeleting={isDeleting}
                  isOwner={isOwner}
                  isServerBacked={isServerBacked}
                  isSaving={isSaving}
                  project={project}
                  projectId={projectId}
                  projectName={projectName}
                  recentActivityEvents={recentActivityEvents}
                  onArchiveCancel={() => setArchiveConfirmOpen(false)}
                  onArchiveConfirm={handleArchiveConfirm}
                  onArchiveRequest={() => setArchiveConfirmOpen(true)}
                  onDeleteCancel={() => { setDeleteConfirmOpen(false); setDeleteConfirmInput(""); }}
                  onDeleteConfirm={handleDeleteConfirm}
                  onDeleteConfirmInputChange={setDeleteConfirmInput}
                  onDeleteRequest={() => setDeleteConfirmOpen(true)}
                  onFormCustomerNameChange={setFormCustomerName}
                  onFormDescriptionChange={setFormDescription}
                  onFormNameChange={setFormName}
                  onFormSubmit={handleFormSubmit}
                  onRemoveLocalProject={handleRemoveLocalProject}
                  onResetLocalProject={handleResetLocalProject}
                  onUnarchiveRequest={handleUnarchiveRequest}
                />
                <GeneralPrefsSection />
              </div>
            )}

            {activeTab === "ai" && <AIConfigTab />}
            {activeTab === "about" && <AboutTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Formatters ─────────────────────────────────────────────────

function formatActivityEvent(event: ProjectActivityEvent) {
  switch (event.eventType) {
    case "project_metadata_updated": return "Project details updated";
    case "project_archived": return "Project archived";
    case "project_unarchived": return "Project restored";
    case "project_member_added": return "Project member added";
    case "project_member_removed": return "Project member removed";
    case "project_member_role_updated": return "Project member role updated";
    case "project_invite_created": return "Invite created";
    case "project_invite_revoked": return "Invite revoked";
    case "project_invite_accepted": return "Invite accepted";
    default:
      return event.eventType
        .split("_")
        .filter(Boolean)
        .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
        .join(" ");
  }
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-US", { day: "numeric", hour: "numeric", minute: "2-digit", month: "short" }).format(date);
}
