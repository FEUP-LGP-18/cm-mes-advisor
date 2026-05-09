"use client";

import { useRouter } from "next/navigation";
import type { Phase1WorkflowStep } from "@/lib/phase1/workflow";
import { usePhase1Project } from "./project-provider";
import Phase1Topbar from "./phase-topbar";

export default function Phase1ProjectStepRoute({
  step: _step,
}: {
  initialGenerationAvailability?: unknown;
  step: Phase1WorkflowStep;
}) {
  const router = useRouter();
  const { isHydrated, project } = usePhase1Project();

  if (!isHydrated) {
    return (
      <main className="app-canvas flex min-h-screen items-center justify-center px-6">
        <div className="phase-empty-state max-w-xl text-center">
          <p className="phase-overline">Loading project</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Restoring the Phase 1 workspace
          </h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
            The saved project state is loading so the correct customer
            workspace can be restored before you continue.
          </p>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="app-canvas flex min-h-screen items-center justify-center px-6">
        <div className="phase-empty-state max-w-xl text-center">
          <p className="phase-overline">Project not found</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            This project is no longer available
          </h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
            Return to the project desk and reopen another Phase 1 workspace.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="focus-premium theme-button-primary mt-5 rounded-2xl px-5 py-3 text-sm font-semibold transition"
          >
            Back to project desk
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-canvas min-h-screen text-[color:var(--shell-ink)]">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Phase1Topbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <p className="phase-overline">Coming soon</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">
            Project details
          </h1>
          <p className="max-w-sm text-sm leading-7 text-[color:var(--shell-muted)]">
            This workspace is being built.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="focus-premium theme-shell-button-secondary mt-2 rounded-2xl px-5 py-3 text-sm font-semibold transition"
          >
            Back to project desk
          </button>
        </div>
      </div>
    </main>
  );
}
