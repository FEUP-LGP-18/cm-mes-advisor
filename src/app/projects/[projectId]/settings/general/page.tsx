import {
  getProjectCapabilities,
  requireProjectCapability,
} from "@/lib/projects/permissions.server";
import {
  getProjectForUser,
  listProjectActivity,
} from "@/lib/projects/repository.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { notFound } from "next/navigation";
import GeneralSettings from "@/components/phase1/general-settings";
import type { Project, ProjectActivityEvent } from "@/lib/projects/types";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  let isOwner = true;
  let serverProject: Project | null = null;
  let recentActivityEvents: ProjectActivityEvent[] = [];

  if (isSupabaseConfigured()) {
    const readResult = await requireProjectCapability(projectId, "read_project");
    if (!readResult.ok) {
      notFound();
    }

    const capabilitiesResult = await getProjectCapabilities(
      projectId,
      readResult.data.id,
    );
    isOwner =
      capabilitiesResult.ok &&
      capabilitiesResult.data.includes("manage_project_settings");

    const projectResult = await getProjectForUser(projectId, readResult.data.id);
    if (!projectResult.ok) {
      notFound();
    }
    serverProject = projectResult.data;

    const activityResult = await listProjectActivity(
      projectId,
      readResult.data.id,
      8,
    );
    recentActivityEvents = activityResult.ok ? activityResult.data : [];
  }

  return (
    <GeneralSettings
      isOwner={isOwner}
      isServerBacked={isSupabaseConfigured()}
      projectId={projectId}
      recentActivityEvents={recentActivityEvents}
      serverProject={serverProject}
    />
  );
}
