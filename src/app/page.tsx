import Phase1ProjectHome from "@/components/phase1/project-home";
import { getFixtureWorkspaceState } from "@/lib/phase1/fixture";

export default async function Home() {
  const { workspaceState } = await getFixtureWorkspaceState();

  return <Phase1ProjectHome fallbackWorkspaceState={workspaceState} />;
}
