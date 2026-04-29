"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AUTH_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/auth-messages";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import AuthShell from "@/components/auth/auth-shell";

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
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      },
    );

    if (authError) {
      setError("Could not send a reset link. Check the email address and try again.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <AuthShell>
        <div className="w-full max-w-sm animate-enter">
          <div className="premium-panel rounded-3xl p-8 grid gap-6">
            <div className="grid gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--shell-ink)]">
                Reset link sent
              </h1>
              <p className="text-sm text-[color:var(--shell-muted)] leading-relaxed">
                If{" "}
                <strong className="text-[color:var(--shell-ink)]">{email}</strong>{" "}
                has an account, a reset link is on its way. Check your inbox and
                follow the link to set a new password.
              </p>
            </div>
            <Link
              href="/login"
              className="focus-premium theme-shell-button-secondary w-full rounded-2xl px-5 py-3 text-sm font-semibold text-center transition"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="w-full max-w-sm animate-enter">
        <div className="premium-panel rounded-3xl p-8 grid gap-6">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--shell-ink)]">
              Reset your password
            </h1>
            <p className="text-sm text-[color:var(--shell-muted)]">
              Enter your email and we&apos;ll send a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-1.5">
              <label
                htmlFor="email"
                className="mono-label text-[0.68rem] text-[color:var(--shell-subtle)]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                placeholder="you@example.com"
                className="focus-premium theme-shell-input w-full rounded-2xl px-4 py-3 text-sm"
              />
            </div>

            {!supabaseConfigured ? (
              <div
                role="alert"
                className="phase-feedback phase-feedback-error rounded-2xl text-sm"
              >
                {AUTH_NOT_CONFIGURED_MESSAGE}
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="phase-feedback phase-feedback-error rounded-2xl text-sm"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !supabaseConfigured}
              className="focus-premium theme-button-primary w-full rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>

          {!supabaseConfigured ? (
            <Link
              href="/"
              className="focus-premium theme-shell-button-secondary w-full rounded-2xl px-5 py-3 text-sm font-semibold text-center transition"
            >
              Continue in mock mode
            </Link>
          ) : null}

          <p className="text-center text-sm text-[color:var(--shell-muted)]">
            <Link
              href="/login"
              className="font-semibold text-[color:var(--shell-ink)] hover:text-[color:var(--brand-accent-soft)] transition-colors"
            >
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
