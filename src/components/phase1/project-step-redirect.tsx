"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProjectResumePath } from "@/lib/master-data/workflow";
import { getLegacyPhase1StepRedirectPath } from "@/lib/phase1/workflow";
import { usePhase1Project } from "./project-provider";

const redirectCopy: Record<
  "current" | "setup" | "handoff",
  { title: string; body: string }
> = {
  current: {
    title: "Opening the current workspace",
    body: "Redirecting to the next available project step.",
  },
  setup: {
    title: "Preparing Phase 1 setup",
    body: "Redirecting to Source or Generate based on the workbook state.",
  },
  handoff: {
    title: "Preparing Phase 1 handoff",
    body:
      "Redirecting to Export when the Markdown handoff is ready, or Script when it still needs review.",
  },
};

export default function Phase1ProjectStepRedirect({
  mode,
}: {
  mode: "current" | "setup" | "handoff";
}) {
  const router = useRouter();
  const { isHydrated, project, workflowSnapshot } = usePhase1Project();
  const copy = redirectCopy[mode];

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
      <div className="grid max-w-sm justify-items-center gap-4 text-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--shell-border)] border-t-[color:var(--shell-accent)]"
          role="status"
          aria-label={copy.title}
        />
        <div>
          <h1 className="text-base font-semibold text-[color:var(--foreground)]">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted-fg)]">
            {copy.body}
          </p>
        </div>
      </div>
    </main>
  );
}
