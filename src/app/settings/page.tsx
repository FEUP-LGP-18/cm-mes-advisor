import Link from "next/link";
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
        <nav className="fv-sidebar" aria-label="Workspace navigation">
          <div className="fv-sidebar-section">
            <span className="fv-sidebar-label">Navigation</span>
            <Link href="/" className="fv-nav-item">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="2" y="2" width="5" height="5" rx="1" />
                <rect x="9" y="2" width="5" height="5" rx="1" />
                <rect x="2" y="9" width="5" height="5" rx="1" />
                <rect x="9" y="9" width="5" height="5" rx="1" />
              </svg>
              Projects
            </Link>
            <Link href="/settings" className="fv-nav-item fv-nav-item-active">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="8" cy="8" r="2.5" />
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
              </svg>
              Settings
            </Link>
          </div>
        </nav>
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
