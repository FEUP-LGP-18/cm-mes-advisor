import Phase1Topbar from "@/components/phase1/phase-topbar";
import { GlobalSettingsView } from "@/components/settings/global-settings";
import { getCurrentProfile } from "@/lib/projects/profile.server";
import {
  getMissingRealGenerationConfigKeys,
  readRequirementGenerationServerConfig,
} from "@/lib/requirements/server/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readSupabaseServerConfigStatus } from "@/lib/supabase/server-config";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let currentUserEmail: string | null = null;

  if (isSupabaseConfigured()) {
    const userResult = await getCurrentProfile();
    currentUserEmail = userResult.ok ? userResult.data.email : null;
  }

  const generationConfig = readRequirementGenerationServerConfig();
  const supabaseStatus = readSupabaseServerConfigStatus();
  const missingRealConfig =
    getMissingRealGenerationConfigKeys(generationConfig);

  return (
    <main className="app-canvas min-h-screen text-[color:var(--shell-ink)]">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Phase1Topbar email={currentUserEmail} />
        <GlobalSettingsView
          currentUserEmail={currentUserEmail}
          generationMode={generationConfig.mode}
          realGenerationConfigured={missingRealConfig.length === 0}
          supabaseConfigured={supabaseStatus.configured}
          supabaseMissing={supabaseStatus.missing}
        />
      </div>
    </main>
  );
}
