"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MesLogo from "@/components/brand/mes-logo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  clearActiveProfileEmail,
  getInitials,
  getDisplayName,
  getDefaultAvatarColor,
  getSavedAvatarColor,
  getSavedDisplayName,
  rememberProfileEmail,
} from "@/lib/avatar";

export default function Phase1Topbar({
  email,
  projectId,
  displayName,
  avatarColor: avatarColorProp,
}: {
  email?: string | null;
  projectId?: string | null;
  displayName?: string | null;
  avatarColor?: string | null;
}) {
  const supabaseConfigured = isSupabaseConfigured();
  const [avatarColor, setAvatarColor] = useState(() => avatarColorProp ?? getDefaultAvatarColor(email));
  const [resolvedName, setResolvedName] = useState(() => displayName || getDisplayName(email));
  const [resolvedInitials, setResolvedInitials] = useState(() => getInitials(displayName || email));

  useEffect(() => {
    if (avatarColorProp) {
      setAvatarColor(avatarColorProp);
    } else if (supabaseConfigured || email) {
      setAvatarColor(getSavedAvatarColor(email));
    } else {
      setAvatarColor(getDefaultAvatarColor(email));
    }
  }, [email, avatarColorProp, supabaseConfigured]);

  useEffect(() => {
    rememberProfileEmail(email);

    if (displayName) {
      setResolvedName(displayName);
      setResolvedInitials(getInitials(displayName));
    } else if (supabaseConfigured || email) {
      const nextName = getSavedDisplayName(email) || getDisplayName(email);
      setResolvedName(nextName);
      setResolvedInitials(getInitials(nextName || email));
    } else {
      const nextName = getDisplayName(email);
      setResolvedName(nextName);
      setResolvedInitials(getInitials(email));
    }
  }, [email, displayName, supabaseConfigured]);

  async function handleSignOut() {
    clearActiveProfileEmail();

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
      <Link href="/" aria-label="Projects" className="fv-topbar-brand">
        <MesLogo className="fv-topbar-logo-full" tone="white" />
        <span className="fv-topbar-sub">Critical Manufacturing</span>
      </Link>

      <div className="fv-topbar-right">
        {projectId ? (
          <span className="fv-topbar-project-pill">{projectId}</span>
        ) : null}

        <Link href="/" className="fv-topbar-link">Projects</Link>

        {email ? (
          <Link href="/profile" className="fv-topbar-username" aria-label="Your profile">
            {resolvedName}
          </Link>
        ) : null}

        <Link
          href="/profile"
          className="fv-topbar-avatar"
          aria-label="Your profile"
          style={{ background: avatarColor }}
        >
          {resolvedInitials}
        </Link>

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
