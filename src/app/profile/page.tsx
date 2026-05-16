import { redirect } from "next/navigation";
import Phase1Topbar from "@/components/phase1/phase-topbar";
import ProfileSettings from "@/components/profile/profile-settings";
import { getCurrentProfile } from "@/lib/projects/profile.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="app-canvas min-h-screen text-[color:var(--shell-ink)]">
        <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <Phase1Topbar />
          <section className="phase-empty-state">
            <p className="phase-overline">Profile unavailable</p>
            <h1 className="mt-2 text-3xl font-semibold">
              Supabase is not configured.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--shell-muted)]">
              Local mock mode does not persist account profiles. Configure
              Supabase Auth to edit a signed-in user profile.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const profileResult = await getCurrentProfile();

  if (!profileResult.ok) {
    redirect("/login?next=%2Fprofile");
  }

  return (
    <main className="app-canvas min-h-screen text-[color:var(--shell-ink)]">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Phase1Topbar email={profileResult.data.email} />
        <ProfileSettings initialProfile={profileResult.data} />
      </div>
    </main>
  );
}
