import { Phase1ProjectProvider } from "@/components/phase1/project-provider";
import { getFixtureWorkspaceState } from "@/lib/phase1/fixture";
import {
  getProjectCapabilities,
  requireProjectCapability,
} from "@/lib/projects/permissions.server";
import {
  getProjectForUser,
  getProjectPhaseState,
} from "@/lib/projects/repository.server";
import type { CurrentUser, Project } from "@/lib/projects/types";
import {
  parseRequirementsWorkspaceState,
  type RequirementsWorkspaceState,
} from "@/lib/requirements/workspace-state";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { notFound } from "next/navigation";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [resolvedParams, { workspaceState }] = await Promise.all([
    params,
    getFixtureWorkspaceState(),
  ]);
  const projectId = Array.isArray(resolvedParams.projectId)
    ? resolvedParams.projectId[0]
    : resolvedParams.projectId;

  if (!projectId) {
    throw new Error("Project route is missing the projectId parameter.");
  }

  let initialServerProject: Project | null = null;
  let initialServerWorkspaceState: RequirementsWorkspaceState | null = null;
  let initialCurrentUser: CurrentUser | null = null;
  let initialCanUploadWorkbook = true;

  if (isSupabaseConfigured()) {
    const capabilityResult = await requireProjectCapability(
      projectId,
      "read_project",
    );
    if (!capabilityResult.ok) {
      notFound();
    }
    initialCurrentUser = capabilityResult.data;
    const capabilitiesResult = await getProjectCapabilities(
      projectId,
      capabilityResult.data.id,
    );
    initialCanUploadWorkbook =
      capabilitiesResult.ok &&
      capabilitiesResult.data.includes("upload_project_file");

    const projectResult = await getProjectForUser(
      projectId,
      capabilityResult.data.id,
    );
    if (!projectResult.ok) {
      notFound();
    }
    initialServerProject = projectResult.data;

    const sourceStateResult = await getProjectPhaseState(
      projectId,
      "source",
      capabilityResult.data.id,
    );
    if (!sourceStateResult.ok) {
      throw new Error(sourceStateResult.message);
    }

    if (sourceStateResult.data) {
      initialServerWorkspaceState = parseRequirementsWorkspaceState(
        sourceStateResult.data.state,
        workspaceState,
      );
    }
  }

  return (
    <Phase1ProjectProvider
      fallbackWorkspaceState={workspaceState}
      initialCanUploadWorkbook={initialCanUploadWorkbook}
      initialCurrentUser={initialCurrentUser}
      initialServerProject={initialServerProject}
      initialServerWorkspaceState={initialServerWorkspaceState}
      routeProjectId={projectId}
    >
      {children}
    </Phase1ProjectProvider>
  );
}
