import { requireProjectCapability } from "@/lib/projects/permissions.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import CollaborationSettings from "@/components/phase1/collaboration-settings";

export default async function CollaborationSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const isServerBacked = isSupabaseConfigured();
  let isOwner = true;

  if (isServerBacked) {
    const capResult = await requireProjectCapability(
      projectId,
      "manage_project_members",
    );
    isOwner = capResult.ok;
  }

  return (
    <CollaborationSettings
      isOwner={isOwner}
      isServerBacked={isServerBacked}
      projectId={projectId}
    />
  );
}
