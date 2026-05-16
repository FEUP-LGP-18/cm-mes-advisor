import Phase1ProjectHome from "@/components/phase1/project-home";
import { createProjectAction } from "@/lib/projects/actions";
import LocalPhase1ProjectHome from "@/components/phase1/local-project-home";
import { getFixtureWorkspaceState } from "@/lib/phase1/fixture";
import { getCurrentProfile } from "@/lib/projects/profile.server";
import { listProjectsForUser } from "@/lib/projects/repository.server";
import type { CreateProjectActionState } from "@/lib/projects/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";

const initialCreateProjectActionState: CreateProjectActionState = {
  message: null,
  status: "idle",
};

export default async function Home() {
  if (!isSupabaseConfigured()) {
    const { workspaceState } = await getFixtureWorkspaceState();

    return <LocalPhase1ProjectHome fallbackWorkspaceState={workspaceState} />;
  }

  const userResult = await getCurrentProfile();

  if (!userResult.ok) {
    redirect("/login?next=%2F");
  }

  const projectsResult = await listProjectsForUser(userResult.data.id);

  return (
    <Phase1ProjectHome
      currentUser={userResult.data}
      createProject={createProjectAction}
      initialCreateProjectState={initialCreateProjectActionState}
      listError={projectsResult.ok ? null : projectsResult.message}
      projects={projectsResult.ok ? projectsResult.data : []}
    />
  );
}
