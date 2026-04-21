"use client";

import Link from "next/link";
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
import { getPhase1StepPath } from "@/lib/phase1/workflow";
import type { RequirementsWorkspaceState } from "@/lib/requirements";
import Phase1Topbar from "./phase-topbar";

export default function Phase1ProjectHome({
  fallbackWorkspaceState,
}: {
  fallbackWorkspaceState: RequirementsWorkspaceState;
}) {
  const router = useRouter();
  const [registry, setRegistry] = useState<Phase1ProjectRegistry | null>(null);

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

  function handleOpenProject(project: Phase1ProjectRecord) {
    if (!registry) {
      return;
    }

    const nextRegistry = setActivePhase1Project(registry, project.projectId);
    persistRegistry(nextRegistry);
  }

  return (
    <main className="mesh-background min-h-screen overflow-x-hidden text-[color:var(--shell-ink)]">
      <div className="mx-auto flex w-full max-w-[1460px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Phase1Topbar />

        <header className="phase-home-header">
          <div className="max-w-4xl">
            <p className="phase-overline">Local Phase 1 workspace</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[color:var(--shell-ink)] sm:text-[2.8rem]">
              Resume the project that still needs consultant work.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--shell-muted)] sm:text-base">
              {phaseOneScope.productName} works best as a compact project queue.
              Reopen the active project, or create a fresh local sample when you
              want to test the full Phase 1 flow again.
            </p>
          </div>

          <div className="phase-home-actions">
            {activeProject ? (
              <Link
                href={getPhase1StepPath(
                  activeProject.projectId,
                  activeProject.currentStep,
                )}
                onClick={() => handleOpenProject(activeProject)}
                className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-black transition"
              >
                Continue active project
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleCreateSampleProject}
              className={`focus-premium rounded-2xl px-5 py-3 text-sm transition ${
                activeProject
                  ? "theme-shell-button-secondary font-bold"
                  : "theme-button-primary font-black"
              }`}
            >
              {activeProject
                ? "Create another sample project"
                : "Create sample project"}
            </button>
          </div>
        </header>

        <section className="phase-home-strip">
          <PhaseHomeStat label="Projects" value={projects.length} />
          <PhaseHomeStat
            label="Pending review"
            value={projects.reduce(
              (total, project) =>
                total + project.snapshot.generatedReviewableCount,
              0,
            )}
          />
          <PhaseHomeStat
            label="Approved rows"
            value={projects.reduce(
              (total, project) => total + project.snapshot.approvedCount,
              0,
            )}
          />
        </section>

        {projects.length > 0 ? (
          <section className="phase-project-table-shell">
            <div className="phase-project-table-header">
              <div>
                <p className="phase-overline">Open projects</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[color:var(--shell-ink)]">
                  Keep the home screen focused on resuming work
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-[color:var(--shell-muted)]">
                The table below keeps source, review pressure, and project
                status visible without turning the home route into a second
                dashboard.
              </p>
            </div>

            <div className="phase-project-table">
              <div className="phase-project-table-head">
                <span>Project</span>
                <span>Source</span>
                <span>Status</span>
                <span>Review</span>
                <span>Approved</span>
                <span>Action</span>
              </div>

              <div className="grid gap-3">
                {projects.map((project) => {
                  const status = getProjectStatus(project);
                  const projectHref = getPhase1StepPath(
                    project.projectId,
                    project.currentStep,
                  );

                  return (
                    <article
                      key={project.projectId}
                      className="phase-project-row"
                    >
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[color:var(--shell-ink)]">
                          {project.projectName}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--shell-muted)]">
                          Next step:{" "}
                          <span className="font-semibold text-[color:var(--shell-ink)]">
                            {project.currentStep}
                          </span>
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[color:var(--shell-ink)]">
                          {project.snapshot.sourceKind === "fixture"
                            ? "Sample workbook"
                            : "Uploaded workbook"}
                        </p>
                        <p className="mt-1 break-all text-sm leading-6 text-[color:var(--shell-muted)]">
                          {project.snapshot.sourceFilename}
                        </p>
                      </div>

                      <div>
                        <span className={status.className}>{status.label}</span>
                      </div>

                      <ProjectMetric
                        label="Pending review"
                        value={project.snapshot.generatedReviewableCount}
                      />
                      <ProjectMetric
                        label="Approved"
                        value={project.snapshot.approvedCount}
                      />

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={projectHref}
                          onClick={() => handleOpenProject(project)}
                          className="focus-premium theme-button-primary rounded-2xl px-4 py-3 text-sm font-black transition"
                        >
                          Open project
                        </Link>
                        <Link
                          href={getPhase1StepPath(project.projectId, "review")}
                          onClick={() => handleOpenProject(project)}
                          className="focus-premium theme-shell-button-secondary rounded-2xl px-4 py-3 text-sm font-bold transition"
                        >
                          Review
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
          <section className="phase-empty-state">
            <p className="phase-overline">Empty state</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[color:var(--shell-ink)]">
              No local projects yet
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--shell-muted)]">
              Create a sample project to walk through source, generation,
              review, script, and export without adding any backend setup.
            </p>
            <button
              type="button"
              onClick={handleCreateSampleProject}
              className="focus-premium theme-button-primary mt-5 rounded-2xl px-5 py-3 text-sm font-black transition"
            >
              Start sample project
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

function PhaseHomeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="phase-stat">
      <p className="phase-overline">{label}</p>
      <p className="mt-2 text-lg font-bold tracking-[-0.03em] text-[color:var(--shell-ink)]">
        {value.toLocaleString("en-US")}
      </p>
    </div>
  );
}

function ProjectMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="phase-project-row-metric">
      <p className="phase-overline">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[color:var(--shell-ink)]">
        {value.toLocaleString("en-US")}
      </p>
    </div>
  );
}

function getProjectStatus(project: Phase1ProjectRecord) {
  if (project.snapshot.generatedReviewableCount > 0) {
    return {
      className: "phase-project-chip",
      label: "Needs review",
    };
  }

  if (project.snapshot.exportReady) {
    return {
      className: "phase-project-chip phase-project-chip-ready",
      label: "Export ready",
    };
  }

  return {
    className: "phase-project-chip phase-project-chip-muted",
    label: "In progress",
  };
}
