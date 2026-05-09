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
import { getPhase1StepPath } from "@/lib/phase1/workflow";
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
        <Phase1Topbar />

        <ProjectCommandDesk
          activeProject={activeProject}
          createProject={createProject}
          currentUser={currentUser}
          initialCreateProjectState={initialCreateProjectState}
          listError={listError}
          onOpenProject={(project) =>
            router.push(getPhase1StepPath(project.id, "source"))
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
  currentUser,
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
  currentUser: CurrentUser | null;
  initialCreateProjectState: CreateProjectActionState;
  listError: string | null;
  onOpenProject: (project: ProjectListItem) => void;
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
          <p className="phase-overline">Project dashboard</p>
          <h1 className="phase-command-title">
            Open owned and shared MES demo projects.
          </h1>
          <p className="phase-command-body">
            {phaseOneScope.productName} now loads project access from the
            signed-in account. Phase 1 workflow details remain scoped to the
            project workspace while project membership is handled by Supabase.
          </p>
        </div>
        <div className="phase-command-actions">
          <button
            type="button"
            onClick={() => setCreateDialogOpen(true)}
            className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-semibold transition"
          >
            Create project
          </button>
        </div>
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
            <h2 className="phase-section-title">Owned and shared projects</h2>
            <p className="phase-section-body">
              Search by project, customer, description, or role. Project access
              comes from membership rows for the signed-in user.
            </p>
            {currentUser?.email ? (
              <p className="phase-project-subtle">
                Signed in as {currentUser.email}
              </p>
            ) : null}
          </div>
          <div className="phase-toolbar-stats">
            <InlineStat
              label="Projects"
              value={totalProjectCount ?? projects.length}
            />
            <InlineStat label="Owned" value={ownedCount} />
            <InlineStat label="Shared" value={sharedCount} />
          </div>
        </div>

        <div className="phase-list-controls">
          <input
            value={query}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
            placeholder="Search projects, customer, description, or role..."
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
              <span>Customer</span>
              <span>Role</span>
              <span>Status</span>
              <span>Updated</span>
              <span>Action</span>
            </div>

            <div className="grid gap-3">
              {projects.map((project) => (
                <article key={project.id} className="phase-project-row">
                  <div className="min-w-0">
                    <p className="phase-project-title">{project.name}</p>
                    <p className="phase-project-subtle">
                      {project.description || "No description added"}
                    </p>
                  </div>

                  <div className="phase-project-subtle">
                    {getCustomerLabel(project)}
                  </div>

                  <div>
                    <span className={getRoleClassName(project.currentUserRole)}>
                      {formatRole(project.currentUserRole)}
                    </span>
                  </div>

                  <div>
                    <span className={getStatusClassName(project.status)}>
                      {formatStatus(project.status)}
                    </span>
                  </div>

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
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="phase-empty-state">
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

function getRoleClassName(role: ProjectRole) {
  return role === "owner"
    ? "phase-project-chip phase-project-chip-ready"
    : role === "editor"
      ? "phase-project-chip"
      : "phase-project-chip phase-project-chip-muted";
}

function formatStatus(status: ProjectListItem["status"]) {
  return `${status[0].toUpperCase()}${status.slice(1)}`;
}

function getStatusClassName(status: ProjectListItem["status"]) {
  return status === "active"
    ? "phase-project-chip phase-project-chip-ready"
    : "phase-project-chip phase-project-chip-muted";
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
