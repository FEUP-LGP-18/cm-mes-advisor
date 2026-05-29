"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AUTH_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/auth-messages";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import AuthShell from "@/components/auth/auth-shell";
import MesLogo from "@/components/brand/mes-logo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabaseConfigured = isSupabaseConfigured();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabaseConfigured) {
      setError(AUTH_NOT_CONFIGURED_MESSAGE);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });

    if (authError) {
      setError("Could not update the password. The reset link may have expired — request a new one.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell>
      <div className="fv-auth-card fv-auth-card-compact">
        <div className="fv-auth-logo-wrap">
          <MesLogo className="fv-auth-logo-full" tone="color" />
        </div>
        <h1 className="fv-auth-heading">Set new password</h1>
        <p className="fv-auth-sub">Choose a strong password for your account.</p>

          <form onSubmit={handleSubmit} className="fv-auth-form" noValidate>
            <div className="fv-auth-field">
              <label
                htmlFor="password"
                className="fv-auth-field-label"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                placeholder="At least 6 characters"
                className="fv-auth-input"
              />
            </div>

            <div className="fv-auth-field">
              <label
                htmlFor="confirm"
                className="fv-auth-field-label"
              >
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.currentTarget.value)}
                placeholder="Repeat your password"
                className="fv-auth-input"
              />
            </div>

            {!supabaseConfigured ? (
              <div role="alert" className="fv-auth-alert">
                {AUTH_NOT_CONFIGURED_MESSAGE}
              </div>
            ) : null}

            {error ? (
              <div role="alert" className="fv-auth-alert">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !supabaseConfigured}
              className="fv-auth-submit"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
          {!supabaseConfigured ? (
            <Link
              href="/"
              className="fv-auth-submit"
              style={{ display: "flex", marginTop: "1rem", textDecoration: "none" }}
            >
              Continue in mock mode
            </Link>
          ) : null}
      </div>
    </AuthShell>
  );
}
