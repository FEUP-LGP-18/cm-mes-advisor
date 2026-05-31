import { redirect } from "next/navigation";
import ProfileSettings from "@/components/profile/profile-settings";
import { getCurrentProfile } from "@/lib/projects/profile.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import Phase1Topbar from "@/components/phase1/phase-topbar";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="fv-shell">
        <Phase1Topbar />
        <div className="fv-body">
          <main className="fv-content" id="main-content">
            <div className="fv-page">
              <div className="fv-empty">
                <div className="fv-empty-title">Profile unavailable</div>
                <div className="fv-empty-body">
                  Local mock mode does not persist account profiles. Configure
                  Supabase Auth to edit a signed-in user profile.
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const profileResult = await getCurrentProfile();

  if (!profileResult.ok) {
    redirect("/login?next=%2Fprofile");
  }

  return <ProfileSettings initialProfile={profileResult.data} />;
}
