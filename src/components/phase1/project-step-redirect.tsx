"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getLegacyPhase1StepRedirectPath,
  getPhase1StepPath,
} from "@/lib/phase1/workflow";
import { usePhase1Project } from "./project-provider";

export default function Phase1ProjectStepRedirect({
  mode,
}: {
  mode: "current" | "setup" | "handoff";
}) {
  const router = useRouter();
  const { isHydrated, project, workflowSnapshot } = usePhase1Project();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!project) {
      router.replace("/");
      return;
    }

    const nextPath =
      mode === "current"
        ? getPhase1StepPath(project.projectId, project.currentStep)
        : getLegacyPhase1StepRedirectPath(
            project.projectId,
            mode,
            workflowSnapshot,
          );

    router.replace(nextPath);
  }, [isHydrated, mode, project, router, workflowSnapshot]);

  return (
    <main className="app-canvas flex min-h-screen items-center justify-center px-6">
      <div className="phase-empty-state max-w-xl text-center">
        <p className="phase-overline">Redirecting</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
          Loading the right project step
        </h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
          The local workflow state is loading so this route can reopen the most
          useful stage for the current project.
        </p>
      </div>
    </main>
  );
}
