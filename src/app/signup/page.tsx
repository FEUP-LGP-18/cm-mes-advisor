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
import MesLogo from "@/components/brand/mes-logo";

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
        <div className="fv-auth-card fv-auth-card-compact fv-auth-stack">
          <div className="fv-auth-logo-wrap">
            <MesLogo className="fv-auth-logo-full" tone="color" />
          </div>
          <div>
            <h1 className="fv-auth-heading">Check your email</h1>
            <p className="fv-auth-sub" style={{ marginBottom: 0 }}>
              We sent a confirmation link to <strong>{email}</strong>. Click the
              link to activate your account and return to the advisor.
            </p>
          </div>
          <Link href={loginLink} className="fv-auth-submit" style={{ textDecoration: "none" }}>
            Go to sign in
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
        <h1 className="fv-auth-heading">Create account</h1>
        <p className="fv-auth-sub">Consultant access to the MES Advisor workspace.</p>

          <form onSubmit={handleSubmit} className="fv-auth-form" noValidate>
            <div className="fv-auth-field">
              <label
                htmlFor="email"
                className="fv-auth-field-label"
              >
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

            <div className="fv-auth-field">
              <label
                htmlFor="password"
                className="fv-auth-field-label"
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
              {loading ? "Creating account…" : "Create account"}
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
          ) : (
            <p className="fv-auth-footer" style={{ marginTop: "1rem" }}>
              Already have an account?{" "}
              <Link
                href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
                className="fv-auth-link"
              >
                Sign in
              </Link>
            </p>
          )}
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
