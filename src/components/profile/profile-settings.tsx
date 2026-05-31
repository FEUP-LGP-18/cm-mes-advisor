"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Phase1Topbar from "@/components/phase1/phase-topbar";
import {
  AVATAR_COLORS,
  AVATAR_COLOR_KEY,
  DISPLAY_NAME_KEY,
  getInitials,
  getDefaultAvatarColor,
  getSavedAvatarColor,
} from "@/lib/avatar";
import type { CurrentUserProfile } from "@/lib/projects/types";

export default function ProfileSettings({
  initialProfile,
  onSaved,
}: {
  initialProfile: CurrentUserProfile;
  onSaved?: (profile: CurrentUserProfile) => void;
}) {
  const [displayName, setDisplayName] = useState(initialProfile.name ?? "");
  const [profile, setProfile] = useState(initialProfile);
  // pendingColor: what the picker shows (updates instantly for preview in card)
  // savedColor: committed value shown in the topbar (only updates on Save)
  const [pendingColor, setPendingColor] = useState(() => getDefaultAvatarColor(initialProfile.email));
  const [savedColor, setSavedColor] = useState(() => getDefaultAvatarColor(initialProfile.email));
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const color = getSavedAvatarColor(initialProfile.email);
    setPendingColor(color);
    setSavedColor(color);
  }, [initialProfile.email]);

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    setFeedback(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        body: JSON.stringify({ displayName }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const body = (await response.json().catch(() => null)) as
        | CurrentUserProfile
        | { error?: string }
        | null;

      if (!response.ok || !isProfileResponse(body)) {
        setFeedback({
          message:
            body && "error" in body && body.error
              ? body.error
              : "Profile could not be saved.",
          tone: "error",
        });
        return;
      }

      setProfile(body);
      setDisplayName(body.name ?? "");
      // Only now commit the pending color to the topbar and localStorage
      setSavedColor(pendingColor);
      try {
        window.localStorage.setItem(AVATAR_COLOR_KEY, pendingColor);
        if (body.name) window.localStorage.setItem(DISPLAY_NAME_KEY, body.name);
        else window.localStorage.removeItem(DISPLAY_NAME_KEY);
      } catch {
        // localStorage is optional; server-side profile update already succeeded.
      }
      setFeedback({ message: "Profile saved.", tone: "success" });
      onSaved?.(body);
    } catch {
      setFeedback({
        message: "Could not reach the server. Please try again.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Card preview: shows draft state (updates while typing / picking)
  const previewName = displayName || profile.email?.split("@")[0] || "User";
  // Topbar: shows saved state only
  const savedName = profile.name || undefined;

  return (
    <div className="fv-shell">
      <Phase1Topbar
        email={profile.email ?? undefined}
        displayName={savedName}
        avatarColor={savedColor}
      />

      <div className="fv-body">
        <nav className="fv-sidebar" aria-label="Account navigation">
          <div className="fv-sidebar-section">
            <span className="fv-sidebar-label">Account</span>
            <span className="fv-nav-item fv-nav-item-active" aria-current="page">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="8" cy="5.5" r="2.5" />
                <path d="M3 13c0-2.5 2-4 5-4s5 1.5 5 4" />
              </svg>
              Profile
            </span>
          </div>
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
          </div>
        </nav>

        <main className="fv-content" id="main-content">
          <div className="fv-page">
            <nav className="fv-breadcrumb" aria-label="Breadcrumb">
              <Link href="/" className="fv-breadcrumb-link">Projects</Link>
              <span className="fv-breadcrumb-sep">/</span>
              <span>Profile</span>
            </nav>

            <div style={{ marginBottom: "1.25rem" }}>
              <h1 className="fv-page-title">Profile</h1>
              <p className="fv-page-subtitle">
                Keep the display name collaborators see in project activity and settings.
              </p>
            </div>

            {feedback ? (
              <div
                className={`fv-callout ${feedback.tone === "success" ? "fv-callout-success" : "fv-callout-error"}`}
                role={feedback.tone === "error" ? "alert" : "status"}
                style={{ marginBottom: "1rem" }}
              >
                {feedback.message}
              </div>
            ) : null}

            <div className="fv-card">
              {/* Avatar preview — shows draft state */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: pendingColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.375rem",
                    fontWeight: 700,
                    color: "#fff",
                    flexShrink: 0,
                    letterSpacing: "-0.02em",
                  }}
                  aria-hidden="true"
                >
                  {getInitials(profile.email)}
                </div>
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--foreground)" }}>
                    {previewName}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted-fg)", marginTop: "0.125rem" }}>
                    {profile.email}
                  </div>
                </div>
              </div>

              {/* Color picker — pending only, applied on Save */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div className="fv-field-label" style={{ marginBottom: "0.5rem" }}>Avatar color</div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Select color ${color}`}
                      aria-pressed={pendingColor === color}
                      onClick={() => setPendingColor(color)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: color,
                        border: pendingColor === color ? "3px solid var(--foreground)" : "3px solid transparent",
                        cursor: "pointer",
                        padding: 0,
                        outline: pendingColor === color ? "2px solid var(--surface)" : "none",
                        outlineOffset: "-4px",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="fv-card-title" style={{ marginBottom: "0.75rem" }}>
                Account details
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                Email comes from Supabase Auth. Display name is stored in the app
                profile table and can be updated without changing sign-in details.
              </p>

              <form className="grid gap-4" style={{ maxWidth: "32rem" }} onSubmit={handleSubmit} noValidate>
                <div>
                  <label className="fv-field-label" htmlFor="profile-email">Email</label>
                  <input
                    id="profile-email"
                    readOnly
                    value={profile.email ?? ""}
                    className="fv-input"
                    style={{ background: "var(--surface-muted)", color: "var(--muted-fg)" }}
                  />
                </div>

                <div>
                  <label className="fv-field-label" htmlFor="profile-display-name">Display name</label>
                  <input
                    id="profile-display-name"
                    maxLength={120}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.currentTarget.value)}
                    placeholder="Name shown to collaborators"
                    className="fv-input"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="fv-btn-primary"
                  >
                    {isSaving ? "Saving…" : "Save profile"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function isProfileResponse(value: unknown): value is CurrentUserProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<CurrentUserProfile>;
  return typeof profile.id === "string" && "email" in profile;
}
