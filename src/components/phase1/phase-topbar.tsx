"use client";

import Link from "next/link";
import MesLogo from "@/components/brand/mes-logo";
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
  variant = "app",
}: {
  email?: string | null;
  projectId?: string | null;
  variant?: "app" | "landing";
}) {
  const supabaseConfigured = isSupabaseConfigured();
  const isLanding = variant === "landing";

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
    <nav
      aria-label="Product"
      className={`fv-topbar${isLanding ? " fv-topbar-landing" : ""}`}
    >
      <Link href="/" aria-label="Projects" className="fv-topbar-brand">
        <MesLogo className="fv-topbar-logo-full" tone="white" />
        <span className="fv-topbar-sub">Critical Manufacturing</span>
      </Link>

      <div className="fv-topbar-right">
        {projectId ? (
          <span className="fv-topbar-project-pill">{projectId}</span>
        ) : null}

        <Link
          href="/"
          className={`fv-topbar-link${isLanding ? " fv-topbar-link-active" : ""}`}
          aria-current={isLanding ? "page" : undefined}
        >
          Projects
        </Link>

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
