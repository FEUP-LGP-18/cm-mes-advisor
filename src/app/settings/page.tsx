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
    <div className="fv-shell">
      <Phase1Topbar email={currentUserEmail} />
      <div className="fv-body">
        <main className="fv-content" id="main-content">
          <div className="fv-page">
            <GlobalSettingsView
              currentUserEmail={currentUserEmail}
              generationMode={generationConfig.mode}
              realGenerationConfigured={missingRealConfig.length === 0}
              supabaseConfigured={supabaseStatus.configured}
              supabaseMissing={supabaseStatus.missing}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
