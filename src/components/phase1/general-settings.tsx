"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Phase1Topbar from "./phase-topbar";
import { usePhase1Project } from "./project-provider";
import CopyProjectLinkButton from "./copy-project-link-button";
import type { Project, ProjectActivityEvent } from "@/lib/projects/types";
import {
  aiVerbosityLevels,
  defaultGeneralOutputPreferences,
  defaultSafeAiPreferences,
  defaultSettingsBehaviorSnapshot,
  industryTemplateDefinitions,
  loadSettingsBehaviorSnapshot,
  mesVersionOptions,
  outputLanguageOptions,
  safeAiModelAliases,
  saveSettingsBehaviorSnapshot,
  type GeneralOutputPreferences,
  type IndustryTemplateId,
  type MesVersion,
  type OutputLanguage,
  type SafeAiModelAlias,
  type SafeAiPreferences,
  type SafeAiVerbosity,
  type SettingsBehaviorSnapshot,
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

export function TemplatesTab({
  canEditProjectState,
  currentIndustryTemplateId,
  onApplyProjectIndustryTemplate,
  projectId,
}: {
  canEditProjectState: boolean;
  currentIndustryTemplateId: IndustryTemplateId | null;
  onApplyProjectIndustryTemplate: (
    industryTemplateId: IndustryTemplateId | null,
  ) => void;
  projectId: string;
}) {
  const [selectedId, setSelectedId] = useState<IndustryTemplateId | null>(
    currentIndustryTemplateId ?? null,
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
    onApplyProjectIndustryTemplate(selectedId);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleClearTemplate() {
    const snapshot = loadSettingsBehaviorSnapshot(window.localStorage);
    saveSettingsBehaviorSnapshot(window.localStorage, {
      ...snapshot,
      industryTemplateId: null,
    });
    onApplyProjectIndustryTemplate(null);
    setSelectedId(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <SettingsSection
      actions={
        <button
          type="button"
          onClick={handleApplyTemplate}
          className="fv-btn-primary"
          disabled={!canEditProjectState || !selected}
        >
          Save Template
        </button>
      }
      feedback={
        saved
          ? "Template saved for this project and future project setup."
          : !canEditProjectState
            ? "Viewers can inspect templates, but cannot change this project."
            : null
      }
      subtitle="Select the industry profile that best matches this customer. Templates preload safe categories and generation hints."
      title="Industry Templates"
    >
      <section className="fv-card fv-settings-panel" aria-labelledby="template-grid-heading">
        <PanelHeader
          id="template-grid-heading"
          title="Industry Template"
          subtitle="Choose one supported template or clear the selection to keep the default setup."
        />
        <div className="fv-template-grid fv-template-grid-target">
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
                className={`fv-settings-template-card${isActive ? " fv-settings-template-card-active" : ""}`}
                aria-pressed={isActive}
              >
                <div className="fv-settings-template-card-header">
                  <span className="fv-settings-template-icon" aria-hidden="true">
                    {template.label.slice(0, 1)}
                  </span>
                  {isActive ? (
                    <span className="fv-settings-check" aria-hidden="true">✓</span>
                  ) : null}
                </div>
                <strong>{template.label}</strong>
                <p>{template.description}</p>
                <div className="fv-settings-chip-list">
                  {template.defaults.requirementFocus.slice(0, 3).map((tag) => (
                    <span className="fv-settings-chip" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selected ? (
        <section className="fv-card fv-settings-panel" aria-labelledby="template-details-heading">
          <PanelHeader
            id="template-details-heading"
            title={`Template details - ${selected.label}`}
            subtitle="Preloaded categories and hints included in this template."
          />
          <SettingsRow
            control={
              <div className="fv-settings-chip-list">
                {selected.defaults.processGuidance.map((tag) => (
                  <span className="fv-settings-chip fv-settings-chip-blue" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            }
            description="Hints the AI will prioritise when mapping requirements."
            label="MES object categories"
          />
          <SettingsRow
            control={
              <div className="fv-settings-chip-list">
                {selected.defaults.requirementFocus.map((tag) => (
                  <span className="fv-settings-chip fv-settings-chip-green" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            }
            description="Expected requirement areas for this industry."
            label="Requirement categories"
          />
          <SettingsRow
            control={
              <div className="fv-template-actions-row">
                <Link href={`/projects/${projectId}/source`} className="fv-btn-secondary">
                  Back to source
                </Link>
                <button
                  type="button"
                  onClick={handleClearTemplate}
                  className="fv-btn-secondary"
                  disabled={!canEditProjectState}
                >
                  Clear
                </button>
              </div>
            }
            description="Clearing the template keeps uploaded workbook rows and Phase 1 progress unchanged."
            label="Selection controls"
          />
        </section>
      ) : (
        <section className="fv-card fv-settings-panel" aria-labelledby="template-empty-heading">
          <PanelHeader
            id="template-empty-heading"
            title="No template selected"
            subtitle="Projects without a template keep the default Phase 1 setup and existing workbook behavior."
          />
        </section>
      )}
    </SettingsSection>
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

function SettingsSection({
  actions,
  children,
  feedback,
  subtitle,
  title,
}: {
  actions?: React.ReactNode;
  children: React.ReactNode;
  feedback?: string | null;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="fv-settings-section">
      <div className="fv-settings-section-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {actions ? <div className="fv-settings-actions">{actions}</div> : null}
      </div>
      {feedback ? (
        <p className="fv-settings-feedback" role="status">
          {feedback}
        </p>
      ) : null}
      <div className="fv-settings-section-stack">{children}</div>
    </div>
  );
}

function PanelHeader({
  id,
  subtitle,
  title,
}: {
  id: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="fv-settings-panel-header">
      <div>
        <h3 id={id}>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function SettingsRow({
  control,
  description,
  htmlFor,
  label,
}: {
  control: React.ReactNode;
  description: string;
  htmlFor?: string;
  label: string;
}) {
  return (
    <div className="fv-settings-row">
      <div className="fv-settings-row-copy">
        {htmlFor ? (
          <label htmlFor={htmlFor}>{label}</label>
        ) : (
          <span className="fv-settings-row-label">{label}</span>
        )}
        <p>{description}</p>
      </div>
      <div className="fv-settings-row-control">{control}</div>
    </div>
  );
}

// ── AIConfigTab ────────────────────────────────────────────────

const aiModelLabels: Record<SafeAiModelAlias, string> = {
  default: "Default reviewer",
  "grounded-draft": "Grounded draft",
  "review-focused": "Review-focused",
};

const aiVerbosityLabels: Record<SafeAiVerbosity, string> = {
  low: "Brief",
  medium: "Standard",
  high: "Detailed",
};

function AIConfigTab({
  feedback,
  onChange,
  onReset,
  onSave,
  preferences,
}: {
  feedback: string | null;
  onChange: (preferences: SafeAiPreferences) => void;
  onReset: () => void;
  onSave: () => void;
  preferences: SafeAiPreferences;
}) {
  const update = <K extends keyof SafeAiPreferences>(
    key: K,
    value: SafeAiPreferences[K],
  ) => {
    onChange({ ...preferences, [key]: value });
  };

  return (
    <SettingsSection
      actions={
        <>
          <button type="button" onClick={onReset} className="fv-btn-secondary">
            Reset to defaults
          </button>
          <button type="button" onClick={onSave} className="fv-btn-primary">
            Save changes
          </button>
        </>
      }
      feedback={feedback}
      subtitle="Tune only the safe AI behaviours supported by the settings contract."
      title="AI Configuration"
    >
      <section className="fv-card fv-settings-panel" aria-labelledby="ai-params-heading">
        <PanelHeader
          id="ai-params-heading"
          title="AI Parameters"
          subtitle="These preferences guide future generation and review output. They do not reprocess existing rows."
        />
        <SettingsRow
          control={
            <div className="fv-settings-range-control">
              <input
                id="ai-confidence"
                type="range"
                min={50}
                max={95}
                step={5}
                value={preferences.confidenceThreshold}
                onChange={(e) =>
                  update("confidenceThreshold", Number(e.target.value))
                }
              />
              <span>{preferences.confidenceThreshold}%</span>
            </div>
          }
          description="Rows below this value stay visibly review-first instead of being treated as ready."
          htmlFor="ai-confidence"
          label="Confidence threshold"
        />
        <SettingsRow
          control={
            <select
              id="ai-model-alias"
              value={preferences.modelAlias}
              onChange={(event) =>
                update("modelAlias", event.currentTarget.value as SafeAiModelAlias)
              }
              className="fv-input fv-settings-control"
            >
              {safeAiModelAliases.map((alias) => (
                <option key={alias} value={alias}>
                  {aiModelLabels[alias]}
                </option>
              ))}
            </select>
          }
          description="Uses a curated internal generation profile, not an arbitrary model or prompt editor."
          htmlFor="ai-model-alias"
          label="Generation profile"
        />
        <SettingsRow
          control={
            <select
              id="ai-verbosity"
              value={preferences.verbosity}
              onChange={(event) =>
                update("verbosity", event.currentTarget.value as SafeAiVerbosity)
              }
              className="fv-input fv-settings-control"
            >
              {aiVerbosityLevels.map((level) => (
                <option key={level} value={level}>
                  {aiVerbosityLabels[level]}
                </option>
              ))}
            </select>
          }
          description="Controls the level of detail in future AI comments and review notes."
          htmlFor="ai-verbosity"
          label="Comment verbosity"
        />
        <SettingsRow
          control={
            <Toggle
              id="ai-include-explanations"
              checked={preferences.includeExplanations}
              onChange={(value) => update("includeExplanations", value)}
            />
          }
          description="Adds rationale and mapping notes where generation output is available."
          htmlFor="ai-include-explanations"
          label="Include explanations"
        />
        <SettingsRow
          control={
            <span className="fv-settings-pill fv-settings-pill-locked">
              Always on
            </span>
          }
          description="The app keeps generated MES mappings grounded in approved server-side sources; this cannot be weakened from the client."
          label="Hallucination guard"
        />
      </section>
    </SettingsSection>
  );
}

// ── AboutTab ───────────────────────────────────────────────────

function AboutTab({
  approvedCount,
  generatedCount,
  isServerBacked,
  projectName,
  sourceRowCount,
}: {
  approvedCount: number | null;
  generatedCount: number | null;
  isServerBacked: boolean;
  projectName: string;
  sourceRowCount: number | null;
}) {
  return (
    <SettingsSection
      subtitle="Version, resources, and real project-local statistics."
      title="About"
    >
      <section className="fv-card fv-settings-about-hero" aria-labelledby="about-version-heading">
        <div className="fv-settings-app-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 3 4 7l8 4 8-4-8-4Z" />
            <path d="m4 12 8 4 8-4" />
            <path d="m4 17 8 4 8-4" />
          </svg>
        </div>
        <div>
          <h3 id="about-version-heading">MES Advisor</h3>
          <p>v0.9.1-beta · LGP 2026 · FEUP × Critical Manufacturing</p>
          <div className="fv-settings-pill-row">
            <span className="fv-settings-pill fv-settings-pill-active">Beta</span>
            <span className="fv-settings-pill">
              {isServerBacked ? "Server-backed project" : "Local mock project"}
            </span>
          </div>
        </div>
        <div className="fv-settings-about-stats">
          <MetricTile
            label="Source rows"
            value={formatMetricValue(sourceRowCount)}
          />
          <MetricTile
            label="Generated drafts"
            value={formatMetricValue(generatedCount)}
          />
          <MetricTile
            label="Approved rows"
            value={formatMetricValue(approvedCount)}
          />
        </div>
      </section>

      <section className="fv-card fv-settings-panel" aria-labelledby="about-resources-heading">
        <PanelHeader
          id="about-resources-heading"
          title="Resources"
          subtitle="Documentation and support links for the current pilot workspace."
        />
        <ResourceLink
          href="/docs/architecture"
          label="Architecture notes"
          subtitle="Current app boundaries and implementation context"
        />
        <ResourceLink
          href="/docs/deployment-ci"
          label="Deployment and CI"
          subtitle="Build, verification, and release expectations"
        />
        <ResourceLink
          href="https://github.com/FEUP-LGP-18/cm-mes-advisor/issues"
          label="Report an issue"
          subtitle={`Submit bugs or feature requests for ${projectName}`}
        />
      </section>

      <section className="fv-card fv-settings-panel" aria-labelledby="about-privacy-heading">
        <PanelHeader
          id="about-privacy-heading"
          title="Data & privacy"
          subtitle="Project data remains scoped to this workspace. Destructive actions stay in General where owner permissions are enforced."
        />
        <SettingsRow
          control={<span className="fv-settings-pill">Not tracked</span>}
          description="The app does not currently maintain durable export counts, hours-saved estimates, or AI accuracy metrics."
          label="Unsupported metrics"
        />
      </section>
    </SettingsSection>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="fv-settings-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ResourceLink({
  href,
  label,
  subtitle,
}: {
  href: string;
  label: string;
  subtitle: string;
}) {
  return (
    <Link href={href} className="fv-settings-resource">
      <span>
        <strong>{label}</strong>
        <small>{subtitle}</small>
      </span>
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M6 4l4 4-4 4" />
      </svg>
    </Link>
  );
}

function formatMetricValue(value: number | null) {
  return value === null ? "Not loaded" : String(value);
}

// ── GeneralPrefsSection (inside General tab) ───────────────────

function GeneralPrefsSection({
  feedback,
  onChange,
  onReset,
  onSave,
  preferences,
}: {
  feedback: string | null;
  onChange: (preferences: GeneralOutputPreferences) => void;
  onReset: () => void;
  onSave: () => void;
  preferences: GeneralOutputPreferences;
}) {
  const update = <K extends keyof GeneralOutputPreferences>(
    key: K,
    value: GeneralOutputPreferences[K],
  ) => {
    onChange({ ...preferences, [key]: value });
  };

  return (
    <SettingsSection
      actions={
        <>
          <button type="button" onClick={onReset} className="fv-btn-secondary">
            Reset to defaults
          </button>
          <button type="button" onClick={onSave} className="fv-btn-primary">
            Save changes
          </button>
        </>
      }
      feedback={feedback}
      subtitle="Set defaults used by future generated scripts, comments, and exports."
      title="General"
    >
      <section className="fv-card fv-settings-panel" aria-labelledby="prefs-defaults-heading">
        <PanelHeader
          id="prefs-defaults-heading"
          title="Project defaults"
          subtitle="Default values applied when generating new Phase 1 output. Existing generated rows are not rewritten."
        />
        <SettingsRow
          control={
            <input
              id="prefs-consultant-name"
              type="text"
              placeholder="S. Faria"
              value={preferences.consultantName ?? ""}
              onChange={(event) =>
                update(
                  "consultantName",
                  event.currentTarget.value.trim().length > 0
                    ? event.currentTarget.value
                    : null,
                )
              }
              className="fv-input fv-settings-control"
            />
          }
          description="Appears in generated script output and export metadata."
          htmlFor="prefs-consultant-name"
          label="Default consultant name"
        />
        <SettingsRow
          control={
            <select
              id="prefs-mes-version"
              value={preferences.mesVersion ?? ""}
              onChange={(event) =>
                update(
                  "mesVersion",
                  event.currentTarget.value
                    ? (event.currentTarget.value as MesVersion)
                    : null,
                )
              }
              className="fv-input fv-settings-control"
            >
              <option value="">Use project default</option>
              {mesVersionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          }
          description="Used when referencing MES documentation in generated output."
          htmlFor="prefs-mes-version"
          label="Default MES version"
        />
        <SettingsRow
          control={
            <select
              id="prefs-output-language"
              value={preferences.outputLanguage ?? ""}
              onChange={(event) =>
                update(
                  "outputLanguage",
                  event.currentTarget.value
                    ? (event.currentTarget.value as OutputLanguage)
                    : null,
                )
              }
              className="fv-input fv-settings-control"
            >
              <option value="">Use workbook language</option>
              {outputLanguageOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          }
          description="Saved for future outputs; existing generated comments are not translated."
          htmlFor="prefs-output-language"
          label="Output language"
        />
      </section>

      <section className="fv-card fv-settings-panel" aria-labelledby="prefs-behaviour-heading">
        <PanelHeader
          id="prefs-behaviour-heading"
          title="Notifications & behaviour"
          subtitle="Only supported settings are editable. Unsupported product ideas are shown as locked instead of pretending to work."
        />
        <SettingsRow
          control={
            <span className="fv-settings-pill fv-settings-pill-active">
              Enabled
            </span>
          }
          description="Review changes are persisted through the existing Phase 1 project state flow."
          label="Auto-save requirements"
        />
        <SettingsRow
          control={
            <span className="fv-settings-pill fv-settings-pill-locked">
              Not available
            </span>
          }
          description="Email notification delivery is not part of the current settings behavior contract."
          label="Email notifications"
        />
        <SettingsRow
          control={
            <span className="fv-settings-pill fv-settings-pill-locked">
              Not available
            </span>
          }
          description="Phase completion alerts are not persisted today; workflow progress remains visible in the project shell."
          label="Phase completion alerts"
        />
      </section>
    </SettingsSection>
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
    canEditPhase1,
    currentSourceMetadata,
    project: localProject,
    removeLocalProjectFromQueue,
    resetLocalProjectProgress,
    updateProjectIndustryTemplate,
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
  const [settingsDraft, setSettingsDraft] = useState<SettingsBehaviorSnapshot>(
    defaultSettingsBehaviorSnapshot,
  );
  const [settingsFeedback, setSettingsFeedback] = useState<{
    message: string;
    tab: SettingsTab;
  } | null>(null);

  useEffect(() => {
    const tabFromUrl = parseSettingsTab(
      new URLSearchParams(window.location.search).get("tab"),
    );
    if (tabFromUrl) setActiveTab(tabFromUrl);
    setSettingsDraft(loadSettingsBehaviorSnapshot(window.localStorage));
  }, []);

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

  const saveSettingsDraft = useCallback(
    (tab: SettingsTab, snapshot: SettingsBehaviorSnapshot, message: string) => {
      saveSettingsBehaviorSnapshot(window.localStorage, snapshot);
      setSettingsDraft(snapshot);
      setSettingsFeedback({ message, tab });
    },
    [],
  );

  const saveCurrentSettingsDraft = useCallback(
    (tab: SettingsTab, message: string) => {
      saveSettingsDraft(tab, settingsDraft, message);
    },
    [saveSettingsDraft, settingsDraft],
  );

  const resetGeneralSettings = useCallback(() => {
    const nextSnapshot = {
      ...settingsDraft,
      generalOutputPreferences: { ...defaultGeneralOutputPreferences },
    };
    saveSettingsDraft(
      "general",
      nextSnapshot,
      "General defaults reset to the safe Phase 1 baseline.",
    );
  }, [saveSettingsDraft, settingsDraft]);

  const resetAiSettings = useCallback(() => {
    const nextSnapshot = {
      ...settingsDraft,
      aiPreferences: { ...defaultSafeAiPreferences },
    };
    saveSettingsDraft(
      "ai",
      nextSnapshot,
      "AI preferences reset to the safe review-first baseline.",
    );
  }, [saveSettingsDraft, settingsDraft]);

  const TABS: { description: string; id: SettingsTab; label: string }[] = [
    {
      description: "Template preloads",
      id: "templates",
      label: "Industry Templates",
    },
    { description: "Defaults and behaviour", id: "general", label: "General" },
    {
      description: "Safe generation preferences",
      id: "ai",
      label: "AI Configuration",
    },
    { description: "Version and resources", id: "about", label: "About" },
  ];
  const aboutSourceRowCount = localProject?.snapshot.sourceRowCount ?? null;
  const aboutGeneratedCount = localProject?.snapshot.generatedCount ?? null;
  const aboutApprovedCount = localProject?.snapshot.approvedCount ?? null;

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

            <div className="fv-settings-heading">
              <h1>Settings</h1>
              <p>Configure MES Advisor behaviour, templates, and AI preferences.</p>
            </div>

            <div className="fv-settings-workspace">
              <nav className="fv-settings-section-nav" aria-label="Settings sections">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    aria-label={tab.label}
                    aria-current={activeTab === tab.id ? "page" : undefined}
                    onClick={() => setActiveTab(tab.id)}
                    className={activeTab === tab.id ? "is-active" : undefined}
                  >
                    <span>{tab.label}</span>
                    <small>{tab.description}</small>
                  </button>
                ))}
              </nav>

              <div className="fv-settings-content">
                {activeTab === "templates" && (
                  <TemplatesTab
                    canEditProjectState={canEditPhase1}
                    currentIndustryTemplateId={currentSourceMetadata.industryTemplateId}
                    onApplyProjectIndustryTemplate={updateProjectIndustryTemplate}
                    projectId={projectId}
                  />
                )}

                {activeTab === "general" && (
                  <>
                    <GeneralPrefsSection
                      feedback={
                        settingsFeedback?.tab === "general"
                          ? settingsFeedback.message
                          : null
                      }
                      onChange={(generalOutputPreferences) =>
                        setSettingsDraft((current) => ({
                          ...current,
                          generalOutputPreferences,
                        }))
                      }
                      onReset={resetGeneralSettings}
                      onSave={() =>
                        saveCurrentSettingsDraft(
                          "general",
                          "General defaults saved for future Phase 1 output.",
                        )
                      }
                      preferences={settingsDraft.generalOutputPreferences}
                    />
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
                  </>
                )}

                {activeTab === "ai" && (
                  <AIConfigTab
                    feedback={
                      settingsFeedback?.tab === "ai"
                        ? settingsFeedback.message
                        : null
                    }
                    onChange={(aiPreferences) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        aiPreferences,
                      }))
                    }
                    onReset={resetAiSettings}
                    onSave={() =>
                      saveCurrentSettingsDraft(
                        "ai",
                        "AI preferences saved for future generation.",
                      )
                    }
                    preferences={settingsDraft.aiPreferences}
                  />
                )}
                {activeTab === "about" && (
                  <AboutTab
                    approvedCount={aboutApprovedCount}
                    generatedCount={aboutGeneratedCount}
                    isServerBacked={isServerBacked}
                    projectName={projectName}
                    sourceRowCount={aboutSourceRowCount}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Formatters ─────────────────────────────────────────────────

function parseSettingsTab(value: string | null): SettingsTab | null {
  return value === "templates" ||
    value === "general" ||
    value === "ai" ||
    value === "about"
    ? value
    : null;
}

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
