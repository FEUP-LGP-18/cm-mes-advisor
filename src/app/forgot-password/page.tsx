"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_NOT_CONFIGURED_MESSAGE,
  buildPasswordResetRedirectUrl,
  mapPasswordResetError,
} from "@/lib/supabase/auth-messages";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import AuthShell from "@/components/auth/auth-shell";
import MesLogo from "@/components/brand/mes-logo";

export default function ForgotPasswordPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabaseConfigured) {
      setError(AUTH_NOT_CONFIGURED_MESSAGE);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: buildPasswordResetRedirectUrl({
          currentOrigin: window.location.origin,
        }),
      },
    );

    if (authError) {
      setError(mapPasswordResetError(authError.message));
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <AuthShell>
        <div className="fv-auth-card fv-auth-card-compact fv-auth-stack">
          <div className="fv-auth-logo-wrap">
            <MesLogo className="fv-auth-logo-full" tone="color" />
          </div>
          <div>
            <h1 className="fv-auth-heading">Reset link sent</h1>
            <p className="fv-auth-sub" style={{ marginBottom: 0 }}>
              If <strong>{email}</strong> has an account, a reset link is on its
              way. Check your inbox and follow the link to set a new password.
            </p>
          </div>
          <Link
            href="/login"
            className="fv-btn-secondary"
            style={{ justifyContent: "center" }}
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="fv-auth-card fv-auth-card-compact">
        <div className="fv-auth-logo-wrap">
          <MesLogo className="fv-auth-logo-full" tone="color" />
        </div>
        <h1 className="fv-auth-heading">Reset your password</h1>
        <p className="fv-auth-sub">
          Enter your email and we&apos;ll send a reset link.
        </p>

        <form onSubmit={handleSubmit} className="fv-auth-form" noValidate>
          <div className="fv-auth-field">
            <label htmlFor="email" className="fv-auth-field-label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="consultant@criticalmanufacturing.com"
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
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        {!supabaseConfigured ? (
          <Link
            href="/"
            className="fv-auth-submit"
            style={{
              display: "flex",
              marginTop: "1rem",
              textDecoration: "none",
            }}
          >
            Continue in mock mode
          </Link>
        ) : null}

        <p className="fv-auth-footer" style={{ marginTop: "1rem" }}>
          <Link href="/login" className="fv-auth-link">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
