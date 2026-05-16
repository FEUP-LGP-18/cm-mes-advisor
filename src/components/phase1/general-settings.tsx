"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Phase1Topbar from "./phase-topbar";
import { usePhase1Project } from "./project-provider";
import CopyProjectLinkButton from "./copy-project-link-button";
import type { Project, ProjectActivityEvent } from "@/lib/projects/types";

interface ActionFeedback {
  message: string;
  tone: "error" | "success";
}

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
  onUnarchiveRequest,
}: GeneralSettingsViewProps) {
  const isArchived = project?.status === "archived";
  const canManageLifecycle = isOwner && isServerBacked;
  const deleteMatchesName = deleteConfirmInput.trim() === projectName.trim();
  const helperText = !isOwner
    ? "View project metadata. Contact an owner to make changes."
    : isServerBacked
      ? "Update project metadata, archive, or permanently delete this project."
      : "Update project metadata for this local project.";

  return (
    <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <header className="phase-shell-header">
        <div className="phase-shell-header-top w-full">
          <div className="phase-shell-breadcrumbs">
            <Link href="/" className="phase-product-link">
              Projects
            </Link>
            <span className="phase-shell-divider">/</span>
            <Link
              href={`/projects/${projectId}`}
              className="phase-product-link"
            >
              {projectName}
            </Link>
            <span className="phase-shell-divider">/</span>
            <Link
              href={`/projects/${projectId}/settings/general`}
              className="phase-product-link"
            >
              Settings
            </Link>
            <span className="phase-shell-divider">/</span>
            <span>General</span>
          </div>
          <div className="phase-shell-pill-row ml-auto flex-shrink-0">
            <span className="phase-shell-pill">Settings</span>
            <span className="phase-shell-pill phase-shell-pill-muted">
              General
            </span>
            {!isOwner && (
              <span className="phase-shell-pill phase-shell-pill-muted">
                Read-only
              </span>
            )}
            {isArchived && (
              <span className="phase-shell-pill phase-shell-pill-muted">
                Archived
              </span>
            )}
          </div>
        </div>
        <div className="phase-shell-header-main">
          <div className="phase-shell-title-block">
            <h1 className="phase-shell-title">General settings</h1>
            <p className="phase-shell-helper">{helperText}</p>
          </div>
          <div className="phase-inline-actions">
            <CopyProjectLinkButton projectId={projectId} />
          </div>
        </div>
      </header>

      <nav aria-label="Settings" className="flex gap-1">
        <span
          aria-current="page"
          className="phase-stage-link phase-stage-link-active text-sm"
        >
          General
        </span>
        <Link
          href={`/projects/${projectId}/settings/collaboration`}
          className="phase-stage-link text-sm"
        >
          Collaboration
        </Link>
      </nav>

      {actionFeedback ? (
        <div
          className={`phase-feedback ${
            actionFeedback.tone === "success"
              ? "phase-feedback-success"
              : "phase-feedback-error"
          }`}
          role={actionFeedback.tone === "error" ? "alert" : "status"}
        >
          {actionFeedback.message}
        </div>
      ) : null}

      {/* Project metadata */}
      <section
        aria-labelledby="general-metadata-heading"
        className="phase-section-card"
      >
        <div className="phase-section-copy">
          <h2 className="phase-section-title" id="general-metadata-heading">
            Project details
          </h2>
          {!isOwner && (
            <p className="phase-section-body">
              You have read-only access to project details.
            </p>
          )}
        </div>

        <form
          className="flex max-w-lg flex-col gap-4"
          noValidate
          onSubmit={onFormSubmit}
        >
          <div className="flex flex-col gap-1">
            <label
              className="mono-label text-xs"
              htmlFor="general-project-name"
            >
              Project name
            </label>
            <input
              aria-describedby={
                formNameError ? "general-name-error" : undefined
              }
              aria-invalid={!!formNameError}
              disabled={!isOwner || isSaving}
              id="general-project-name"
              required
              type="text"
              value={formName}
              onChange={(e) => onFormNameChange(e.target.value)}
              className="focus-premium rounded-xl border border-[color:var(--shell-border)] bg-[color:var(--shell-surface-strong)] px-3 py-2 text-sm transition placeholder:text-[color:var(--shell-muted)] disabled:opacity-50"
            />
            {formNameError ? (
              <p
                className="text-xs text-[color:var(--feedback-error,_#ef4444)]"
                id="general-name-error"
                role="alert"
              >
                {formNameError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label
              className="mono-label text-xs"
              htmlFor="general-customer-name"
            >
              Customer name
            </label>
            <input
              disabled={!isOwner || isSaving}
              id="general-customer-name"
              placeholder="Optional"
              type="text"
              value={formCustomerName}
              onChange={(e) => onFormCustomerNameChange(e.target.value)}
              className="focus-premium rounded-xl border border-[color:var(--shell-border)] bg-[color:var(--shell-surface-strong)] px-3 py-2 text-sm transition placeholder:text-[color:var(--shell-muted)] disabled:opacity-50"
            />
          </div>

          {isServerBacked && (
            <div className="flex flex-col gap-1">
              <label
                className="mono-label text-xs"
                htmlFor="general-description"
              >
                Description
              </label>
              <textarea
                disabled={!isOwner || isSaving}
                id="general-description"
                placeholder="Optional"
                rows={3}
                value={formDescription}
                onChange={(e) => onFormDescriptionChange(e.target.value)}
                className="focus-premium rounded-xl border border-[color:var(--shell-border)] bg-[color:var(--shell-surface-strong)] px-3 py-2 text-sm transition placeholder:text-[color:var(--shell-muted)] disabled:opacity-50"
              />
            </div>
          )}

          {isOwner && (
            <div className="flex items-center gap-3">
              <button
                disabled={isSaving}
                type="submit"
                className="focus-premium theme-button-primary rounded-2xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </form>
      </section>

      {/* Archive */}
      {canManageLifecycle && (
        <section
          aria-labelledby="general-archive-heading"
          className="phase-section-card"
        >
          <div className="phase-section-copy">
            <h2 className="phase-section-title" id="general-archive-heading">
              {isArchived ? "Unarchive project" : "Archive project"}
            </h2>
            <p className="phase-section-body">
              {isArchived
                ? "Restore this project to active status. It will reappear normally on the dashboard."
                : "Archived projects are kept but marked as inactive on the dashboard. You can unarchive at any time."}
            </p>
          </div>

          {archiveConfirmOpen ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                Archive <strong>{projectName}</strong>? The project will be
                marked as inactive but not deleted.
              </p>
              <div className="flex gap-3">
                <button
                  disabled={isArchiving}
                  type="button"
                  onClick={onArchiveConfirm}
                  className="focus-premium theme-button-primary rounded-2xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50"
                >
                  {isArchiving ? "Archiving…" : "Confirm archive"}
                </button>
                <button
                  disabled={isArchiving}
                  type="button"
                  onClick={onArchiveCancel}
                  className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              disabled={isArchiving}
              type="button"
              onClick={isArchived ? onUnarchiveRequest : onArchiveRequest}
              className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50"
            >
              {isArchiving
                ? isArchived
                  ? "Unarchiving…"
                  : "Archiving…"
                : isArchived
                  ? "Unarchive project"
                  : "Archive project"}
            </button>
          )}
        </section>
      )}

      {/* Delete */}
      {canManageLifecycle && (
        <section
          aria-labelledby="general-delete-heading"
          className="phase-section-card"
        >
          <div className="phase-section-copy">
            <h2 className="phase-section-title" id="general-delete-heading">
              Delete project
            </h2>
            <p className="phase-section-body">
              Permanently delete this project and all associated data. This
              cannot be undone.
            </p>
          </div>

          {deleteConfirmOpen ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                Type <strong>{projectName}</strong> to confirm deletion.
              </p>
              <input
                aria-label="Type project name to confirm deletion"
                disabled={isDeleting}
                placeholder={projectName}
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => onDeleteConfirmInputChange(e.target.value)}
                className="focus-premium w-full max-w-sm rounded-xl border border-[color:var(--shell-border)] bg-[color:var(--shell-surface-strong)] px-3 py-2 text-sm transition placeholder:text-[color:var(--shell-muted)] disabled:opacity-50"
              />
              <div className="flex gap-3">
                <button
                  aria-disabled={!deleteMatchesName || isDeleting}
                  disabled={!deleteMatchesName || isDeleting}
                  type="button"
                  onClick={onDeleteConfirm}
                  className="focus-premium rounded-2xl bg-[color:var(--feedback-error,_#ef4444)] px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                >
                  {isDeleting ? "Deleting…" : "Delete project"}
                </button>
                <button
                  disabled={isDeleting}
                  type="button"
                  onClick={onDeleteCancel}
                  className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onDeleteRequest}
              className="focus-premium rounded-2xl border border-[color:var(--feedback-error,_#ef4444)] px-5 py-2.5 text-sm font-semibold text-[color:var(--feedback-error,_#ef4444)] transition hover:bg-[color:var(--feedback-error,_#ef4444)] hover:text-white"
            >
              Delete project…
            </button>
          )}
        </section>
      )}

      {isServerBacked ? (
        <section
          aria-labelledby="general-activity-heading"
          className="phase-section-card"
        >
          <div className="phase-section-copy">
            <h2 className="phase-section-title" id="general-activity-heading">
              Recent activity
            </h2>
            <p className="phase-section-body">
              Latest lifecycle, membership, invite, and settings events recorded
              for this project.
            </p>
          </div>

          {recentActivityEvents.length > 0 ? (
            <div className="phase-status-list">
              {recentActivityEvents.map((event) => (
                <div className="phase-status-item" key={event.id}>
                  <span className="phase-status-dot phase-status-complete" />
                  <div>
                    <p className="phase-status-label">
                      {formatActivityEvent(event)}
                    </p>
                    <p className="phase-status-meta">
                      {formatActivityDate(event.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="phase-empty-state">
              <p className="phase-overline">No activity yet</p>
              <h3 className="mt-2 text-2xl font-semibold">
                Project events will appear here after the first saved action.
              </h3>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

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
  const { project: localProject, updateLocalProjectMetadata } =
    usePhase1Project();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(serverProject);
  const sourceFormName = project?.name ?? localProject?.projectName ?? "";
  const sourceFormCustomerName =
    project?.customerName ?? localProject?.customerName ?? "";
  const sourceFormDescription = project?.description ?? "";
  const projectName = sourceFormName || "Project";

  const [formName, setFormName] = useState(sourceFormName);
  const [formCustomerName, setFormCustomerName] = useState(
    sourceFormCustomerName,
  );
  const [formDescription, setFormDescription] = useState(sourceFormDescription);
  const [formNameError, setFormNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(
    null,
  );
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const showFeedback = useCallback(
    (message: string, tone: "error" | "success") => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      setActionFeedback({ message, tone });
      feedbackTimerRef.current = setTimeout(
        () => setActionFeedback(null),
        5000,
      );
    },
    [],
  );

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = formName.trim();

      if (!trimmedName) {
        setFormNameError("Project name is required.");
        return;
      }

      setFormNameError(null);
      setIsSaving(true);

      if (!isServerBacked) {
        updateLocalProjectMetadata(
          trimmedName,
          formCustomerName.trim() || null,
        );
        showFeedback("Project details saved.", "success");
        setIsSaving(false);
        return;
      }

      try {
        const res = await fetch(`/api/projects/${projectId}/settings`, {
          body: JSON.stringify({
            customerName: formCustomerName.trim() || null,
            description: formDescription.trim() || null,
            name: trimmedName,
          }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        });

        const body = await res.json().catch(() => null);

        if (!res.ok) {
          showFeedback(
            body?.error ?? "Changes could not be saved. Please try again.",
            "error",
          );
          return;
        }

        setProject(body as Project);
        showFeedback("Project details saved.", "success");
      } catch {
        showFeedback("Could not reach the server. Please try again.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [
      formCustomerName,
      formDescription,
      formName,
      isServerBacked,
      projectId,
      showFeedback,
      updateLocalProjectMetadata,
    ],
  );

  const handleArchiveConfirm = useCallback(async () => {
    setIsArchiving(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/settings/archive`, {
        body: JSON.stringify({ action: "archive" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        showFeedback(
          body?.error ?? "Project could not be archived. Please try again.",
          "error",
        );
        return;
      }

      setProject(body as Project);
      setArchiveConfirmOpen(false);
      showFeedback("Project archived.", "success");
    } catch {
      showFeedback("Could not reach the server. Please try again.", "error");
    } finally {
      setIsArchiving(false);
    }
  }, [projectId, showFeedback]);

  const handleUnarchiveRequest = useCallback(async () => {
    setIsArchiving(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/settings/archive`, {
        body: JSON.stringify({ action: "unarchive" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        showFeedback(
          body?.error ?? "Project could not be unarchived. Please try again.",
          "error",
        );
        return;
      }

      setProject(body as Project);
      showFeedback("Project restored to active.", "success");
    } catch {
      showFeedback("Could not reach the server. Please try again.", "error");
    } finally {
      setIsArchiving(false);
    }
  }, [projectId, showFeedback]);

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        body: JSON.stringify({ confirmationName: projectName }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        showFeedback(
          body?.error ?? "Project could not be deleted. Please try again.",
          "error",
        );
        return;
      }

      router.push("/");
    } catch {
      showFeedback("Could not reach the server. Please try again.", "error");
      setIsDeleting(false);
    }
  }, [projectId, projectName, router, showFeedback]);

  return (
    <main className="app-canvas min-h-screen text-[color:var(--shell-ink)]">
      <Phase1Topbar />
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
        onDeleteCancel={() => {
          setDeleteConfirmOpen(false);
          setDeleteConfirmInput("");
        }}
        onDeleteConfirm={handleDeleteConfirm}
        onDeleteConfirmInputChange={setDeleteConfirmInput}
        onDeleteRequest={() => setDeleteConfirmOpen(true)}
        onFormCustomerNameChange={setFormCustomerName}
        onFormDescriptionChange={setFormDescription}
        onFormNameChange={setFormName}
        onFormSubmit={handleFormSubmit}
        onUnarchiveRequest={handleUnarchiveRequest}
      />
    </main>
  );
}

function formatActivityEvent(event: ProjectActivityEvent) {
  switch (event.eventType) {
    case "project_metadata_updated":
      return "Project details updated";
    case "project_archived":
      return "Project archived";
    case "project_unarchived":
      return "Project restored";
    case "project_member_added":
      return "Project member added";
    case "project_member_removed":
      return "Project member removed";
    case "project_member_role_updated":
      return "Project member role updated";
    case "project_invite_created":
      return "Invite created";
    case "project_invite_revoked":
      return "Invite revoked";
    case "project_invite_accepted":
      return "Invite accepted";
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

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
}
