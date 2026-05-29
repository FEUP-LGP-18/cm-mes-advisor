"use client";

import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function getInitials(email?: string | null): string {
  if (!email) return "U";
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function getDisplayName(email?: string | null): string {
  if (!email) return "User";
  return email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Phase1Topbar({
  email,
  projectId,
}: {
  email?: string | null;
  projectId?: string | null;
}) {
  const supabaseConfigured = isSupabaseConfigured();

  async function handleSignOut() {
    if (!supabaseConfigured) {
      window.location.assign("/");
      return;
    }

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <nav aria-label="Product" className="fv-topbar">
      {/* Brand */}
      <div className="fv-topbar-brand">
        <Link href="/" aria-label="Projects" className="fv-topbar-brand">
          <div className="fv-topbar-logo">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="3" y="3" width="14" height="4" rx="1" fill="currentColor" opacity="0.9" />
              <rect x="3" y="9" width="14" height="4" rx="1" fill="currentColor" opacity="0.7" />
              <rect x="3" y="15" width="14" height="2" rx="1" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
          <div>
            <div className="fv-topbar-name">MES Advisor</div>
            <div className="fv-topbar-sub">Critical Manufacturing</div>
          </div>
        </Link>
      </div>

      {/* Right */}
      <div className="fv-topbar-right">
        {projectId ? (
          <span className="fv-topbar-project-pill">{projectId}</span>
        ) : null}

        <Link href="/" className="fv-topbar-link">Projects</Link>

        {email ? (
          <span className="fv-topbar-username">{getDisplayName(email)}</span>
        ) : null}

        <div className="fv-topbar-avatar" aria-hidden="true">
          {getInitials(email)}
        </div>

        {supabaseConfigured ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="fv-topbar-logout"
            aria-label="Sign out"
          >
            Logout
          </button>
        ) : null}
      </div>
    </nav>
  );
}
