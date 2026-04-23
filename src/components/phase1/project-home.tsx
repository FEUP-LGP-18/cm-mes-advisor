"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { phaseOneScope } from "@/lib/project-scope";
import {
  createSampleProject,
  loadPhase1ProjectRegistry,
  savePhase1ProjectRegistry,
  setActivePhase1Project,
  upsertPhase1Project,
  type Phase1ProjectRecord,
  type Phase1ProjectRegistry,
} from "@/lib/phase1/project-registry";
import { getPhase1StepPath, phase1WorkflowMeta } from "@/lib/phase1/workflow";
import type { RequirementsWorkspaceState } from "@/lib/requirements";
import Phase1Topbar from "./phase-topbar";

type ProjectSort = "recent" | "review" | "approved";

export default function Phase1ProjectHome({
  fallbackWorkspaceState,
}: {
  fallbackWorkspaceState: RequirementsWorkspaceState;
}) {
  const router = useRouter();
  const [registry, setRegistry] = useState<Phase1ProjectRegistry | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ProjectSort>("recent");

  useEffect(() => {
    setRegistry(
      loadPhase1ProjectRegistry(window.localStorage, fallbackWorkspaceState),
    );
  }, [fallbackWorkspaceState]);

  const projects = useMemo(() => registry?.projects ?? [], [registry]);
  const activeProject = useMemo(
    () =>
      projects.find(
        (project) => project.projectId === registry?.activeProjectId,
      ) ??
      projects[0] ??
      null,
    [projects, registry?.activeProjectId],
  );

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visibleProjects = normalizedQuery
      ? projects.filter((project) =>
          [
            project.projectName,
            project.customerName,
            project.snapshot.sourceFilename,
            project.currentStep,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery),
        )
      : projects;

    return [...visibleProjects].sort((left, right) => {
      if (sort === "review") {
        return (
          right.snapshot.generatedReviewableCount -
            left.snapshot.generatedReviewableCount ||
          right.updatedAt.localeCompare(left.updatedAt)
        );
      }

      if (sort === "approved") {
        return (
          right.snapshot.approvedCount - left.snapshot.approvedCount ||
          right.updatedAt.localeCompare(left.updatedAt)
        );
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }, [projects, query, sort]);

  function persistRegistry(nextRegistry: Phase1ProjectRegistry) {
    savePhase1ProjectRegistry(window.localStorage, nextRegistry);
    setRegistry(nextRegistry);
  }

  function handleCreateSampleProject() {
    const currentRegistry =
      registry ??
      loadPhase1ProjectRegistry(window.localStorage, fallbackWorkspaceState);
    const nextProject = createSampleProject(
      currentRegistry,
      fallbackWorkspaceState,
    );
    const nextRegistry = upsertPhase1Project(currentRegistry, nextProject);

    persistRegistry(nextRegistry);
    router.push(getPhase1StepPath(nextProject.projectId, "source"));
  }

  function handleOpenProject(project: Phase1ProjectRecord, step = project.currentStep) {
    if (!registry) {
      return;
    }

    const nextRegistry = setActivePhase1Project(registry, project.projectId);
    persistRegistry(nextRegistry);
    router.push(getPhase1StepPath(project.projectId, step));
  }

  return (
    <main className="app-canvas min-h-screen text-[color:var(--shell-ink)]">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Phase1Topbar />

        <ProjectCommandDesk
          activeProject={activeProject}
          canCreateSampleProject={registry !== null}
          onCreateSampleProject={handleCreateSampleProject}
          onOpenProject={handleOpenProject}
          onQueryChange={setQuery}
          onSortChange={setSort}
          projects={filteredProjects}
          query={query}
          sort={sort}
        />
      </div>
    </main>
  );
}

export function ProjectCommandDesk({
  activeProject,
  canCreateSampleProject,
  onCreateSampleProject,
  onOpenProject,
  onQueryChange,
  onSortChange,
  projects,
  query,
  sort,
}: {
  activeProject: Phase1ProjectRecord | null;
  canCreateSampleProject: boolean;
  onCreateSampleProject: () => void;
  onOpenProject: (project: Phase1ProjectRecord, step?: Phase1ProjectRecord["currentStep"]) => void;
  onQueryChange: (query: string) => void;
  onSortChange: (sort: ProjectSort) => void;
  projects: Phase1ProjectRecord[];
  query: string;
  sort: ProjectSort;
}) {
  const totalPendingReview = projects.reduce(
    (total, project) => total + project.snapshot.generatedReviewableCount,
    0,
  );
  const totalApproved = projects.reduce(
    (total, project) => total + project.snapshot.approvedCount,
    0,
  );
  const hasProjects = projects.length > 0;

  return (
    <section className="grid gap-6">
      <section className="phase-command-desk">
        <div className="phase-command-copy">
          <p className="phase-overline">Phase 1 command desk</p>
          <h1 className="phase-command-title">
            Pick up the right customer project quickly.
          </h1>
          <p className="phase-command-body">
            {phaseOneScope.productName} stays focused on one consultant workflow:
            confirm the workbook, generate safe drafts, make consultant
            decisions, shape the script, and export a clean Phase 1 handoff.
          </p>
        </div>
        {hasProjects ? (
          <div className="phase-command-actions">
            <button
              type="button"
              onClick={onCreateSampleProject}
              disabled={!canCreateSampleProject}
              className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create sample project
            </button>
          </div>
        ) : null}
      </section>

      {activeProject ? (
        <section className="phase-priority-strip">
          <div className="phase-priority-copy">
            <p className="phase-overline">Priority project</p>
            <h2 className="phase-section-title">{activeProject.projectName}</h2>
            <p className="phase-section-body">
              {activeProject.customerName} · {getReadableProjectStatus(activeProject).label} · Next stage{" "}
              <strong>{phase1WorkflowMeta[activeProject.currentStep].label}</strong>
            </p>
          </div>
          <div className="phase-priority-meta">
            <PriorityMetric
              label="Pending review"
              value={activeProject.snapshot.generatedReviewableCount}
            />
            <PriorityMetric
              label="Approved"
              value={activeProject.snapshot.approvedCount}
            />
            <PriorityMetric
              label="Source rows"
              value={activeProject.snapshot.sourceRowCount}
            />
          </div>
          <div className="phase-inline-actions">
            <button
              type="button"
              onClick={() => onOpenProject(activeProject)}
              className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-semibold transition"
            >
              Resume project
            </button>
            <button
              type="button"
              onClick={() => onOpenProject(activeProject, "review")}
              className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
            >
              Jump to review
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
            <InlineStat label="Projects" value={projects.length} />
            <InlineStat label="Pending review" value={totalPendingReview} />
            <InlineStat label="Approved rows" value={totalApproved} />
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
              onChange={(event) => onSortChange(event.currentTarget.value as ProjectSort)}
              className="focus-premium theme-shell-input rounded-2xl px-4 py-3 text-sm"
            >
              <option value="recent">Most recent</option>
              <option value="review">Most review pressure</option>
              <option value="approved">Most approved</option>
            </select>
          </label>
        </div>

        {projects.length > 0 ? (
          <div className="phase-project-table">
            <div className="phase-project-table-head">
              <span>Project</span>
              <span>Source</span>
              <span>Status</span>
              <span>Next stage</span>
              <span>Review</span>
              <span>Updated</span>
              <span>Action</span>
            </div>

            <div className="grid gap-3">
              {projects.map((project) => {
                const status = getReadableProjectStatus(project);

                return (
                  <article key={project.projectId} className="phase-project-row">
                    <div className="min-w-0">
                      <p className="phase-project-title">{project.projectName}</p>
                      <p className="phase-project-subtle">{project.customerName}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="phase-project-subtle">{
                        project.snapshot.sourceKind === "fixture"
                          ? "Sample workbook"
                          : "Uploaded workbook"
                      }</p>
                      <p className="phase-project-filename">
                        {project.snapshot.sourceFilename}
                      </p>
                    </div>

                    <div>
                      <span className={status.className}>{status.label}</span>
                    </div>

                    <div className="phase-project-subtle">
                      {phase1WorkflowMeta[project.currentStep].label}
                    </div>

                    <div className="phase-project-subtle">
                      {project.snapshot.generatedReviewableCount} pending ·{" "}
                      {project.snapshot.approvedCount} approved
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
                      <button
                        type="button"
                        onClick={() => onOpenProject(project, "review")}
                        className="focus-premium theme-shell-button-secondary rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                      >
                        Review
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="phase-empty-state">
            <p className="phase-overline">No projects yet</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
              Start with a sample project and walk the full Phase 1 flow.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--shell-muted)]">
              The app is ready once a consultant can move from source to
              generate to review to script to export with almost no
              explanation.
            </p>
            <button
              type="button"
              onClick={onCreateSampleProject}
              disabled={!canCreateSampleProject}
              className="focus-premium theme-button-primary mt-5 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start sample project
            </button>
          </div>
        )}
      </section>
    </section>
  );
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

function getReadableProjectStatus(project: Phase1ProjectRecord) {
  if (project.snapshot.generatedReviewableCount > 0) {
    return {
      className: "phase-project-chip",
      label: "Needs review",
    };
  }

  if (project.snapshot.exportReady) {
    return {
      className: "phase-project-chip phase-project-chip-ready",
      label: "Ready for export",
    };
  }

  return {
    className: "phase-project-chip phase-project-chip-muted",
    label: `In ${phase1WorkflowMeta[project.currentStep].label.toLowerCase()}`,
  };
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
