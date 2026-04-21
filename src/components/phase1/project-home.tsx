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
      <div className="mx-auto flex w-full max-w-[1460px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Phase1Topbar />

        <header className="phase-home-header">
          <div className="max-w-4xl">
            <p className="phase-overline">Local Phase 1 workspace</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[color:var(--shell-ink)] sm:text-5xl">
              Projects first, then source, generate, review, script, and export.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--shell-muted)] sm:text-base">
              {phaseOneScope.productName} is a consultant-facing Phase 1 flow.
              Start from the local sample project, or reopen the last project
              and continue where the review stopped.
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
          <section
            className={
              projects.length === 1
                ? "grid gap-4 lg:max-w-[720px]"
                : "grid gap-4 lg:grid-cols-2"
            }
          >
            {projects.map((project) => (
              <article key={project.projectId} className="phase-project-card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="phase-project-chip">
                    {project.snapshot.sourceKind === "fixture"
                      ? "Sample workbook"
                      : "Uploaded workbook"}
                  </span>
                  <span className="phase-project-chip">
                    {project.snapshot.generatedReviewableCount > 0
                      ? "Needs review"
                      : project.snapshot.exportReady
                        ? "Export ready"
                        : "In progress"}
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-bold tracking-[-0.04em] text-[color:var(--shell-ink)]">
                  {project.projectName}
                </h2>
                <p className="mt-2 break-all text-sm leading-6 text-[color:var(--shell-muted)]">
                  Source: {project.snapshot.sourceFilename}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--shell-muted)]">
                  Next route:{" "}
                  <span className="font-semibold text-[color:var(--shell-ink)]">
                    {project.currentStep}
                  </span>
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <PhaseHomeInlineStat
                    label="Rows"
                    value={project.snapshot.sourceRowCount}
                  />
                  <PhaseHomeInlineStat
                    label="Review"
                    value={project.snapshot.generatedReviewableCount}
                  />
                  <PhaseHomeInlineStat
                    label="Approved"
                    value={project.snapshot.approvedCount}
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={getPhase1StepPath(
                      project.projectId,
                      project.currentStep,
                    )}
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
                    Open review
                  </Link>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="phase-empty-state">
            <p className="phase-overline">Empty state</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[color:var(--shell-ink)]">
              No local projects yet
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--shell-muted)]">
              Create a sample project to explore the full Phase 1 flow locally.
              You can replace the workbook later inside the source step.
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

function PhaseHomeInlineStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--shell-border)] bg-[color:var(--shell-soft-surface)] px-3 py-3">
      <p className="phase-overline">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[color:var(--shell-ink)]">
        {value.toLocaleString("en-US")}
      </p>
    </div>
  );
}
