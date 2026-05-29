"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_NOT_CONFIGURED_MESSAGE,
  getAuthRedirectErrorMessage,
  mapSignInError,
  sanitizeAuthNextPath,
} from "@/lib/supabase/auth-messages";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import AuthShell from "@/components/auth/auth-shell";
import MesLogo from "@/components/brand/mes-logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeAuthNextPath(searchParams.get("next"));
  const supabaseConfigured = isSupabaseConfigured();
  const setupMessage = supabaseConfigured
    ? getAuthRedirectErrorMessage(searchParams.get("error"))
    : AUTH_NOT_CONFIGURED_MESSAGE;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabaseConfigured) {
      setError(AUTH_NOT_CONFIGURED_MESSAGE);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(mapSignInError(authError.message));
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <AuthShell>
      <div className="fv-auth-card fv-auth-card-compact">
        <div className="fv-auth-logo-wrap">
          <MesLogo className="fv-auth-logo-full" tone="color" />
        </div>

        <h1 className="fv-auth-heading">Sign in to continue</h1>
        <p className="fv-auth-sub">Access your MES configuration workspace</p>

        <form onSubmit={handleSubmit} className="fv-auth-form" noValidate>
          <div className="fv-auth-field">
            <label htmlFor="email" className="fv-auth-field-label">Email address</label>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.375rem" }}>
              <label htmlFor="password" className="fv-auth-field-label" style={{ marginBottom: 0 }}>Password</label>
              <Link href="/forgot-password" className="fv-auth-forgot">Forgot password?</Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              placeholder="Enter your password"
              className="fv-auth-input"
            />
          </div>

          {setupMessage ? (
            <div role="alert" className="fv-auth-alert">
              {setupMessage}
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
            style={{ marginTop: "0.25rem" }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        {!supabaseConfigured ? (
          <div style={{ marginTop: "1rem" }}>
            <Link
              href="/"
              className="fv-auth-submit"
              style={{ display: "flex", textDecoration: "none" }}
            >
              Continue in mock mode
            </Link>
          </div>
        ) : (
          <p className="fv-auth-footer" style={{ marginTop: "1rem" }}>
            No account?{" "}
            <Link
              href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
              style={{ color: "var(--brand-primary)", fontWeight: 600 }}
            >
              Sign up
            </Link>
          </p>
        )}

        <p className="fv-auth-footer" style={{ marginTop: "1rem" }}>Protected by Critical Manufacturing</p>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
