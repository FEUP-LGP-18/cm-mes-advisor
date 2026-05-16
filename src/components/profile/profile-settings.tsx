"use client";

import Link from "next/link";
import { useState } from "react";
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
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

  return (
    <section className="mx-auto grid w-full max-w-[980px] gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <header className="phase-shell-header">
        <div className="phase-shell-header-top w-full">
          <div className="phase-shell-breadcrumbs">
            <Link href="/" className="phase-product-link">
              Projects
            </Link>
            <span className="phase-shell-divider">/</span>
            <span>Profile</span>
          </div>
          <div className="phase-shell-pill-row ml-auto">
            <span className="phase-shell-pill">Account</span>
          </div>
        </div>
        <div className="phase-shell-header-main">
          <div className="phase-shell-title-block">
            <h1 className="phase-shell-title">Profile</h1>
            <p className="phase-shell-helper">
              Keep the display name collaborators see in project activity and
              settings.
            </p>
          </div>
        </div>
      </header>

      {feedback ? (
        <div
          className={`phase-feedback ${
            feedback.tone === "success"
              ? "phase-feedback-success"
              : "phase-feedback-error"
          }`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </div>
      ) : null}

      <section className="phase-section-card">
        <div className="phase-section-copy">
          <h2 className="phase-section-title">Account details</h2>
          <p className="phase-section-body">
            Email comes from Supabase Auth. Display name is stored in the app
            profile table and can be updated without changing sign-in details.
          </p>
        </div>

        <form className="grid max-w-lg gap-4" onSubmit={handleSubmit} noValidate>
          <label className="phase-select-wrap">
            <span>Email</span>
            <input
              readOnly
              value={profile.email ?? ""}
              className="focus-premium theme-shell-input rounded-2xl px-4 py-3 text-sm"
            />
          </label>

          <label className="phase-select-wrap">
            <span>Display name</span>
            <input
              maxLength={120}
              value={displayName}
              onChange={(event) => setDisplayName(event.currentTarget.value)}
              placeholder="Name shown to collaborators"
              className="focus-premium theme-shell-input rounded-2xl px-4 py-3 text-sm"
            />
          </label>

          <div className="phase-inline-actions">
            <button
              type="submit"
              disabled={isSaving}
              className="focus-premium theme-button-primary rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving profile..." : "Save profile"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

function isProfileResponse(value: unknown): value is CurrentUserProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Partial<CurrentUserProfile>;
  return typeof profile.id === "string" && "email" in profile;
}
