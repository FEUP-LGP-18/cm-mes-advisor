import Phase1ProjectHome from "@/components/phase1/project-home";
import { createProjectAction } from "@/lib/projects/actions";
import { listProjectsForUser } from "@/lib/projects/repository.server";
import { requireUser } from "@/lib/projects/permissions.server";
import type { CreateProjectActionState } from "@/lib/projects/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";

const initialCreateProjectActionState: CreateProjectActionState = {
  message: null,
  status: "idle",
};

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return (
      <Phase1ProjectHome
        currentUser={null}
        createProject={createProjectAction}
        initialCreateProjectState={initialCreateProjectActionState}
        listError="Supabase Auth is not configured for this environment."
        projects={[]}
      />
    );
  }

  const userResult = await requireUser();

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
