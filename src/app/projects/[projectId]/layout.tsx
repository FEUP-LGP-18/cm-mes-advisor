import { Phase1ProjectProvider } from "@/components/phase1/project-provider";
import { getFixtureWorkspaceState } from "@/lib/phase1/fixture";

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

  return (
    <Phase1ProjectProvider
      fallbackWorkspaceState={workspaceState}
      routeProjectId={projectId}
    >
      {children}
    </Phase1ProjectProvider>
  );
}
