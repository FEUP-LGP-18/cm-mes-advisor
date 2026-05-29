"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { phaseOneScope } from "@/lib/project-scope";
import type {
  CreateProjectActionState,
  CurrentUser,
  ProjectListItem,
  ProjectRole,
} from "@/lib/projects/types";
import {
  getPhase1StepPath,
  type Phase1WorkflowStep,
} from "@/lib/phase1/workflow";
import Phase1Topbar from "./phase-topbar";

type ProjectSort = "recent" | "customer" | "role";

export default function Phase1ProjectHome({
  currentUser,
  createProject,
  initialCreateProjectState,
  listError,
  projects,
}: {
  currentUser: CurrentUser | null;
  createProject: (
    previousState: CreateProjectActionState,
    formData: FormData,
  ) => Promise<CreateProjectActionState>;
  initialCreateProjectState: CreateProjectActionState;
  listError: string | null;
  projects: ProjectListItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ProjectSort>("recent");

  const filteredProjects = useMemo(
    () => filterAndSortProjects(projects, query, sort),
    [projects, query, sort],
  );

  return (
    <div className="fv-shell">
      <Phase1Topbar email={currentUser?.email} />
      <div className="fv-body">
        {/* Sidebar */}
        <nav className="fv-sidebar" aria-label="Navigation">
          <div className="fv-sidebar-section">
            <span className="fv-sidebar-label">Navigation</span>
            <Link href="/" className="fv-nav-item fv-nav-item-active">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="2" y="2" width="5" height="5" rx="1" />
                <rect x="9" y="2" width="5" height="5" rx="1" />
                <rect x="2" y="9" width="5" height="5" rx="1" />
                <rect x="9" y="9" width="5" height="5" rx="1" />
              </svg>
              Projects
            </Link>
            <Link href="/settings" className="fv-nav-item">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="8" cy="8" r="2.5" />
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
              </svg>
              Settings
            </Link>
          </div>
        </nav>

        {/* Content */}
        <main className="fv-content">
          <ProjectCommandDesk
            createProject={createProject}
            initialCreateProjectState={initialCreateProjectState}
            listError={listError}
            onOpenProject={(project, step) =>
              router.push(
                getPhase1StepPath(
                  project.id,
                  step ?? project.phase1CurrentStep ?? "source",
                ),
              )
            }
            onQueryChange={setQuery}
            onSortChange={setSort}
            projects={filteredProjects}
            query={query}
            sort={sort}
            totalProjectCount={projects.length}
          />
        </main>
      </div>
    </div>
  );
}

export function ProjectCommandDesk({
  activeProject: _activeProject,
  createProject,
  initialCreateProjectState,
  listError,
  onOpenProject,
  onQueryChange,
  onSortChange,
  projects,
  query,
  sort,
  totalProjectCount,
}: {
  activeProject?: ProjectListItem | null;
  createProject: (
    previousState: CreateProjectActionState,
    formData: FormData,
  ) => Promise<CreateProjectActionState>;
  initialCreateProjectState: CreateProjectActionState;
  listError: string | null;
  onOpenProject: (project: ProjectListItem, step?: Phase1WorkflowStep) => void;
  onQueryChange: (query: string) => void;
  onSortChange: (sort: ProjectSort) => void;
  projects: ProjectListItem[];
  query: string;
  sort: ProjectSort;
  totalProjectCount?: number;
}) {
  const [createState, createFormAction, createPending] = useActionState(
    createProject,
    initialCreateProjectState,
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const isSearching = query.trim().length > 0;
  const total = totalProjectCount ?? projects.length;
  const inProgress = projects.filter((p) => p.phase1CurrentStep && p.phase1CurrentStep !== "export").length;
  const completed = projects.filter((p) => p.phase1CurrentStep === "export").length;
  const pendingReview = projects.filter((p) => p.phase1CurrentStep === "review").length;

  return (
    <div className="fv-projects-page">
      {/* Header */}
      <div className="fv-page-header">
        <div>
          <h1 className="fv-page-title">Projects</h1>
          <p className="fv-page-subtitle">{phaseOneScope.productName} — manage your MES demo configuration projects</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateDialogOpen(true)}
          className="fv-btn-primary"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="8" y1="2" x2="8" y2="14" />
            <line x1="2" y1="8" x2="14" y2="8" />
          </svg>
          New Project
        </button>
      </div>

      {/* Stats cards */}
      <div className="fv-stats-row">
        <div className="fv-stat-card">
          <div className="fv-stat-label">Total Projects</div>
          <div className="fv-stat-value">{total}</div>
          <div className="fv-stat-sub">All time</div>
        </div>
        <div className="fv-stat-card">
          <div className="fv-stat-label">In Progress</div>
          <div className="fv-stat-value fv-stat-value-blue">{inProgress}</div>
          <div className="fv-stat-sub">Active this week</div>
        </div>
        <div className="fv-stat-card">
          <div className="fv-stat-label">Pending Review</div>
          <div className="fv-stat-value fv-stat-value-orange">{pendingReview}</div>
          <div className="fv-stat-sub">Awaiting approval</div>
        </div>
        <div className="fv-stat-card">
          <div className="fv-stat-label">Completed</div>
          <div className="fv-stat-value fv-stat-value-green">{completed}</div>
          <div className="fv-stat-sub">Ready for demo</div>
        </div>
      </div>

      {listError ? (
        <div className="fv-callout fv-callout-error" style={{ marginBottom: "1rem" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="8" cy="8" r="6" /><line x1="8" y1="5" x2="8" y2="8" /><line x1="8" y1="11" x2="8" y2="11" strokeWidth="2" /></svg>
          {listError}
        </div>
      ) : null}

      {/* Table */}
      <div className="fv-table-wrap">
        <div className="fv-table-toolbar">
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.currentTarget.value)}
            placeholder="Search projects..."
            className="fv-search-input"
          />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.currentTarget.value as ProjectSort)}
            className="fv-filter-btn"
            style={{ cursor: "pointer" }}
          >
            <option value="recent">Most recent</option>
            <option value="customer">Customer</option>
            <option value="role">Role</option>
          </select>
          <div className="fv-table-toolbar-right">
            <span style={{ fontSize: "0.78rem", color: "var(--muted-fg)" }}>
              Showing {projects.length} of {total} projects
            </span>
          </div>
        </div>

        {projects.length > 0 ? (
          <table className="fv-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Customer</th>
                <th>Stage</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <div className="fv-table-project-name">{project.name}</div>
                    <div className="fv-table-muted">{getCustomerLabel(project)}</div>
                  </td>
                  <td className="fv-table-muted">{project.customerName || "—"}</td>
                  <td>
                    <StepBadge step={project.phase1CurrentStep} />
                  </td>
                  <td className="fv-table-muted">{formatUpdatedAt(project.updatedAt)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onOpenProject(project)}
                      className="fv-btn-secondary"
                      style={{ padding: "0.3rem 0.75rem", fontSize: "0.78rem" }}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="fv-empty">
            <svg className="fv-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <div className="fv-empty-title">
              {isSearching ? "No projects found" : "No projects yet"}
            </div>
            <div className="fv-empty-body">
              {isSearching
                ? `No results match "${query}". Try a different search term or clear your filters.`
                : "Create your first project to start generating MES demo scripts and Master Data from customer requirements."}
            </div>
            {!isSearching ? (
              <button
                type="button"
                onClick={() => setCreateDialogOpen(true)}
                className="fv-btn-primary"
                style={{ marginTop: "1rem" }}
              >
                + Create your first project
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="fv-btn-secondary"
                style={{ marginTop: "1rem" }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {createDialogOpen ? (
        <CreateProjectDialog
          action={createFormAction}
          errorMessage={createState.status === "error" ? createState.message : null}
          isPending={createPending}
          onClose={() => setCreateDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}

function StepBadge({ step }: { step?: Phase1WorkflowStep | null }) {
  const stepMap: Record<string, { label: string; cls: string }> = {
    source: { label: "Upload", cls: "fv-stage-badge-blue" },
    generate: { label: "In Progress", cls: "fv-stage-badge-indigo" },
    review: { label: "Pending Review", cls: "fv-stage-badge-orange" },
    script: { label: "Script Gen", cls: "fv-stage-badge-green" },
    export: { label: "Complete", cls: "fv-stage-badge-gray" },
  };
  const meta = (step && stepMap[step]) ?? { label: step ?? "Source", cls: "fv-stage-badge-gray" };
  return <span className={`fv-stage-badge ${meta.cls}`}>{meta.label}</span>;
}

function CreateProjectDialog({
  action,
  errorMessage,
  isPending,
  onClose,
}: {
  action: (formData: FormData) => void;
  errorMessage: string | null;
  isPending: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  return (
    <div
      className="fv-modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div
        aria-labelledby="create-project-title"
        aria-modal="true"
        className="fv-modal"
        role="dialog"
      >
        <div className="fv-modal-header">
          <h2 id="create-project-title" className="fv-modal-title">Create New Project</h2>
          <button type="button" onClick={onClose} className="fv-modal-close" aria-label="Close">×</button>
        </div>

        <form action={action} style={{ display: "grid", gap: "1rem" }}>
          <div>
            <label className="fv-field-label" htmlFor="proj-name">
              Project Name <span style={{ color: "var(--status-error)" }}>*</span>
            </label>
            <input
              id="proj-name"
              autoFocus
              name="name"
              required
              placeholder="Bosch SMT Line Demo"
              className="fv-input"
            />
          </div>
          <div>
            <label className="fv-field-label" htmlFor="proj-customer">Customer Name</label>
            <input
              id="proj-customer"
              name="customerName"
              placeholder="e.g. Bosch GmbH"
              className="fv-input"
            />
          </div>
          <div>
            <label className="fv-field-label" htmlFor="proj-desc">Project Description</label>
            <textarea
              id="proj-desc"
              name="description"
              placeholder="Optional — briefly describe the customer's context or key focus areas"
              rows={3}
              className="fv-input"
              style={{ resize: "vertical" }}
            />
          </div>

          {errorMessage ? (
            <div style={{ fontSize: "0.8rem", color: "var(--status-error)" }}>{errorMessage}</div>
          ) : null}

          <div className="fv-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="fv-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="fv-btn-primary"
            >
              {isPending ? "Creating…" : "Create Project →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function filterAndSortProjects(
  projects: ProjectListItem[],
  query: string,
  sort: ProjectSort,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const visibleProjects = normalizedQuery
    ? projects.filter((project) =>
        [project.name, project.customerName, project.description, project.currentUserRole, project.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : projects;

  return [...visibleProjects].sort((left, right) => {
    if (sort === "customer") {
      return getCustomerLabel(left).localeCompare(getCustomerLabel(right));
    }
    if (sort === "role") {
      return (
        roleSortValue(right.currentUserRole) - roleSortValue(left.currentUserRole) ||
        right.updatedAt.localeCompare(left.updatedAt)
      );
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function getCustomerLabel(project: ProjectListItem) {
  return project.customerName?.trim() || "No customer set";
}

function roleSortValue(role: ProjectRole) {
  if (role === "owner") return 3;
  if (role === "editor") return 2;
  return 1;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}
