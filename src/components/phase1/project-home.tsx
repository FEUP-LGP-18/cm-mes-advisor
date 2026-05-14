"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  const activeProject = filteredProjects[0] ?? projects[0] ?? null;

  return (
    <main className="app-canvas min-h-screen text-[color:var(--shell-ink)]">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Phase1Topbar email={currentUser?.email} />

        <ProjectCommandDesk
          activeProject={activeProject}
          createProject={createProject}
          initialCreateProjectState={initialCreateProjectState}
          listError={listError}
          onOpenProject={(project, step) =>
            router.push(
              step ? getPhase1StepPath(project.id, step) : `/projects/${project.id}`,
            )
          }
          onQueryChange={setQuery}
          onSortChange={setSort}
          projects={filteredProjects}
          query={query}
          sort={sort}
          totalProjectCount={projects.length}
        />
      </div>
    </main>
  );
}

export function ProjectCommandDesk({
  activeProject,
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
  activeProject: ProjectListItem | null;
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
  const hasProjects = projects.length > 0;
  const ownedCount = projects.filter(
    (project) => project.currentUserRole === "owner",
  ).length;
  const sharedCount = projects.length - ownedCount;
  const isSearching = query.trim().length > 0;

  return (
    <section className="grid gap-6">
      <section className="phase-command-desk">
        <div className="phase-command-copy">
          <p className="phase-overline">Phase 1 command desk</p>
          <h1 className="phase-command-title">
            Pick up the right customer project quickly.
          </h1>
          <p className="phase-command-body">
            {phaseOneScope.productName} stays focused on one consultant
            workflow: confirm the workbook, generate safe drafts, make
            consultant decisions, shape the script, and export a clean Phase 1
            handoff.
          </p>
        </div>
        {hasProjects ? (
          <div className="phase-command-actions">
            <button
              type="button"
              onClick={() => setCreateDialogOpen(true)}
              className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-semibold transition"
            >
              Create project
            </button>
          </div>
        ) : null}
      </section>

      {createDialogOpen ? (
        <CreateProjectDialog
          action={createFormAction}
          errorMessage={
            createState.status === "error" ? createState.message : null
          }
          isPending={createPending}
          onClose={() => setCreateDialogOpen(false)}
        />
      ) : null}

      {listError ? (
        <section className="phase-empty-state">
          <p className="phase-overline">Dashboard unavailable</p>
          <h2 className="mt-2 text-3xl font-semibold">
            Project access could not be loaded.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--shell-muted)]">
            {listError}
          </p>
        </section>
      ) : null}

      {!listError && activeProject ? (
        <section className="phase-priority-strip">
          <div className="phase-priority-copy">
            <p className="phase-overline">Next project</p>
            <h2 className="phase-section-title">{activeProject.name}</h2>
            <p className="phase-section-body">
              {getCustomerLabel(activeProject)} · Your role{" "}
              <strong>{formatRole(activeProject.currentUserRole)}</strong> ·
              Updated {formatUpdatedAt(activeProject.updatedAt)}
            </p>
          </div>
          <div className="phase-priority-meta">
            <PriorityMetric label="Owned" value={ownedCount} />
            <PriorityMetric label="Shared" value={sharedCount} />
            <PriorityMetric
              label="Visible projects"
              value={totalProjectCount ?? projects.length}
            />
          </div>
          <div className="phase-inline-actions">
            <button
              type="button"
              onClick={() => onOpenProject(activeProject)}
              className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-semibold transition"
            >
              Open project
            </button>
          </div>
        </section>
      ) : null}

      <section className="phase-section-card">
        <div className="phase-toolbar">
          <div className="phase-toolbar-copy">
            <p className="phase-overline">Project list</p>
            <h2 className="phase-section-title">Project queue</h2>
            <p className="phase-section-body">
              Search by customer, source workbook, or stage, then use the table
              to jump back into the work that needs attention.
            </p>
          </div>
          <div className="phase-toolbar-stats">
            <InlineStat
              label="Projects"
              value={totalProjectCount ?? projects.length}
            />
            <InlineStat label="Pending review" value={0} />
            <InlineStat label="Approved rows" value={0} />
          </div>
        </div>

        <div className="phase-list-controls">
          <input
            value={query}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
            placeholder="Search projects, customer, workbook, or stage..."
            className="focus-premium theme-shell-input rounded-2xl px-4 py-3 text-sm"
          />
          <label className="phase-select-wrap">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(event) =>
                onSortChange(event.currentTarget.value as ProjectSort)
              }
              className="focus-premium theme-shell-input rounded-2xl px-4 py-3 text-sm"
            >
              <option value="recent">Most recent</option>
              <option value="customer">Customer</option>
              <option value="role">Role</option>
            </select>
          </label>
        </div>

        {hasProjects ? (
          <div className="phase-project-table">
            <div className="phase-project-table-head">
              <span>Project</span>
              <span>Workspace</span>
              <span>Access</span>
              <span>Default step</span>
              <span>Updated</span>
              <span>Action</span>
            </div>

            <div className="grid gap-3">
              {projects.map((project) => (
                <article key={project.id} className="phase-project-row">
                  <div className="min-w-0">
                    <p className="phase-project-title">
                      {project.name}
                      <span className="phase-project-subtle font-normal">
                        <span className="mx-2">·</span>
                        {formatRole(project.currentUserRole)}
                      </span>
                    </p>
                    <p className="phase-project-subtle">
                      {getCustomerLabel(project)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="phase-project-subtle">
                      Source details load in project
                    </p>
                    <p className="phase-project-filename">
                      Open Source to inspect workbook state
                    </p>
                  </div>

                  <div>
                    <span className="phase-project-chip phase-project-chip-muted">
                      {formatRole(project.currentUserRole)}
                    </span>
                  </div>

                  <div className="phase-project-subtle">Source</div>

                  <div className="phase-project-subtle">
                    {formatUpdatedAt(project.updatedAt)}
                  </div>

                  <div className="phase-project-actions">
                    <button
                      type="button"
                      onClick={() => onOpenProject(project)}
                      className="focus-premium theme-button-primary rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenProject(project, "review")}
                      className="focus-premium theme-shell-button-secondary rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                    >
                      Review
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="phase-empty-state flex items-center justify-between gap-6">
            <div>
              <p className="phase-overline">
                {isSearching ? "No matching projects" : "No projects yet"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                {isSearching
                  ? "No project matches this search."
                  : "Create the first server-backed project."}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--shell-muted)]">
                {isSearching
                  ? "Clear or change the search to return to the full project list."
                  : "New projects are saved to Supabase and the creator becomes the owner automatically."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateDialogOpen(true)}
              className="focus-premium theme-button-primary shrink-0 rounded-2xl px-5 py-3 text-sm font-semibold transition"
            >
              Create project
            </button>
          </div>
        )}
      </section>
    </section>
  );
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
      className="phase-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="create-project-title"
        aria-modal="true"
        className="phase-overlay-panel max-w-xl"
        role="dialog"
      >
        <div className="phase-overlay-header">
          <div>
            <p className="phase-overline">New project</p>
            <h2 id="create-project-title" className="phase-section-title">
              Create a server-backed project
            </h2>
            <p className="phase-section-body">
              Add the project details. Supabase saves the project and assigns
              you as owner.
            </p>
          </div>
        </div>

        <form action={action} className="grid gap-4">
          <div className="grid gap-3">
            <label className="phase-select-wrap">
              <span>Project name</span>
              <input
                autoFocus
                name="name"
                required
                placeholder="Customer X demo"
                className="focus-premium theme-shell-input rounded-2xl px-4 py-3 text-sm"
              />
            </label>
            <label className="phase-select-wrap">
              <span>Customer</span>
              <input
                name="customerName"
                placeholder="Customer X"
                className="focus-premium theme-shell-input rounded-2xl px-4 py-3 text-sm"
              />
            </label>
            <label className="phase-select-wrap">
              <span>Description</span>
              <textarea
                name="description"
                placeholder="Optional project context"
                rows={3}
                className="focus-premium theme-shell-input rounded-2xl px-4 py-3 text-sm"
              />
            </label>
          </div>

          {errorMessage ? (
            <p className="text-sm font-medium text-[color:var(--danger)]">
              {errorMessage}
            </p>
          ) : null}

          <div className="phase-inline-actions justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Creating project..." : "Create project"}
            </button>
          </div>
        </form>
      </section>
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
        [
          project.name,
          project.customerName,
          project.description,
          project.currentUserRole,
          project.status,
        ]
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
        roleSortValue(right.currentUserRole) -
          roleSortValue(left.currentUserRole) ||
        right.updatedAt.localeCompare(left.updatedAt)
      );
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function InlineStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="phase-inline-stat">
      <span>{label}</span>
      <strong>{value.toLocaleString("en-US")}</strong>
    </div>
  );
}

function PriorityMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="phase-priority-metric">
      <span>{label}</span>
      <strong>{value.toLocaleString("en-US")}</strong>
    </div>
  );
}

function getCustomerLabel(project: ProjectListItem) {
  return project.customerName?.trim() || "No customer set";
}

function roleSortValue(role: ProjectRole) {
  if (role === "owner") {
    return 3;
  }

  if (role === "editor") {
    return 2;
  }

  return 1;
}

function formatRole(role: ProjectRole) {
  return `${role[0].toUpperCase()}${role.slice(1)}`;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}
