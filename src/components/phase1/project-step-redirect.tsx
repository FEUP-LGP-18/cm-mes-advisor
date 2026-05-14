"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProjectResumePath } from "@/lib/master-data/workflow";
import {
  getLegacyPhase1StepRedirectPath,
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
        ? getProjectResumePath(project)
        : getLegacyPhase1StepRedirectPath(
            project.projectId,
            mode,
            workflowSnapshot,
          );

    router.replace(nextPath);
  }, [isHydrated, mode, project, router, workflowSnapshot]);

  return (
    <main className="app-canvas relative flex min-h-screen items-center justify-center px-6">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--shell-border)] border-t-[color:var(--shell-accent)]"
        role="status"
        aria-label="Loading project"
      />
    </main>
  );
}
