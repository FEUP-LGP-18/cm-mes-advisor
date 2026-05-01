"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_NOT_CONFIGURED_MESSAGE,
  mapSignUpError,
  sanitizeAuthNextPath,
} from "@/lib/supabase/auth-messages";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import AuthShell from "@/components/auth/auth-shell";

function SignUpForm() {
  const searchParams = useSearchParams();
  const next = sanitizeAuthNextPath(searchParams.get("next"));
  const supabaseConfigured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabaseConfigured) {
      setError(AUTH_NOT_CONFIGURED_MESSAGE);
      return;
    }

    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
    if (next) {
      callbackUrl.searchParams.set("next", next);
    }

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (authError) {
      setError(mapSignUpError(authError.message));
      setLoading(false);
      return;
    }

    // Supabase sends a confirmation email. Show a success message.
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    const loginLink = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
    return (
      <AuthShell>
        <div className="w-full max-w-sm animate-enter">
          <div className="premium-panel rounded-3xl p-8 grid gap-6">
            <div className="grid gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--shell-ink)]">
                Check your email
              </h1>
              <p className="text-sm text-[color:var(--shell-muted)] leading-relaxed">
                We sent a confirmation link to{" "}
                <strong className="text-[color:var(--shell-ink)]">{email}</strong>.
                Click the link to activate your account and return to the
                advisor.
              </p>
            </div>
            <Link
              href={loginLink}
              className="focus-premium theme-button-primary w-full rounded-2xl px-5 py-3 text-sm font-semibold text-center transition"
            >
              Go to sign in
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
              Create account
            </h1>
            <p className="text-sm text-[color:var(--shell-muted)]">
              Consultant access to the MES Demo Advisor.
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

            <div className="grid gap-1.5">
              <label
                htmlFor="password"
                className="mono-label text-[0.68rem] text-[color:var(--shell-subtle)]"
              >
                Password
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
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          {!supabaseConfigured ? (
            <Link
              href="/"
              className="focus-premium theme-shell-button-secondary w-full rounded-2xl px-5 py-3 text-sm font-semibold text-center transition"
            >
              Continue in mock mode
            </Link>
          ) : (
            <p className="text-center text-sm text-[color:var(--shell-muted)]">
              Already have an account?{" "}
              <Link
                href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
                className="font-semibold text-[color:var(--shell-ink)] hover:text-[color:var(--brand-accent-soft)] transition-colors"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </AuthShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
